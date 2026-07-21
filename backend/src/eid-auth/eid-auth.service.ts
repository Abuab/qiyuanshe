import { Injectable, Logger, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, EntityManager } from 'typeorm'
import { User } from '../entities/User'
import { UserAuth } from '../entities/UserAuth'
import { RealNameIdentity } from '../entities/RealNameIdentity'
import { SystemService } from '../system/system.service'
import { NotifyChannelService } from '../admin/notify-channel.service'
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
    @InjectRepository(UserAuth)
    private readonly userAuthRepo: Repository<UserAuth>,
    private readonly entityManager: EntityManager,
    @Optional()
    private readonly systemService?: SystemService,
    @Optional()
    private readonly notifyChannelService?: NotifyChannelService,
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
    identityInfo?: { realName?: string; idCard?: string },
  ): Promise<{ status: number; certTime: Date | null }> {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) {
      throw new Error('用户不存在')
    }
    // 已认证/失败的最终态直接返回，避免重复消费 token（token 有效期 3 天）
    // 但如果管理后台已将 isRealName 回退，不应返回已认证状态
    if (user.eidCertStatus === EID_STATUS.DONE) {
      if (user.isRealName !== 1) {
        return { status: EID_STATUS.NONE, certTime: user.eidCertTime }
      }
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
        // 创建/更新 UserAuth 实名认证记录（使用前端表单中填写的姓名/身份证号）
        if (identityInfo?.realName && identityInfo?.idCard) {
          // 去重校验：检查该身份证号是否已被其他激活用户绑定
          const duplicateCheck = await this.checkIdCardDuplicate(userId, identityInfo.idCard)
          if (!duplicateCheck.canProceed) {
            this.logger.warn(
              `用户 ${userId} E证通核身通过但身份证号冲突: ${duplicateCheck.message}`,
            )
            // 认证标记为失败，不允许写入身份信息
            await this.userRepo.update(userId, {
              eidCertStatus: EID_STATUS.FAILED,
              eidCertTime: now,
            })
            // 发送管理后台预警
            this.sendDuplicateAlert(
              userId,
              duplicateCheck.duplicateUserId ? [] : [],
              [],
            ).catch(e => this.logger.warn('发送身份证冲突预警失败: ' + e?.message))
            return { status: EID_STATUS.FAILED, certTime: now }
          }

          const existing = await this.userAuthRepo.findOne({
            where: { userId, authType: 'realname' },
          })
          if (existing) {
            existing.authData = { realName: identityInfo.realName, idCard: identityInfo.idCard }
            existing.status = 1
            await this.userAuthRepo.save(existing)
          } else {
            await this.userAuthRepo.save(
              this.userAuthRepo.create({
                userId,
                authType: 'realname',
                status: 1,
                authData: { realName: identityInfo.realName, idCard: identityInfo.idCard },
              }),
            )
          }

          // 同步写入 real_name_identities 表（新表，结构化存储）
          const idCardHash = crypto.createHash('sha256').update(identityInfo.idCard.trim()).digest('hex')
          const existingIdentity = await this.entityManager
            .createQueryBuilder(RealNameIdentity, 'rni')
            .where('rni.userId = :userId', { userId })
            .getOne()
          if (existingIdentity) {
            await this.entityManager.update(RealNameIdentity, existingIdentity.id, {
              realName: identityInfo.realName,
              idCard: identityInfo.idCard,
              idCardHash,
              eidBizSeqNo: user.eidBizSeqNo,
              verifiedAt: now,
            })
          } else {
            await this.entityManager.insert(RealNameIdentity, {
              userId,
              realName: identityInfo.realName,
              idCard: identityInfo.idCard,
              idCardHash,
              eidBizSeqNo: user.eidBizSeqNo,
              verifiedAt: now,
            })
          }
        }
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
   * 检查身份证号是否已被其他账号实名认证（前端创建认证订单前调用）
   * 返回状态：
   * - canProceed: true  → 无冲突，可继续创建 E证通订单
   * - canProceed: false → 需根据 reason 处理
   *   - reason='duplicate_active'：已有激活账号绑定 → 拒绝
   *   - reason='requires_reauth'：历史已注销账号绑定 → 需付费二次认证
   */
  async checkIdCardDuplicate(
    userId: number,
    idCard: string,
  ): Promise<{
    canProceed: boolean
    reason?: string
    message?: string
    duplicateUserId?: number
  }> {
    const idCardHash = crypto.createHash('sha256').update(idCard.trim()).digest('hex')
    const idCardTrim = idCard.trim()

    // 查找使用相同身份证号的所有记录（排除本人）
    const identities = await this.entityManager
      .createQueryBuilder(RealNameIdentity, 'rni')
      .where('rni.idCardHash = :hash', { hash: idCardHash })
      .andWhere('rni.userId != :userId', { userId })
      .getMany()

    // 如果 real_name_identities 没找到，兜底检查 user_auths 表（兼容旧数据迁移前已认证的用户）
    let fallbackDuplicateUserId: number | null = null
    if (identities.length === 0) {
      try {
        const legacyAuth = await this.userAuthRepo
          .createQueryBuilder('ua')
          .select('ua.userId', 'userId')
          .where("ua.authType = 'realname'")
          .andWhere('ua.status = 1')
          .andWhere('ua.userId != :userId', { userId })
          .getRawMany<{ userId: number }>()

        for (const row of legacyAuth) {
          // 逐个检查 authData JSON 中的 idCard（MySQL JSON_EXTRACT 可能带引号，需精确比较）
          const authRecord = await this.userAuthRepo.findOne({
            where: { userId: row.userId, authType: 'realname', status: 1 },
          })
          const rawIdCard = authRecord?.authData?.idCard
          if (rawIdCard && String(rawIdCard).trim() === idCardTrim) {
            fallbackDuplicateUserId = row.userId
            break
          }
        }
      } catch (e: any) {
        this.logger.warn(`兜底查询 user_auths 异常（不影响主流）：${e?.message || e}`)
      }
    }

    // 合并 real_name_identities 和 user_auths 兜底结果
    if (identities.length === 0 && !fallbackDuplicateUserId) {
      return { canProceed: true }
    }

    // 构建关联用户 ID 列表（real_name_identities + user_auths 兜底）
    const allRelatedIds: number[] = identities.map(i => i.userId)
    if (fallbackDuplicateUserId && !allRelatedIds.includes(fallbackDuplicateUserId)) {
      allRelatedIds.push(fallbackDuplicateUserId)
    }

    const relatedUsers = await this.userRepo.find({
      where: allRelatedIds.map(id => ({ id })),
      select: ['id', 'nickname', 'isDeleted', 'status'],
    })

    const activeUsers = relatedUsers.filter(u => u.isDeleted === 0)

    // 场景 A：有激活的账号已绑定 → 拒绝
    if (activeUsers.length > 0) {
      const activeNickname = activeUsers[0].nickname || `UID:${activeUsers[0].id}`
      this.logger.warn(
        `用户 ${userId} 身份证号已绑定激活账号 ${activeUsers[0].id}（${activeNickname}），拒绝认证`,
      )
      // 发现通过 user_auths 兜底查出的重复，发送预警
      if (fallbackDuplicateUserId) {
        this.sendDuplicateAlert(userId, identities, relatedUsers).catch(e =>
          this.logger.warn('发送身份证多账号预警失败: ' + e?.message),
        )
      }
      return {
        canProceed: false,
        reason: 'duplicate_active',
        message: `该身份证已绑定其他账号（${activeNickname}），如有疑问请联系客服`,
        duplicateUserId: activeUsers[0].id,
      }
    }

    // 场景 B：关联用户记录全部缺失或均已注销 → 阻止直接认证（需走二次认证）
    const reAuthEnabled = await this.getReAuthEnabled()
    if (!reAuthEnabled) {
      return {
        canProceed: false,
        reason: 'duplicate_active',
        message: '该身份证已绑定其他账号，如有疑问请联系客服',
      }
    }
    if (identities.length >= 1) {
      this.sendDuplicateAlert(userId, identities, relatedUsers).catch(e =>
        this.logger.warn('发送身份证多账号预警失败: ' + e?.message),
      )
    }
    return {
      canProceed: false,
      reason: 'requires_reauth',
      message: '检测到您之前已完成实名认证，重新验证需支付 1 元',
    }
  }

  /**
   * 二次认证：已注销用户支付 1 元后，复用历史 real_name_identities 记录完成认证。
   * 不再调用 E证通，直接将身份信息绑定到当前用户。
   */
  async reVerifyAccount(
    userId: number,
    idCard: string,
  ): Promise<{ success: boolean; message: string }> {
    const idCardHash = crypto.createHash('sha256').update(idCard.trim()).digest('hex')

    // 查找历史记录
    const historicIdentity = await this.entityManager
      .createQueryBuilder(RealNameIdentity, 'rni')
      .where('rni.idCardHash = :hash', { hash: idCardHash })
      .andWhere('rni.status = 0')
      .andWhere('rni.userId != :userId', { userId })
      .getOne()

    if (!historicIdentity) {
      return { success: false, message: '未找到历史认证记录' }
    }

    // 检查对应的历史用户是否已注销
    const historicUser = await this.userRepo.findOne({
      where: { id: historicIdentity.userId, isDeleted: 1 },
    })
    if (!historicUser) {
      return { success: false, message: '该身份证仍绑定在其他激活账号上' }
    }

    // 将历史身份信息写入当前用户
    const now = new Date()
    const existingIdentity = await this.entityManager
      .createQueryBuilder(RealNameIdentity, 'rni')
      .where('rni.userId = :userId', { userId })
      .getOne()
    if (existingIdentity) {
      await this.entityManager.update(RealNameIdentity, existingIdentity.id, {
        realName: historicIdentity.realName,
        idCard: historicIdentity.idCard,
        idCardHash,
        eidBizSeqNo: `reauth_${Date.now()}`,
        verifiedAt: now,
        status: 0,
      })
    } else {
      await this.entityManager.insert(RealNameIdentity, {
        userId,
        realName: historicIdentity.realName,
        idCard: historicIdentity.idCard,
        idCardHash,
        eidBizSeqNo: `reauth_${Date.now()}`,
        verifiedAt: now,
        status: 0,
      })
    }

    // 更新 users 表认证状态
    await this.userRepo.update(userId, {
      eidCertStatus: EID_STATUS.DONE,
      eidCertTime: now,
      isRealName: 1,
    })

    // 写入 user_auths 表
    const existing = await this.userAuthRepo.findOne({
      where: { userId, authType: 'realname' },
    })
    if (existing) {
      existing.authData = { realName: historicIdentity.realName, idCard: historicIdentity.idCard }
      existing.status = 1
      await this.userAuthRepo.save(existing)
    } else {
      await this.userAuthRepo.save(
        this.userAuthRepo.create({
          userId,
          authType: 'realname',
          status: 1,
          authData: { realName: historicIdentity.realName, idCard: historicIdentity.idCard },
        }),
      )
    }

    this.logger.log(`用户 ${userId} 二次认证成功，复用历史身份记录 ${historicIdentity.id}`)
    return { success: true, message: '二次认证成功' }
  }

  /**
   * 读取配置：是否启用二次认证（realNameReAuthEnabled）
   */
  private async getReAuthEnabled(): Promise<boolean> {
    try {
      if (!this.systemService) return true // 默认启用
      const configs = await this.systemService.getAllConfigs()
      return configs.basic?.realNameReAuthEnabled !== false
    } catch {
      return true
    }
  }

  /**
   * 发送多账号使用同一身份证的预警通知
   */
  private async sendDuplicateAlert(
    currentUserId: number,
    identities: RealNameIdentity[],
    relatedUsers: User[],
  ) {
    if (!this.notifyChannelService) return
    const currentUser = await this.userRepo.findOne({ where: { id: currentUserId } })
    if (!currentUser) return

    const relatedInfo = identities
      .map(ident => {
        const user = relatedUsers.find(u => u.id === ident.userId)
        return `UID:${ident.userId}(${user?.nickname || '?'}, 已注销=${user?.isDeleted})`
      })
      .join('、')

    await this.notifyChannelService.sendAuditNotify({
      type: 'realname_duplicate',
      content: `【实名认证预警】身份证被多账号使用\n- 当前用户：UID:${currentUserId}(${currentUser.nickname || '?'})\n- 历史账号：${relatedInfo}`,
      userId: currentUserId,
      userNickname: currentUser.nickname,
      source: 'eid-auth',
    })
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
