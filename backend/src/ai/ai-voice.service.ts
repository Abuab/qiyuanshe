import { Injectable, Logger } from '@nestjs/common'
import { AiProviderSelector } from './ai-provider-selector.service'

/**
 * AI 语音转文字服务
 *
 * 使用已配置的 AI Provider（OpenAI-compatible 音频转录接口）将语音文件转为文字。
 * - 未配置 AI 时直接返回 null，不抛出异常
 * - 调用失败（超时、网络错误等）时返回 null，不抛出异常
 */
@Injectable()
export class AiVoiceService {
  private readonly logger = new Logger(AiVoiceService.name)

  constructor(
    private readonly selector: AiProviderSelector,
  ) {}

  /**
   * 将语音文件转录为文字
   * @param voiceUrl 语音文件 URL（绝对路径或相对路径）
   * @returns 转录文字，若 AI 未配置或调用失败则返回 null
   */
  async transcribeVoice(voiceUrl: string): Promise<string | null> {
    if (!voiceUrl) return null

    // 选择可用的 Provider
    const provider = await this.selector.select()
    if (!provider) {
      this.logger.debug('没有可用的 AI Provider，跳过语音转文字')
      return null
    }

    // 解析完整的音频文件 URL
    const audioUrl = this.resolveFullUrl(voiceUrl)

    // 尝试调用 Provider 的 OpenAI-compatible 音频转录接口
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

      // 尝试通过直接下载音频文件的方式构建请求
      let audioBlob: Blob
      try {
        const audioRes = await fetch(audioUrl, { signal: controller.signal })
        if (!audioRes.ok) {
          this.logger.warn(`下载音频文件失败: ${audioRes.status}`)
          return null
        }
        audioBlob = await audioRes.blob()
      } catch (err: any) {
        this.logger.warn(`获取音频文件失败: ${err?.message || err}`)
        return null
      }

      // 构建 FormData
      const formData = new FormData()
      formData.append('file', audioBlob, 'voice.mp3')
      formData.append('model', 'whisper-1')
      formData.append('response_format', 'text')

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${provider.apiKeyPlain}`,
        },
        body: formData,
        signal: controller.signal,
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        this.logger.warn(
          `[${provider.displayName}] 语音转文字失败 ${response.status}: ${errText.slice(0, 200)}`,
        )
        return null
      }

      const text = (await response.text()).trim()
      if (!text) {
        this.logger.debug(`[${provider.displayName}] 语音转文字返回空内容`)
        return null
      }

      this.logger.log(
        `[${provider.displayName}] 语音转文字成功: ${text.length} 字符`,
      )
      return text
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        this.logger.warn('语音转文字请求超时')
      } else {
        this.logger.warn(`语音转文字异常: ${err?.message || err}`)
      }
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * 将相对路径或文件名解析为完整的 HTTP URL
   */
  private resolveFullUrl(voiceUrl: string): string {
    if (voiceUrl.startsWith('http://') || voiceUrl.startsWith('https://')) {
      return voiceUrl
    }
    // 相对路径 → 拼接静态资源基础 URL
    const baseUrl = (process.env.STATIC_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '')
    if (voiceUrl.startsWith('/')) {
      return baseUrl ? `${baseUrl}${voiceUrl}` : `http://localhost:3000${voiceUrl}`
    }
    return voiceUrl
  }
}
