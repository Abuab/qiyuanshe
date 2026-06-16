import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from '../entities/SystemConfig'

interface NotifyConfig {
  enabled?: boolean
  webhookUrls?: Record<string, string>
  // 兼容旧格式
  webhookUrl?: string
  channel?: string
  notifyTypes?: string[]
}

@Injectable()
export class NotifyChannelService {
  private readonly logger = new Logger(NotifyChannelService.name)

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
  ) {}

  /** 发送审核通知 - 向所有已配置 webhook 的通道发送 */
  async sendAuditNotify(type: string, content: string) {
    const config = await this.getNotifyConfig()
    if (!config || !config.enabled) {
      this.logger.log('通知通道未启用，跳过发送')
      return
    }

    // 检查是否需要通知此类型
    const types = config.notifyTypes || []
    if (!types.includes(type)) {
      this.logger.log(`通知类型 ${type} 未在配置中勾选，跳过发送`)
      return
    }

    // 收集所有已配置 webhook 的通道
    const channels: { name: string; url: string }[] = []

    if (config.webhookUrls) {
      for (const [ch, url] of Object.entries(config.webhookUrls)) {
        if (url) channels.push({ name: ch, url })
      }
    } else if (config.webhookUrl) {
      // 兼容旧格式
      channels.push({ name: config.channel || 'wecom', url: config.webhookUrl })
    }

    if (channels.length === 0) {
      this.logger.warn('通知通道已启用但所有通道均未配置Webhook地址')
      return
    }

    // 向每个通道发送通知
    for (const ch of channels) {
      const message = this.buildMessage(ch.name, type, content)
      try {
        await this.sendWebhook(ch.url, message)
        this.logger.log(`通知已发送: type=${type}, channel=${ch.name}`)
      } catch (e: any) {
        this.logger.error(`通知发送失败[${ch.name}]: ${e.message}`)
      }
    }
  }

  private async getNotifyConfig(): Promise<NotifyConfig | null> {
    try {
      const config = await this.configRepository.findOne({ where: { configKey: 'notify' } })
      if (!config || !config.configValue) return null
      const parsed = typeof config.configValue === 'string' ? JSON.parse(config.configValue) : config.configValue
      return parsed as NotifyConfig
    } catch {
      return null
    }
  }

  private buildMessage(channel: string, type: string, content: string): any {
    const typeLabel: Record<string, string> = {
      photo: '图片审核',
      user: '用户资料审核',
      report: '举报通知',
    }
    const title = `【审核通知】${typeLabel[type] || type}`

    switch (channel) {
      case 'feishu':
        return {
          msg_type: 'interactive',
          card: {
            header: { title: { tag: 'plain_text', content: title } },
            elements: [{ tag: 'div', text: { tag: 'plain_text', content } }],
          },
        }
      case 'dingtalk':
        return {
          msgtype: 'text',
          text: { content: `${title}\n${content}` },
        }
      case 'wecom':
      default:
        return {
          msgtype: 'text',
          text: { content: `${title}\n${content}` },
        }
    }
  }

  private async sendWebhook(url: string, body: any) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }
  }
}
