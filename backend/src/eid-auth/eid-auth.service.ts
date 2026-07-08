import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../entities/User'
import * as crypto from 'crypto'
import {
  callFaceIdApi,
  callIdCardOcr,
  getEidConfig,
  isEidConfigured,
} from './eid-tencent.util'

// 认证状态：0未认证 1认证中 2已认证 3认证失败
export const EID_STATUS = {
  NONE: 0,
  DOING: 1,
  DONE: 2,
  FAILED: 3,
} as const

@Injectable()
export class EidAuthService {
  private readonly logger = new Logger('EidAuth')

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 创建 E证通认证订单：调用 GetEidToken 获取 EidToken。
   * 不提交也不保存用户姓名/身份证号，仅保存业务流水号（token）与"认证中"状态。
   */
  async createOrder(userId: number): Promise<{ eidToken: string }> {
    if (!isEidConfigured()) {
      throw new Error('E证通尚未配置，请联系管理员')
    }
    const cfg = getEidConfig()
    const resp = await callFaceIdApi<{ EidToken: string; RequestId: string }>(
      'GetEidToken',
      {
        MerchantId: cfg.merchantId,
      },
    )
    const eidToken = resp?.EidToken
    if (!eidToken) {
      throw new Error('获取认证 Token 失败')
    }
    await this.userRepo.update(userId, {
      eidCertStatus: EID_STATUS.DOING,
      eidBizSeqNo: eidToken,
    })
    this.logger.log(`用户 ${userId} 创建E证通订单，token=${eidToken}`)
    return { eidToken }
  }

  /**
   * 查询 E证通认证结果：凭已保存的 EidToken 调用 GetEidResult。
   * 仅根据核身结果码更新认证状态，不解析/保存任何身份信息。
   */
  async queryResult(
    userId: number,
  ): Promise<{ status: number; certTime: Date | null }> {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) {
      throw new Error('用户不存在')
    }
    // 已认证/失败的最终态直接返回，避免重复消费 token（token 有效期 3 天）
    if (user.eidCertStatus === EID_STATUS.DONE) {
      return { status: user.eidCertStatus, certTime: user.eidCertTime }
    }
    if (!user.eidBizSeqNo || !isEidConfigured()) {
      return { status: user.eidCertStatus || EID_STATUS.NONE, certTime: user.eidCertTime }
    }

    try {
      const resp = await callFaceIdApi<{ Text?: { ErrCode?: string | number } }>(
        'GetEidResult',
        {
          EidToken: user.eidBizSeqNo,
          // InfoType 传 '0'：仅获取核验结果，不返回姓名/身份证号等身份信息
          InfoType: '0',
        },
      )
      const errCode = resp?.Text?.ErrCode
      const passed = errCode === 0 || errCode === '0'
      if (passed) {
        const now = new Date()
        await this.userRepo.update(userId, {
          eidCertStatus: EID_STATUS.DONE,
          eidCertTime: now,
          isRealName: 1,
        })
        this.logger.log(`用户 ${userId} E证通认证成功`)
        return { status: EID_STATUS.DONE, certTime: now }
      }
      // 有明确结果但未通过
      await this.userRepo.update(userId, { eidCertStatus: EID_STATUS.FAILED })
      this.logger.warn(`用户 ${userId} E证通认证失败，ErrCode=${errCode}`)
      return { status: EID_STATUS.FAILED, certTime: null }
    } catch (e: any) {
      // 查询异常（token 未完成/过期等）：不改动状态，返回当前状态由前端提示
      this.logger.warn(`用户 ${userId} 查询E证通结果异常：${e?.message || e}`)
      return { status: user.eidCertStatus || EID_STATUS.NONE, certTime: user.eidCertTime }
    }
  }

  /**
   * 异步回调：接收 E证通/第三方通知。为防伪造，使用 EID_CALLBACK_TOKEN 对 eidToken 做 HMAC 验签；
   * 验签通过后不信任回调报文中的结果，转而以 EidToken 主动调用 GetEidResult 获取权威结果并更新状态。
   * 回调报文记录日志备查，不保存任何身份信息。
   */
  async handleCallback(body: {
    eidToken?: string
    sign?: string
  }): Promise<{ ok: boolean }> {
    this.logger.log(`收到E证通回调：${JSON.stringify(body || {})}`)
    const callbackKey = process.env.EID_CALLBACK_TOKEN || ''
    const eidToken = (body?.eidToken || '').trim()
    const sign = (body?.sign || '').trim()
    if (!callbackKey) {
      this.logger.warn('未配置 EID_CALLBACK_TOKEN，拒绝处理回调')
      return { ok: false }
    }
    if (!eidToken || !sign) {
      return { ok: false }
    }
    const expected = crypto
      .createHmac('sha256', callbackKey)
      .update(eidToken, 'utf8')
      .digest('hex')
    // 定长比较，防时序攻击
    const valid =
      expected.length === sign.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sign))
    if (!valid) {
      this.logger.warn('E证通回调验签失败，疑似伪造')
      return { ok: false }
    }
    const user = await this.userRepo.findOne({ where: { eidBizSeqNo: eidToken } })
    if (!user) {
      this.logger.warn(`回调未匹配到用户，token=${eidToken}`)
      return { ok: false }
    }
    // 以权威查询结果为准
    await this.queryResult(user.id)
    return { ok: true }
  }

  /**
   * 身份证 OCR 识别（仅用于前端表单填充，后端不保存任何身份信息）
   */
  async recognizeIdCard(
    imageBase64: string,
  ): Promise<{ name: string; idCard: string }> {
    // OCR 仅依赖腾讯云密钥，不需要 E证通商户号，故此处只校验密钥
    const cfg = getEidConfig()
    if (!cfg.secretId || !cfg.secretKey) {
      throw new Error('OCR 尚未配置，请联系管理员')
    }
    // 去掉可能的 data:image/xxx;base64, 前缀
    const pure = (imageBase64 || '').replace(/^data:image\/\w+;base64,/, '')
    if (!pure) {
      throw new Error('图片数据为空')
    }
    const resp = await callIdCardOcr(pure, 'FRONT')
    return { name: resp?.Name || '', idCard: resp?.IdNum || '' }
  }

  /** 管理后台：认证状态映射（供列表展示） */
  static statusText(status: number): string {
    switch (status) {
      case EID_STATUS.DOING:
        return '认证中'
      case EID_STATUS.DONE:
        return '已认证'
      case EID_STATUS.FAILED:
        return '认证失败'
      default:
        return '未认证'
    }
  }
}
