import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm'
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

    // 检查是否需要通知此类型（未配置类型列表时允许所有类型）
    const types = config.notifyTypes || []
    if (types.length > 0 && !types.includes(type)) {
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
      const message = this.buildMessage(ch.name, type, content, userId, userNickname)
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

  /** 查询最近的通知日志，支持筛选和分页 */
  async getRecentLogs(limit: number = 20, query?: any) {
    const where: any = {}
    if (query) {
      if (query.channel) where.channel = query.channel
      if (query.source) where.source = query.source
      if (query.status !== undefined) where.success = Number(query.status)
      if (query.startDate && query.endDate) {
        where.createdAt = Between(new Date(query.startDate), new Date(query.endDate + ' 23:59:59'))
      } else if (query.startDate) {
        where.createdAt = MoreThanOrEqual(new Date(query.startDate))
      } else if (query.endDate) {
        where.createdAt = LessThanOrEqual(new Date(query.endDate + ' 23:59:59'))
      }
    }
    const page = Number(query?.page) || 1
    const pageLimit = Number(query?.limit) || limit

    const [list, total] = await this.notifyLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageLimit,
      take: pageLimit,
    })
    return { list, total, page, limit: pageLimit }
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

  private buildMessage(channel: string, type: string, content: string, userId?: number, userNickname?: string): any {
    const typeLabel: Record<string, string> = {
      photo: '图片审核',
      avatar: '头像审核',
      user: '用户资料审核',
      report: '举报通知',
      voice: '语音审核',
      user_create: '用户创建',
      answer: '回答审核',
    }
    const title = `【审核通知】${typeLabel[type] || type}`
    const userInfo = userId ? `\n用户ID：${userId}${userNickname ? `（${userNickname}）` : ''}` : ''
    const fullContent = content + userInfo

    switch (channel) {
      case 'feishu':
        return {
          msg_type: 'interactive',
          card: {
            header: { title: { tag: 'plain_text', content: title } },
            elements: [{ tag: 'div', text: { tag: 'plain_text', content: fullContent } }],
          },
        }
      case 'dingtalk':
        return {
          msgtype: 'text',
          text: { content: `${title}\n${fullContent}` },
        }
      case 'wecom':
      default:
        return {
          msgtype: 'text',
          text: { content: `${title}\n${fullContent}` },
        }
    }
  }

  /** 验证并阻止 SSRF 攻击（仅允许 HTTPS 公网地址） */
  private validateWebhookUrl(url: string): URL {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new Error('Webhook 地址格式无效')
    }
    if (parsed.protocol !== 'https:') {
      throw new Error('Webhook 地址仅支持 HTTPS 协议')
    }
    // 阻止访问内网、云元数据等地址
    const blocked = [
      'localhost', '127.0.0.1', '0.0.0.0', '::1',
      'metadata.google.internal', '169.254.169.254',
    ]
    if (blocked.includes(parsed.hostname)) {
      throw new Error('不允许连接到内网地址')
    }
    // 阻止私有 IPv4 网段
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|127\.)/.test(parsed.hostname)) {
      throw new Error('不允许连接到内网地址')
    }
    // 阻止以 .local / .internal 结尾的主机名
    if (/\.(local|internal)$/.test(parsed.hostname)) {
      throw new Error('不允许连接到内网地址')
    }
    return parsed
  }

  private async sendWebhook(url: string, body: any) {
    this.validateWebhookUrl(url)
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }
  }

  /** 测试 Webhook 连通性 - 发送一条测试消息 */
  async testWebhook(channel: string, url: string) {
    const testMsg = this.buildTestMessage(channel)
    await this.sendWebhook(url, testMsg)
  }

  /** 重试 Webhook 发送 - 根据日志 ID 反查配置重新发送 */
  async retryWebhook(logId: number) {
    const log = await this.notifyLogRepository.findOne({ where: { id: logId } })
    if (!log) {
      throw new Error('通知日志不存在')
    }

    // 读取当前通知配置，获取该通道的 webhook 地址
    const config = await this.getNotifyConfig()
    if (!config || !config.enabled) {
      throw new Error('通知通道未启用')
    }

    let url = ''
    if (config.webhookUrls) {
      url = config.webhookUrls[log.channel] || ''
    } else if (config.webhookUrl && config.channel === log.channel) {
      url = config.webhookUrl
    }

    if (!url) {
      throw new Error(`通道 ${log.channel} 未配置 Webhook 地址`)
    }

    // 重新构建并发送消息
    const message = this.buildMessage(log.channel, log.notifyType, log.content || '')
    await this.sendWebhook(url, message)

    // 更新日志状态为成功
    log.success = 1
    log.errorMessage = null
    await this.notifyLogRepository.save(log)
  }

  private buildTestMessage(channel: string): any {
    const testContent = '【栖缘社】这是一条测试消息，用于验证通知通道连通性。'
    switch (channel) {
      case 'wecom':
        return {
          msgtype: 'markdown',
          markdown: { content: `【栖缘社 - 通知通道测试】\n> ${testContent}\n>时间：${new Date().toLocaleString('zh-CN')}` },
        }
      case 'feishu':
        return {
          msg_type: 'text',
          content: { text: `【栖缘社 - 通知通道测试】${testContent}` },
        }
      case 'dingtalk':
        return {
          msgtype: 'markdown',
          markdown: {
            title: '栖缘社 - 通知通道测试',
            text: `【栖缘社 - 通知通道测试】\n- ${testContent}\n- 时间：${new Date().toLocaleString('zh-CN')}`,
          },
        }
      default:
        return {
          msgtype: 'text',
          text: { content: `【通知通道测试】${testContent}` },
        }
    }
  }
}
