import { Injectable, Logger } from '@nestjs/common'
import { AiProviderConfigService } from './ai-provider-config.service'
import { AiProviderSnapshot } from './ai-provider.types'
import { join } from 'path'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

/**
 * 转录结果
 */
export interface TranscribeResult {
  text: string | null
  /** 当 text 为 null 时，描述失败原因，方便前端展示 */
  error?: string
}

/**
 * AI 语音转文字服务
 *
 * 使用已配置的 AI Provider（OpenAI-compatible 音频转录接口）将语音文件转为文字。
 * - 遍历所有启用的 Provider，逐个尝试，跳过不支持语音转录的 Provider
 * - 未配置 AI 时返回 { text: null, error: '...' }
 * - 调用失败（超时、网络错误等）时返回 { text: null, error: '...' }
 */
@Injectable()
export class AiVoiceService {
  private readonly logger = new Logger(AiVoiceService.name)

  constructor(
    private readonly configService: AiProviderConfigService,
  ) {}

  /**
   * 将语音文件转录为文字
   * @param voiceUrl 语音文件 URL（绝对路径或相对路径）
   * @returns 转录结果，包含 text 和可选的 error 描述
   */
  async transcribeVoice(voiceUrl: string): Promise<TranscribeResult> {
    if (!voiceUrl) {
      return { text: null, error: '语音 URL 为空' }
    }

    // 微信临时文件路径不可通过 HTTP 下载，直接跳过
    if (voiceUrl.includes('/tmp/')) {
      this.logger.debug('voiceUrl 为微信临时路径，无法下载音频文件，跳过转文字')
      return { text: null, error: '微信临时文件无法转录' }
    }

    // 获取所有启用的 Provider
    const providers = await this.configService.getEnabledSnapshots()
    if (providers.length === 0) {
      this.logger.debug('没有可用的 AI Provider，跳过语音转文字')
      return { text: null, error: '未配置 AI Provider' }
    }

    // 解析完整的音频文件 URL
    const audioUrl = this.resolveFullUrl(voiceUrl)

    // 获取音频文件数据：优先从本地文件系统读取，避免 SSRF 白名单限制
    const audioResult = await this.loadAudioBlob(audioUrl)
    if (!audioResult.blob) {
      return { text: null, error: audioResult.error || '无法读取音频文件' }
    }

    const audioBlob = audioResult.blob

    // 遍历所有 Provider，逐个尝试转录
    const errors: string[] = []
    for (const provider of providers) {
      const result = await this.tryTranscribe(provider, audioBlob)
      if (result.text !== null) return result
      if (result.error) {
        errors.push(`[${provider.displayName}] ${result.error}`)
      }
    }

    const errorMsg = errors.length > 0
      ? `所有 Provider 转录失败: ${errors.join('; ')}`
      : '所有 Provider 转录失败'
    this.logger.warn(errorMsg)
    return { text: null, error: errorMsg }
  }

  /**
   * 尝试用单个 Provider 进行语音转录
   */
  private async tryTranscribe(
    provider: AiProviderSnapshot,
    audioBlob: Blob,
  ): Promise<TranscribeResult> {
    const TIMEOUT_MS = 30000
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      // 标准化 API Base URL
      let baseUrl = (provider.apiBase || '').replace(/\/+$/, '')
      if (!baseUrl.endsWith('/v1') && !baseUrl.includes('/v1/')) {
        baseUrl += '/v1'
      }
      const url = `${baseUrl}/audio/transcriptions`

      const formData = new FormData()
      formData.append('file', audioBlob, 'voice.mp3')
      formData.append('model', 'whisper-1')
      formData.append('response_format', 'text')

      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${provider.apiKeyPlain}` },
        body: formData,
        signal: controller.signal,
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        const shortErr = errText.slice(0, 200)
        this.logger.warn(
          `[${provider.displayName}] 语音转文字失败 ${response.status}: ${shortErr}`,
        )
        // 404/405 表示该 Provider 不支持此接口，跳过尝试下一个
        if (response.status === 404 || response.status === 405) {
          return { text: null, error: `不支持语音转录接口 (${response.status})` }
        }
        return { text: null, error: `API错误 ${response.status}: ${shortErr}` }
      }

      const text = (await response.text()).trim()
      if (!text) {
        this.logger.debug(`[${provider.displayName}] 语音转文字返回空内容`)
        return { text: null, error: '返回空内容' }
      }

      this.logger.log(
        `[${provider.displayName}] 语音转文字成功: ${text.length} 字符`,
      )
      return { text, error: undefined }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        this.logger.warn(`[${provider.displayName}] 语音转文字请求超时`)
        return { text: null, error: '请求超时' }
      }
      this.logger.warn(`[${provider.displayName}] 语音转文字异常: ${err?.message || err}`)
      return { text: null, error: `网络异常: ${err?.message || err}` }
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * 加载音频文件为 Blob，优先从本地文件系统读取
   */
  private async loadAudioBlob(audioUrl: string): Promise<{ blob: Blob | null; error?: string }> {
    try {
      const localPath = this.resolveLocalAudioPath(audioUrl)
      if (localPath) {
        const buffer = await readFile(localPath)
        this.logger.debug(`从本地文件系统读取音频: ${localPath}`)
        return { blob: new Blob([buffer], { type: 'audio/mpeg' }) }
      }

      // 非本地文件：SSRF 防御 + HTTP 下载
      if (!this.isAllowedAudioHost(audioUrl)) {
        this.logger.warn(`音频文件域名不在白名单中: ${audioUrl}`)
        return { blob: null, error: '音频文件域名不在白名单中' }
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 10000)

      try {
        const audioRes = await fetch(audioUrl, { signal: controller.signal })
        if (!audioRes.ok) {
          this.logger.warn(`下载音频文件失败: ${audioRes.status}`)
          return { blob: null, error: `下载音频文件失败 (${audioRes.status})` }
        }
        const blob = await audioRes.blob()
        return { blob }
      } finally {
        clearTimeout(timer)
      }
    } catch (err: any) {
      this.logger.warn(`获取音频文件失败: ${err?.message || err}`)
      return { blob: null, error: `获取音频文件失败: ${err?.message || err}` }
    }
  }

  /**
   * 将相对路径或文件名解析为完整的 HTTP URL
   */
  private resolveFullUrl(voiceUrl: string): string {
    if (voiceUrl.startsWith('http://') || voiceUrl.startsWith('https://')) {
      return voiceUrl
    }
    const baseUrl = (process.env.STATIC_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '')
    if (voiceUrl.startsWith('/')) {
      return baseUrl ? `${baseUrl}${voiceUrl}` : `http://localhost:3000${voiceUrl}`
    }
    return voiceUrl
  }

  /**
   * 尝试将音频 URL 解析为本地文件路径。
   * 仅当 URL 的 pathname 以 /uploads/ 开头且文件存在时返回路径，否则返回 null。
   * 包含路径穿越防御。
   */
  private resolveLocalAudioPath(audioUrl: string): string | null {
    try {
      const url = new URL(audioUrl)
      if (!url.pathname.startsWith('/uploads/')) return null
      const filename = url.pathname.replace('/uploads/', '')
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return null
      const localPath = join(process.cwd(), 'uploads', filename)
      if (!existsSync(localPath)) return null
      return localPath
    } catch {
      return null
    }
  }

  /**
   * SSRF 防御：校验音频文件 URL 的域名是否在白名单中
   */
  private isAllowedAudioHost(urlStr: string): boolean {
    try {
      const hostname = new URL(urlStr).hostname
      const allowed = this.getAllowedHostnames()
      return allowed.includes(hostname)
    } catch {
      return false
    }
  }

  /**
   * 获取允许下载音频文件的域名白名单
   */
  private getAllowedHostnames(): string[] {
    const hosts = new Set<string>(['localhost', '127.0.0.1'])
    for (const key of ['API_BASE_URL', 'STATIC_BASE_URL']) {
      try {
        const u = new URL(process.env[key] || '')
        if (u.hostname) hosts.add(u.hostname)
      } catch { /* ignore */ }
    }
    return [...hosts]
  }
}