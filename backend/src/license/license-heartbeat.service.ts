import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import axios from 'axios'
import { LicenseService } from './license.service'

/**
 * License 心跳服务：每天凌晨 3 点向远程许可证服务器上报授权状态。
 * - LICENSE_SERVER_URL 未配置时跳过心跳（激活必须联网，激活后可短暂离线运行）
 * - 网络失败 / 响应异常时仅记录日志，不阻断业务（本地验签兜底）
 */
@Injectable()
export class LicenseHeartbeatService {
  private readonly logger = new Logger(LicenseHeartbeatService.name)

  constructor(private readonly licenseService: LicenseService) {}

  @Cron('0 3 * * *')
  async heartbeat(): Promise<void> {
    const serverUrl = (process.env.LICENSE_SERVER_URL || '').trim().replace(/\/+$/, '')
    if (!serverUrl) {
      this.logger.debug('[License] 未配置 LICENSE_SERVER_URL，跳过心跳')
      return
    }

    try {
      const signature = await this.licenseService.getLicenseSignature()
      if (!signature) {
        this.logger.warn('[License] 未找到已激活授权码，跳过心跳')
        return
      }

      const activationId = await this.licenseService.getActivationId()
      const secret = (process.env.LICENSE_SERVER_SECRET || '').trim()
      const headers = secret ? { 'X-License-Secret': secret } : {}
      const res = await axios.post(
        `${serverUrl}/heartbeat`,
        {
          licenseSignature: signature,
          activationId: activationId || undefined,
          domain: process.env.APP_DOMAIN || '',
        },
        { timeout: 10000, headers },
      )

      const status = res?.data?.status
      if (typeof status !== 'string' || !status) {
        this.logger.warn('[License] 心跳响应缺少 status 字段，忽略本次结果')
        return
      }

      // 离线激活对账：若本地 activationId 为空（离线激活），在线后补齐
      await this.licenseService.reconcileOfflineActivation()
      await this.licenseService.updateRemoteStatus(status)
      this.logger.debug(`[License] 心跳完成，远程状态：${status}`)
    } catch (e: any) {
      this.logger.warn(`[License] 心跳失败，使用本地验证：${e?.message || e}`)
    }
  }
}
