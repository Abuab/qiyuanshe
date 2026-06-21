import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiProviderSelector } from './ai-provider-selector.service'
import { AiProviderConfigService } from './ai-provider-config.service'
import { AiProviderCallLog } from '../entities/AiProviderCallLog'

/**
 * 统一 AI API 调用服务（多 Provider 版）
 *
 * 从 AiProviderSelector 获取可用的 Provider，动态调用不同厂商的 API。
 * 所有厂商需兼容 OpenAI Chat Completions 协议。
 *
 * 用法：
 *   const result = await aiApi.call({ prompt: '...' })
 *   const result = await aiApi.call({ messages: [{ role: 'user', content: '...' }] })
 */

interface AiCallOptions {
  prompt?: string
  messages?: { role: 'system' | 'user' | 'assistant'; content: string }[]
  responseJson?: boolean
  maxTokens?: number
  temperature?: number
}

/** 调用结果 */
export interface AiCallResult {
  content: string
  providerId: number
  providerName: string
  model: string
  inputTokens: number
  outputTokens: number
  durationMs: number
}

@Injectable()
export class AiApiService {
  private readonly logger = new Logger(AiApiService.name)
  private readonly timeout: number

  constructor(
    private readonly selector: AiProviderSelector,
    private readonly configService: AiProviderConfigService,
    @InjectRepository(AiProviderCallLog)
    private readonly providerLogRepo: Repository<AiProviderCallLog>,
  ) {
    this.timeout = parseInt(process.env.AI_REQUEST_TIMEOUT || '30000', 10)
  }

  /**
   * 调用 AI 大模型（多 Provider 自动选择）
   */
  async call(options: AiCallOptions): Promise<string> {
    const result = await this.callWithMeta(options)
    return result.content
  }

  /**
   * 调用 AI 并返回元数据（Provider/Token/耗时等）
   */
  async callWithMeta(options: AiCallOptions): Promise<AiCallResult> {
    const provider = await this.selector.select()
    if (!provider) {
      this.logger.warn('没有可用的 AI Provider，使用降级模式')
      throw new Error('AI_API_KEY_NOT_CONFIGURED')
    }

    let messages: { role: string; content: string }[]

    if (options.messages) {
      messages = [...options.messages]
    } else if (options.prompt) {
      messages = [{ role: 'user', content: options.prompt }]
    } else {
      throw new Error('必须提供 prompt 或 messages')
    }

    if (options.responseJson) {
      const lastMsg = messages[messages.length - 1]
      messages[messages.length - 1] = {
        ...lastMsg,
        content: lastMsg.content + '\n\n请只返回合法的 JSON，不要包含其他文字。',
      }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    const startMs = Date.now()

    try {
      // 标准化 API Base URL：确保以 /v1 结尾（兼容用户配置时未带 /v1 的情况）
      let baseUrl = (provider.apiBase || '').replace(/\/+$/, '')
      if (!baseUrl.endsWith('/v1') && !baseUrl.includes('/v1/')) {
        baseUrl += '/v1'
      }
      const url = `${baseUrl}/chat/completions`
      this.logger.log(
        `AI 调用: [${provider.displayName}] model=${provider.modelName}, messages=${messages.length}条`,
      )

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKeyPlain}`,
        },
        body: JSON.stringify({
          model: provider.modelName,
          messages,
          max_tokens: options.maxTokens ?? 800,
          temperature: options.temperature ?? 0.7,
        }),
        signal: controller.signal,
      })

      const durationMs = Date.now() - startMs

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        this.logger.error(
          `[${provider.displayName}] API 返回错误 ${response.status}: ${errText.slice(0, 200)}`,
        )
        await this.selector.recordFailure(provider.id)
        throw new Error(`AI_API_ERROR:${response.status}`)
      }

      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content as string
      const inputTokens = data?.usage?.prompt_tokens || 0
      const outputTokens = data?.usage?.completion_tokens || 0

      if (!content) {
        this.logger.error(`[${provider.displayName}] API 返回空内容`)
        await this.selector.recordFailure(provider.id)
        throw new Error('AI_API_EMPTY_RESPONSE')
      }

      await this.selector.recordSuccess(provider.id)
      this.logger.log(
        `[${provider.displayName}] 调用成功: ${content.length}字符, ${inputTokens}+${outputTokens} tokens, ${durationMs}ms`,
      )

      return {
        content,
        providerId: provider.id,
        providerName: provider.displayName,
        model: provider.modelName,
        inputTokens,
        outputTokens,
        durationMs,
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        this.logger.error(`[${provider.displayName}] API 超时 (${this.timeout}ms)`)
        await this.selector.recordFailure(provider.id)
        throw new Error('AI_API_TIMEOUT')
      }
      if (e.message?.startsWith('AI_API_')) throw e
      if (e.message === 'AI_API_KEY_NOT_CONFIGURED') throw e
      this.logger.error(`[${provider.displayName}] API 网络异常: ${e?.message}`)
      await this.selector.recordFailure(provider.id)
      throw new Error('AI_API_NETWORK_ERROR')
    } finally {
      clearTimeout(timer)
    }
  }

  /** 检查是否有可用 Provider */
  async isConfigured(): Promise<boolean> {
    const provider = await this.selector.select()
    return !!provider
  }

  /**
   * 调用 AI 并自动写入 Provider 调用日志（含 Token 用量、Provider/模型信息）
   *
   * @param options    调用参数（prompt 或 messages）
   * @param userId     发起调用的用户 ID
   * @param callType   功能类型：match / chat_skill / matchmaker / fun_quiz / profile_gen
   * @returns AI 返回的文本内容
   */
  async callAndLog(
    options: AiCallOptions,
    userId: number,
    callType: string,
  ): Promise<string> {
    const startMs = Date.now()
    let status: 'success' | 'error' | 'timeout' = 'success'
    let errorMessage = ''
    let result: AiCallResult | null = null

    try {
      result = await this.callWithMeta(options)
      return result.content
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('TIMEOUT')) status = 'timeout'
      else status = 'error'
      errorMessage = msg.slice(0, 1000)
      throw e
    } finally {
      // 异步写入 Provider 调用日志（不阻塞主流程）
      this.saveProviderLog({
        providerId: result?.providerId || 0,
        callType,
        userId,
        requestSummary: JSON.stringify({
          promptLength: options.prompt?.length || 0,
          messageCount: options.messages?.length || 0,
          responseJson: !!options.responseJson,
        }).slice(0, 500),
        responseSummary: result?.content?.slice(0, 500) || '',
        inputTokens: result?.inputTokens || 0,
        outputTokens: result?.outputTokens || 0,
        durationMs: Date.now() - startMs,
        status,
        errorMessage,
      }).catch((e) => this.logger.warn(`写入 Provider 调用日志失败: ${e?.message}`))
    }
  }

  /**
   * 异步写入 ai_provider_call_logs
   */
  private async saveProviderLog(data: {
    providerId: number
    callType: string
    userId: number
    requestSummary: string
    responseSummary: string
    inputTokens: number
    outputTokens: number
    durationMs: number
    status: string
    errorMessage: string
  }) {
    const log = this.providerLogRepo.create({
      ...data,
      userId: data.userId && data.userId > 0 ? data.userId : null,
    })
    await this.providerLogRepo.save(log)
  }
}
