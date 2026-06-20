import { Injectable, Logger } from '@nestjs/common'

/**
 * 统一 AI API 调用服务
 *
 * 支持 OpenRouter / OpenAI / DeepSeek / Qwen 等兼容 OpenAI 协议的厂商。
 * 配置从环境变量读取：
 * - AI_API_KEY      (必填) API Key
 * - AI_MODEL        模型名，默认 openai/gpt-4o-mini
 * - AI_API_BASE     API 基础 URL，默认 https://openrouter.ai/api/v1
 * - AI_REQUEST_TIMEOUT 超时毫秒，默认 30000
 *
 * 用法：
 *   const result = await aiApi.call({ prompt: '...' })
 *   const result = await aiApi.call({ messages: [{ role: 'user', content: '...' }] })
 */

interface AiCallOptions {
  /** 文本 prompt（将自动包装为单条 user message） */
  prompt?: string
  /** 消息数组（支持 system/user/assistant 多轮对话） */
  messages?: { role: 'system' | 'user' | 'assistant'; content: string }[]
  /** 期望 JSON 响应（会自动加上"请只返回 JSON"指令） */
  responseJson?: boolean
  /** 最大输出 token 数 */
  maxTokens?: number
  /** 温度 */
  temperature?: number
}

@Injectable()
export class AiApiService {
  private readonly logger = new Logger(AiApiService.name)
  private readonly apiKey: string
  private readonly model: string
  private readonly apiBase: string
  private readonly timeout: number

  constructor() {
    this.apiKey = process.env.AI_API_KEY || ''
    this.model = process.env.AI_MODEL || 'openai/gpt-4o-mini'
    this.apiBase = process.env.AI_API_BASE || 'https://openrouter.ai/api/v1'
    this.timeout = parseInt(process.env.AI_REQUEST_TIMEOUT || '30000', 10)

    if (!this.apiKey) {
      this.logger.warn(
        '⚠️  AI_API_KEY 未配置！所有 AI 调用将返回 fallback 结果。请在 .env 中设置 AI_API_KEY。',
      )
    } else {
      this.logger.log(`AI API 已配置: model=${this.model}, base=${this.apiBase}`)
    }
  }

  /**
   * 调用 AI 大模型
   */
  async call(options: AiCallOptions): Promise<string> {
    const hasKey = !!this.apiKey

    if (!hasKey) {
      this.logger.warn('AI_API_KEY 未配置，跳过真实调用')
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

    // JSON 模式：追加指令
    if (options.responseJson) {
      const lastMsg = messages[messages.length - 1]
      messages[messages.length - 1] = {
        ...lastMsg,
        content: lastMsg.content + '\n\n请只返回合法的 JSON，不要包含其他文字。',
      }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      const url = `${this.apiBase}/chat/completions`
      this.logger.log(`AI 调用: model=${this.model}, messages=${messages.length}条`)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: options.maxTokens ?? 800,
          temperature: options.temperature ?? 0.7,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        this.logger.error(`AI API 返回错误 ${response.status}: ${errText.slice(0, 200)}`)
        throw new Error(`AI_API_ERROR:${response.status}`)
      }

      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content as string

      if (!content) {
        this.logger.error('AI API 返回空内容')
        throw new Error('AI_API_EMPTY_RESPONSE')
      }

      this.logger.log(`AI 调用成功: ${content.length} 字符`)
      return content
    } catch (e: any) {
      if (e.name === 'AbortError') {
        this.logger.error(`AI API 超时 (${this.timeout}ms)`)
        throw new Error('AI_API_TIMEOUT')
      }
      if (e.message?.startsWith('AI_API_')) throw e
      if (e.message === 'AI_API_KEY_NOT_CONFIGURED') throw e
      this.logger.error(`AI API 网络异常: ${e?.message}`)
      throw new Error('AI_API_NETWORK_ERROR')
    } finally {
      clearTimeout(timer)
    }
  }

  /** 检查是否已配置 API Key */
  isConfigured(): boolean {
    return !!this.apiKey
  }
}
