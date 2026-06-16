import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from '../entities/SystemConfig'
import { NotifyLog } from '../entities/NotifyLog'

interface NotifyConfig {
  enabled?: boolean
  webhookUrls?: Record<string, string>
  // 兼容旧格式
  webhookUrl?: string
  channel?: string
  notifyTypes?: string[]
}

export interface NotifyOptions {
  type: string
  content: string
  userId?: number
  userNickname?: string
  source?: string
}

@Injectable()
export class NotifyChannelService {
  private readonly logger = new Logger(NotifyChannelService.name)

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
    @InjectRepository(NotifyLog)
    private readonly notifyLogRepository: Repository<NotifyLog>,
  ) {}

  /** 发送审核通知 - 向所有已配置 webhook 的通道发送，并记录日志 */
  async sendAuditNotify(opts: NotifyOptions) {
    const { type, content, userId, userNickname, source } = opts
    const config = await this.getNotifyConfig()

    if (!config || !config.enabled) {
      this.logger.log('通知通道未启用，跳过发送')
      await this.writeLog(type, '', false, '通知通道未启用', userId, userNickname, source || type, content)
      return
    }

    // 检查是否需要通知此类型
    const types = config.notifyTypes || []
    if (!types.includes(type)) {
      this.logger.log(`通知类型 ${type} 未在配置中勾选，跳过发送`)
      await this.writeLog(type, '', false, `通知类型 ${type} 未勾选`, userId, userNickname, source || type, content)
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
      await this.writeLog(type, '', false, '未配置任何 Webhook 地址', userId, userNickname, source || type, content)
      return
    }

    // 向每个通道发送通知
    for (const ch of channels) {
      const message = this.buildMessage(ch.name, type, content)
      try {
        await this.sendWebhook(ch.url, message)
        this.logger.log(`通知已发送: type=${type}, channel=${ch.name}`)
        await this.writeLog(type, ch.name, true, '', userId, userNickname, source || type, content)
      } catch (e: any) {
        this.logger.error(`通知发送失败[${ch.name}]: ${e.message}`)
        await this.writeLog(type, ch.name, false, e.message, userId, userNickname, source || type, content)
      }
    }
  }

  /** 查询最近的通知日志 */
  async getRecentLogs(limit: number = 20) {
    return this.notifyLogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    })
  }

  private async writeLog(
    notifyType: string,
    channel: string,
    success: boolean,
    errorMessage: string,
    userId?: number,
    userNickname?: string,
    source?: string,
    content?: string,
  ) {
    try {
      const log = this.notifyLogRepository.create({
        notifyType,
        channel,
        success: success ? 1 : 0,
        errorMessage: errorMessage || null,
        userId: userId || null,
        userNickname: userNickname || null,
        source: source || notifyType,
        content: content || null,
      })
      await this.notifyLogRepository.save(log)
    } catch (e: any) {
      this.logger.error(`写入通知日志失败: ${e.message}`)
    }
  }

  private async getNotifyConfig(): Promise<NotifyConfig | null> {
    try {
      const rows = await this.configRepository.find({
        where: [
          { configKey: 'notify.enabled' },
          { configKey: 'notify.channel' },
          { configKey: 'notify.webhookUrl' },
          { configKey: 'notify.webhookUrls' },
          { configKey: 'notify.notifyTypes' },
        ],
      })

      const config: NotifyConfig = { enabled: false }
      for (const row of rows) {
        const key = row.configKey.split('.').pop()!
        try {
          (config as any)[key] = row.configValue ? JSON.parse(row.configValue) : row.configValue
        } catch {
          (config as any)[key] = row.configValue
        }
      }
      // enabled 是字符串 "true"/"false"
      config.enabled = config.enabled === true || (config.enabled as any) === 'true'

      return config
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
