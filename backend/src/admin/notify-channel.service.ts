import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from '../entities/SystemConfig'

interface NotifyConfig {
  enabled?: boolean
  channel?: string
  webhookUrls?: Record<string, string>
  // 兼容旧格式
  webhookUrl?: string
  notifyTypes?: string[]
}

@Injectable()
export class NotifyChannelService {
  private readonly logger = new Logger(NotifyChannelService.name)

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
  ) {}

  /** 发送审核通知 */
  async sendAuditNotify(type: string, content: string) {
    const config = await this.getNotifyConfig()
    if (!config || !config.enabled) return

    // 检查是否需要通知此类型
    const types = config.notifyTypes || []
    if (!types.includes(type)) return

    const channel = config.channel || 'wecom'
    // 优先用新格式 webhookUrls，兼容旧格式 webhookUrl
    let webhookUrl = ''
    if (config.webhookUrls && config.webhookUrls[channel]) {
      webhookUrl = config.webhookUrls[channel]
    } else if (config.webhookUrl) {
      webhookUrl = config.webhookUrl
    }

    if (!webhookUrl) {
      this.logger.warn('通知通道已启用但未配置Webhook地址')
      return
    }

    const message = this.buildMessage(channel, type, content)

    try {
      await this.sendWebhook(webhookUrl, message)
      this.logger.log(`通知已发送: type=${type}, channel=${channel}`)
    } catch (e: any) {
      this.logger.error(`通知发送失败: ${e.message}`)
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
