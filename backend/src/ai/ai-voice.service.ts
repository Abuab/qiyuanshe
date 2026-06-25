import { Injectable, Logger } from '@nestjs/common'
import { AiProviderSelector } from './ai-provider-selector.service'
import { join } from 'path'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

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

    // 微信临时文件路径不可通过 HTTP 下载，直接跳过
    if (voiceUrl.includes('/tmp/')) {
      this.logger.debug('voiceUrl 为微信临时路径，无法下载音频文件，跳过转文字')
      return null
    }

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

      // 获取音频文件数据：优先从本地文件系统读取，避免 SSRF 白名单限制
      let audioBlob: Blob
      try {
        const localPath = this.resolveLocalAudioPath(audioUrl)
        if (localPath) {
          const buffer = await readFile(localPath)
          audioBlob = new Blob([buffer], { type: 'audio/mpeg' })
          this.logger.debug(`从本地文件系统读取音频: ${localPath}`)
        } else {
          // 非本地文件：SSRF 防御 + HTTP 下载
          if (!this.isAllowedAudioHost(audioUrl)) {
            this.logger.warn(`音频文件域名不在白名单中: ${audioUrl}`)
            return null
          }
          const audioRes = await fetch(audioUrl, { signal: controller.signal })
          if (!audioRes.ok) {
            this.logger.warn(`下载音频文件失败: ${audioRes.status}`)
            return null
          }
          audioBlob = await audioRes.blob()
        }
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
      // 防止路径穿越攻击
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
