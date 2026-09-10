import { Injectable, Logger, UnauthorizedException, BadRequestException, ServiceUnavailableException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, EntityManager } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'
import { User } from '../entities/User'
import { UserAgreement } from '../entities/UserAgreement'
import { UserAuth } from '../entities/UserAuth'
import { SystemConfig } from '../entities/SystemConfig'
import { wechatConfig } from '../config/wechat'
import { jwtConfig, parseExpirySeconds } from '../config/jwt'
import { isSmsConfigured } from '../config/sms'
import { AgreementLogStorageService } from '../agreement-log-storage/agreement-log-storage.service'
import { UserService } from '../user/user.service'
import { RedisService } from '../common/redis.service'
import { CryptoService } from '../common/crypto.service'
import { SmsService } from '../common/sms.service'
import { RiskService } from './risk.service'
import { SendSmsCodeDto } from './dto/send-sms-code.dto'
import { resolveAvatarUrl, resolveStaticUrl } from '../common/image-url'

interface WechatSession {
  openid: string
  session_key: string
  unionid?: string
}

interface WechatPhoneData {
  phoneNumber: string
  purePhoneNumber: string
  countryCode: string
  watermark: {
    timestamp: number
    appid: string
  }
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAgreement)
    private readonly agreementRepo: Repository<UserAgreement>,
    @InjectRepository(UserAuth)
    private readonly userAuthRepo: Repository<UserAuth>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    private readonly jwtService: JwtService,
    private readonly agreementLogStorage: AgreementLogStorageService,
    private readonly userService: UserService,
    private readonly entityManager: EntityManager,
    private readonly redis: RedisService,
    private readonly cryptoService: CryptoService,
    private readonly smsService: SmsService,
    private readonly riskService: RiskService,
  ) {}
  private readonly logger = new Logger(AuthService.name)

  /**
   * 获取新用户注册时的默认状态
   * - 'review'（严格模式）：status=0，需管理员审核
   * - 默认 'auto'（宽松模式）：status=2，用户可直接使用
   */
  private async getNewUserStatus(): Promise<number> {
    try {
      const config = await this.configRepo.findOne({ where: { configKey: 'basic.registrationMode' } })
      if (config?.configValue === 'review') return 0
    } catch (_) { /* fall through to default */ }
    return 2
  }

  /** 清除重新激活用户的限流计数器（复用相同数据库 ID，旧限流 key 不应遗留） */
  private clearRateLimitKeys(userId: number): void {
    this.redis.del(`rate_limit:avatar:user_${userId}`).catch(() => {})
    this.redis.del(`rate_limit:photo:user_${userId}`).catch(() => {})
    this.redis.del(`rate_limit:question:user_${userId}`).catch(() => {})
    this.redis.del(`rate_limit:chat:user_${userId}`).catch(() => {})
  }

  /**
   * 重置用户资料（用于协议撤回后重新注册）：清除所有个人资料字段并复位 token 版本
   */
  private resetReactivatedUser(user: User): void {
    user.isDeleted = 0
    user.deleteReason = null
    user.tokenVersion += 1           // 使注销前签发的旧 accessToken 失效
    user.refreshTokenVersion += 1    // 使注销前签发的旧 refreshToken 失效
    user.unionId = null       // 清除旧 unionId，避免微信账号主体变更后冲突
    user.nickname = `昵称${user.userId}`
    user.avatar = ''
    user.avatarReviewStatus = null
    user.gender = 0
    user.birthYear = null
    user.birthMonth = null
    user.birthDay = null
    user.height = null
    user.weight = null
    user.education = null
    user.occupation = null
    user.incomeRange = null
    user.housingStatus = null
    user.carStatus = null
    user.maritalStatus = null
    user.onlyChild = null
    user.whenMarry = null
    user.zodiac = null
    user.constellation = null
    user.hometown = null
    user.residence = null
    user.partnerAgeRange = null
    user.partnerHeightMin = null
    user.partnerEducation = null
    user.partnerIncome = null
    user.housingRequirement = null
    user.partnerMaritalStatus = null
    user.acceptChildren = null
    user.mateRequirement = null
    user.isRealName = 0
    user.eidCertStatus = 0
    user.eidCertTime = null
    user.eidBizSeqNo = null
    user.isVip = 0
    user.vipLevel = 0
    user.vipExpireTime = null
    user.vipPackageName = null
    user.wechat = null
    user.tags = null
    user.personalityTags = null
    user.hopeTaTags = null
    user.profileScore = 0
    user.protocolAgreedAt = null
    user.protocolVersion = null
    user.voiceUrl = null
    user.voiceAuditStatus = null
    user.voiceDuration = null
    user.loveQuote = null
    user.adminRemark = null
    user.manualBoostScore = 0
    user.pinnedExpireAt = null
    user.password = null
    user.mfaSecret = null
    user.isMfaEnabled = false
    user.mfaType = 'none'
    user.showBasicProfile = true     // 隐私：默认显示基本资料
    user.delegateToPlatform = false  // 隐私：不委托平台（仅红娘可操作）
  }

  /**
   * 兼容历史遗留数据：注销时未释放 openid/unionId 的旧记录，在新建账号前释放，
   * 避免 openid/unionId 唯一索引冲突。
   */
  private async releaseLegacyDeletedUser(openid: string): Promise<void> {
    try {
      // 保持 updatedAt 不变：管理后台「已注销用户」的注销时间（canceledAt）取自 updatedAt，
      // 直接 update 会触发 @UpdateDateColumn 自动刷新，导致注销时间被覆盖为重新注册时间。
      const legacy = await this.userRepository.findOne({
        where: { openid, isDeleted: 1 },
        select: ['updatedAt'],
      })
      await this.userRepository.update(
        { openid, isDeleted: 1 },
        legacy?.updatedAt
          ? { openid: null, unionId: null, updatedAt: legacy.updatedAt }
          : { openid: null, unionId: null },
      )
    } catch (e: any) {
      this.logger.warn('[auth] 释放历史注销用户 openid 失败:', e?.message || e)
    }
  }

  async wechatLogin(code: string, ipAddress?: string, userAgent?: string): Promise<{ user: Partial<User>; tokens: TokenPair }> {
    const session = await this.code2Session(code)

    if (!session.openid) {
      throw new UnauthorizedException('微信登录失败，无效的code')
    }

    // 按 openid 查找未注销用户（注销时已释放 openid，注销用户不会被命中）
    let user = await this.userRepository.findOne({
      where: { openid: session.openid, isDeleted: 0 },
    })
    if (!user) {
      // 注销后再注册 → 创建全新账号；兜底释放历史遗留的注销记录 openid
      await this.releaseLegacyDeletedUser(session.openid)

      const userId = await this.userService.generateUserId()
      user = this.userRepository.create({
        openid: session.openid,
        unionId: session.unionid || null,
        nickname: `昵称${userId}`,
        userId: userId,
        status: await this.getNewUserStatus(),
      })
      user = await this.userRepository.save(user)

      // 新用户自动记录协议同意（关联登录即视为同意）
      await this.upsertAgreement(user.id, 'USER_AGREEMENT', '1.0', 'agree', ipAddress || null)
      // 同步写入 AgreementLogStorage，确保管理后台"同意记录查询"可查到
      this.agreementLogStorage.saveLog({
        userId: user.id,
        agreementType: 'USER_AGREEMENT',
        version: '1.0',
        action: 'agree',
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      }).catch(err => this.logger.error('[auth] saveLog failed:', err?.message || err))
      user.protocolAgreedAt = new Date()
      user.protocolVersion = '1.0'
    } else {
      // 已有用户且协议曾被撤回 → 重置个人资料，视为重新注册（仅保留 VIP 权益）
      if (!user.protocolAgreedAt) {
        // 暂存权益字段和管理员终端状态，resetReactivatedUser 会清空权益字段
        const savedVip = { isVip: user.isVip, vipLevel: user.vipLevel, vipExpireTime: user.vipExpireTime, vipPackageName: user.vipPackageName }
        // 管理员设定的终端状态（禁用/锁定）应保留，不被 getNewUserStatus 覆盖
        const preservedStatus = [3, 4].includes(user.status) ? user.status : null
        this.resetReactivatedUser(user)
        user.status = preservedStatus !== null ? preservedStatus : await this.getNewUserStatus()
        // 恢复权益字段
        Object.assign(user, savedVip)
        // 清空所有关联数据（撤回同意协议时不会触发 cleanupDeletedUserData）
        await this.userService.cleanupDeletedUserData(user.id)
        this.clearRateLimitKeys(user.id)
      }
    }

    if (user.status === 3) {
      throw new UnauthorizedException('账号已被禁用')
    }
    if (user.status === 0) {
      throw new UnauthorizedException('账号审核中，请耐心等待')
    }
    // status=4（已锁定）允许登录，由前端弹窗引导确认脱单意向

    // 如果用户尚未记录协议同意，自动补录（老用户微信登录时也补录，与 phoneLogin 一致）
    if (!user.protocolAgreedAt) {
      await this.upsertAgreement(user.id, 'USER_AGREEMENT', '1.0', 'agree', ipAddress || null)
      // 同步写入 AgreementLogStorage
      this.agreementLogStorage.saveLog({
        userId: user.id,
        agreementType: 'USER_AGREEMENT',
        version: '1.0',
        action: 'agree',
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      }).catch(err => this.logger.error('[auth] saveLog failed:', err?.message || err))
      user.protocolAgreedAt = new Date()
      user.protocolVersion = '1.0'
    }

    user.lastLoginAt = new Date()
    user.lastActiveAt = new Date()
    await this.userRepository.save(user)

    const tokens = this.generateToken(user)

    const userInfo = this.sanitizeUser(user)

    return { user: userInfo, tokens }
  }

  async phoneLogin(code: string, encryptedData: string, iv: string, ipAddress?: string, userAgent?: string): Promise<{ user: Partial<User>; tokens: TokenPair }> {
    // 1. code2Session 换取 openid + sessionKey
    const session = await this.code2Session(code)
    if (!session.openid) {
      throw new UnauthorizedException('微信登录失败，无效的code')
    }

    // 2. 解密手机号（session key 可能因时序问题不匹配，捕获 bad decrypt 返回友好错误）
    let phoneData: WechatPhoneData
    try {
      phoneData = this.decryptPhone(session.session_key, encryptedData, iv)
    } catch (err: any) {
      if (err?.message?.includes('bad decrypt')) {
        throw new UnauthorizedException('手机号解密失败，请重新授权手机号')
      }
      throw err
    }
    if (!phoneData || !phoneData.purePhoneNumber) {
      throw new UnauthorizedException('手机号解密失败')
    }

    // 3. 检查该手机号是否已被其他账号绑定（排除已删除账号）
    const phoneUser = await this.userRepository.findOne({
      where: { phone: phoneData.purePhoneNumber, isDeleted: 0 },
    })
    if (phoneUser && phoneUser.openid !== session.openid) {
      throw new UnauthorizedException('该手机号已绑定其他账号')
    }

    // 4. 按 openid 查找或创建用户
    let user = await this.userRepository.findOne({
      where: { openid: session.openid, isDeleted: 0 },
    })

    if (!user) {
      // 注销后再注册 → 创建全新账号；兜底释放历史遗留的注销记录 openid
      await this.releaseLegacyDeletedUser(session.openid)

      // 新用户注册
      const userId = await this.userService.generateUserId()
      user = this.userRepository.create({
        openid: session.openid,
        unionId: session.unionid || null,
        nickname: `昵称${userId}`,
        userId,
        phone: phoneData.purePhoneNumber,
        status: await this.getNewUserStatus(),
      })
      // 必须先 save 获取 id，后续协议记录依赖 user.id
      user = await this.userRepository.save(user)

      // 新用户自动记录协议同意
      await this.upsertAgreement(user.id, 'USER_AGREEMENT', '1.0', 'agree', ipAddress || null)
      this.agreementLogStorage.saveLog({
        userId: user.id,
        agreementType: 'USER_AGREEMENT',
        version: '1.0',
        action: 'agree',
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      }).catch(err => this.logger.error('[auth] saveLog failed:', err?.message || err))
      user.protocolAgreedAt = new Date()
      user.protocolVersion = '1.0'
    } else {
      // 已有用户，绑定手机号（如果之前未绑定）
      if (!user.phone) {
        user.phone = phoneData.purePhoneNumber
      }
      // 用户主动撤回过协议同意（protocolAgreedAt 为 null）→ 重置个人资料，视为重新注册（仅保留 VIP 权益）
      if (!user.protocolAgreedAt) {
        // 暂存权益字段和管理员终端状态，resetReactivatedUser 会清空权益字段
        const savedVip = { isVip: user.isVip, vipLevel: user.vipLevel, vipExpireTime: user.vipExpireTime, vipPackageName: user.vipPackageName }
        // 管理员设定的终端状态（禁用/锁定）应保留，不被 getNewUserStatus 覆盖
        const preservedStatus = [3, 4].includes(user.status) ? user.status : null
        this.resetReactivatedUser(user)
        user.status = preservedStatus !== null ? preservedStatus : await this.getNewUserStatus()
        user.phone = phoneData.purePhoneNumber
        // 恢复权益字段
        Object.assign(user, savedVip)
        // 清空所有关联数据（撤回同意协议时不会触发 cleanupDeletedUserData）
        await this.userService.cleanupDeletedUserData(user.id)
        this.clearRateLimitKeys(user.id)
      }
    }
    if (user.status === 3) {
      throw new UnauthorizedException('账号已被禁用')
    }
    if (user.status === 0) {
      throw new UnauthorizedException('账号审核中，请耐心等待')
    }
    // status=4（已锁定）允许登录，由前端弹窗引导确认脱单意向

    // 5. 老用户协议同意补录（与 wechatLogin 保持一致）
    if (!user.protocolAgreedAt) {
      await this.upsertAgreement(user.id, 'USER_AGREEMENT', '1.0', 'agree', ipAddress || null)
      this.agreementLogStorage.saveLog({
        userId: user.id,
        agreementType: 'USER_AGREEMENT',
        version: '1.0',
        action: 'agree',
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      }).catch(err => this.logger.error('[auth] saveLog failed:', err?.message || err))
      user.protocolAgreedAt = new Date()
      user.protocolVersion = '1.0'
    }

    user.lastLoginAt = new Date()
    user.lastActiveAt = new Date()
    await this.userRepository.save(user)

    const tokens = this.generateToken(user)
    const userInfo = this.sanitizeUser(user)

    return { user: userInfo, tokens }
  }

  /** 发送短信验证码（含多维度限频、风控图形验证、防重放） */
  async sendSmsCode(dto: SendSmsCodeDto, ipAddress: string, userAgent: string): Promise<void> {
    const phone = dto.phone
    // 1. 校验手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new BadRequestException('手机号格式不正确')
    }

    // 短信服务未配置时提前返回友好错误（降级到手机号快捷登录），避免生成并存储无意义的验证码
    if (!isSmsConfigured()) {
      throw new ServiceUnavailableException('短信服务暂未开通，请使用手机号快捷登录')
    }

    // 2. 防重放：时间戳 ±5min + nonce 一次性
    await this.riskService.verifyAntiReplay(dto.timestamp, dto.nonce)

    const deviceFingerprint = dto.deviceFingerprint || ''

    // 3. 多维度限频（超限统一抛「操作过于频繁」，不泄露具体规则）
    await this.riskService.enforceRateLimit(phone, ipAddress, deviceFingerprint)

    // 4. 风控判定：命中规则必须携带有效图形验证码 token
    const needCaptcha = await this.riskService.checkRisk(phone, ipAddress, deviceFingerprint)
    if (needCaptcha) {
      if (!dto.captchaToken) {
        throw new BadRequestException('请先完成图形验证')
      }
      const valid = await this.riskService.verifyCaptchaToken(dto.captchaToken, phone, ipAddress, userAgent)
      if (!valid) {
        throw new BadRequestException('图形验证已失效，请重新验证')
      }
    }

    // 5. 记录 IP → 手机号 关联（供「同一 IP 1 小时 ≥5 手机号」风控判定）
    await this.riskService.recordIpPhone(ipAddress, phone)

    // 6. 生成 6 位验证码并存储（5 分钟有效，附带错误次数计数）
    const code = String(Math.floor(100000 + Math.random() * 900000))
    await this.redis.set(`sms:code:${phone}`, code, 300)
    await this.redis.set(`sms:code:fail:${phone}`, '0', 300)

    // 7. 调用腾讯云短信发送
    await this.smsService.sendVerificationCode(phone, code)

    // 8. 夜间新设备完成一次发送后标记为已知，避免夜间每次重复触发图形验证
    await this.riskService.markDeviceSeen(deviceFingerprint)
  }

  /** 手机验证码登录 */
  async smsLogin(code: string, phone: string, smsCode: string, ipAddress?: string, userAgent?: string, deviceFingerprint?: string): Promise<{ user: Partial<User>; tokens: TokenPair }> {
    // H5 端：无微信 code，走纯手机号登录（不依赖 openid），小程序端不受影响
    if (!code) {
      return this.smsLoginByPhone(phone, smsCode, ipAddress, userAgent, deviceFingerprint)
    }

    // 1. code2Session 换取 openid
    const session = await this.code2Session(code)
    if (!session.openid) {
      throw new UnauthorizedException('微信登录失败，无效的code')
    }

    // 2. 校验短信验证码（校验通过后立即失效）
    await this.verifySmsCode(phone, smsCode, deviceFingerprint, ipAddress)

    // 3. 检查该手机号是否已被其他账号绑定（排除已删除账号）
    const phoneUser = await this.userRepository.findOne({
      where: { phone, isDeleted: 0 },
    })
    if (phoneUser && phoneUser.openid !== session.openid) {
      throw new UnauthorizedException('该手机号已绑定其他账号')
    }

    // 4. 按 openid 查找或创建用户（与 phoneLogin 保持一致）
    let user = await this.userRepository.findOne({
      where: { openid: session.openid, isDeleted: 0 },
    })

    if (!user) {
      // 注销后再注册 → 创建全新账号；兜底释放历史遗留的注销记录 openid
      await this.releaseLegacyDeletedUser(session.openid)

      const userId = await this.userService.generateUserId()
      user = this.userRepository.create({
        openid: session.openid,
        unionId: session.unionid || null,
        nickname: `昵称${userId}`,
        userId,
        phone,
        status: await this.getNewUserStatus(),
      })
      user = await this.userRepository.save(user)

      await this.upsertAgreement(user.id, 'USER_AGREEMENT', '1.0', 'agree', ipAddress || null)
      this.agreementLogStorage.saveLog({
        userId: user.id,
        agreementType: 'USER_AGREEMENT',
        version: '1.0',
        action: 'agree',
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      }).catch(err => this.logger.error('[auth] saveLog failed:', err?.message || err))
      user.protocolAgreedAt = new Date()
      user.protocolVersion = '1.0'
    } else {
      if (!user.phone) {
        user.phone = phone
      }
      if (!user.protocolAgreedAt) {
        const savedVip = { isVip: user.isVip, vipLevel: user.vipLevel, vipExpireTime: user.vipExpireTime, vipPackageName: user.vipPackageName }
        const preservedStatus = [3, 4].includes(user.status) ? user.status : null
        this.resetReactivatedUser(user)
        user.status = preservedStatus !== null ? preservedStatus : await this.getNewUserStatus()
        user.phone = phone
        Object.assign(user, savedVip)
        await this.userService.cleanupDeletedUserData(user.id)
        this.clearRateLimitKeys(user.id)
      }
    }

    if (user.status === 3) {
      throw new UnauthorizedException('账号已被禁用')
    }
    if (user.status === 0) {
      throw new UnauthorizedException('账号审核中，请耐心等待')
    }
    // status=4（已锁定）允许登录，由前端弹窗引导确认脱单意向

    if (!user.protocolAgreedAt) {
      await this.upsertAgreement(user.id, 'USER_AGREEMENT', '1.0', 'agree', ipAddress || null)
      this.agreementLogStorage.saveLog({
        userId: user.id,
        agreementType: 'USER_AGREEMENT',
        version: '1.0',
        action: 'agree',
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      }).catch(err => this.logger.error('[auth] saveLog failed:', err?.message || err))
      user.protocolAgreedAt = new Date()
      user.protocolVersion = '1.0'
    }

    user.lastLoginAt = new Date()
    user.lastActiveAt = new Date()
    await this.userRepository.save(user)

    const tokens = this.generateToken(user)
    const userInfo = this.sanitizeUser(user)

    return { user: userInfo, tokens }
  }

  /**
   * H5 端纯手机号 + 短信验证码登录（不依赖微信 openid）。
   * 浏览器环境无 wx.login/getPhoneNumber，以手机号作为账号唯一标识，openid 置空。
   */
  private async smsLoginByPhone(
    phone: string,
    smsCode: string,
    ipAddress?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<{ user: Partial<User>; tokens: TokenPair }> {
    // 1. 校验短信验证码（校验通过后立即失效）
    await this.verifySmsCode(phone, smsCode, deviceFingerprint, ipAddress)

    // 2. 按手机号查找未注销用户（H5 账号以手机号标识，openid 可为空）
    let user = await this.userRepository.findOne({
      where: { phone, isDeleted: 0 },
    })

    if (!user) {
      // 新用户注册（openid 为空）
      const userId = await this.userService.generateUserId()
      user = this.userRepository.create({
        openid: null,
        unionId: null,
        nickname: `昵称${userId}`,
        userId,
        phone,
        status: await this.getNewUserStatus(),
      })
      user = await this.userRepository.save(user)

      // 新用户自动记录协议同意
      await this.upsertAgreement(user.id, 'USER_AGREEMENT', '1.0', 'agree', ipAddress || null)
      this.agreementLogStorage.saveLog({
        userId: user.id,
        agreementType: 'USER_AGREEMENT',
        version: '1.0',
        action: 'agree',
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      }).catch(err => this.logger.error('[auth] saveLog failed:', err?.message || err))
      user.protocolAgreedAt = new Date()
      user.protocolVersion = '1.0'
    } else {
      if (!user.phone) {
        user.phone = phone
      }
      // 用户主动撤回过协议同意 → 重置个人资料，视为重新注册（仅保留 VIP 权益）
      if (!user.protocolAgreedAt) {
        const savedVip = { isVip: user.isVip, vipLevel: user.vipLevel, vipExpireTime: user.vipExpireTime, vipPackageName: user.vipPackageName }
        const preservedStatus = [3, 4].includes(user.status) ? user.status : null
        this.resetReactivatedUser(user)
        user.status = preservedStatus !== null ? preservedStatus : await this.getNewUserStatus()
        user.phone = phone
        Object.assign(user, savedVip)
        await this.userService.cleanupDeletedUserData(user.id)
        this.clearRateLimitKeys(user.id)
      }
    }

    if (user.status === 3) {
      throw new UnauthorizedException('账号已被禁用')
    }
    if (user.status === 0) {
      throw new UnauthorizedException('账号审核中，请耐心等待')
    }
    // status=4（已锁定）允许登录，由前端弹窗引导确认脱单意向

    // 老用户协议同意补录
    if (!user.protocolAgreedAt) {
      await this.upsertAgreement(user.id, 'USER_AGREEMENT', '1.0', 'agree', ipAddress || null)
      this.agreementLogStorage.saveLog({
        userId: user.id,
        agreementType: 'USER_AGREEMENT',
        version: '1.0',
        action: 'agree',
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      }).catch(err => this.logger.error('[auth] saveLog failed:', err?.message || err))
      user.protocolAgreedAt = new Date()
      user.protocolVersion = '1.0'
    }

    user.lastLoginAt = new Date()
    user.lastActiveAt = new Date()
    await this.userRepository.save(user)

    const tokens = this.generateToken(user)
    const userInfo = this.sanitizeUser(user)

    return { user: userInfo, tokens }
  }

  private async verifySmsCode(
    phone: string,
    smsCode: string,
    deviceFingerprint?: string,
    ipAddress?: string,
  ): Promise<void> {
    const key = `sms:code:${phone}`
    const failKey = `sms:code:fail:${phone}`
    const stored = await this.redis.get(key)
    if (!stored || stored !== smsCode) {
      // 校验失败：记录失败次数（供风控判定），错误 3 次作废验证码
      await this.riskService.recordVerifyFail(phone, deviceFingerprint || '', ipAddress || '')
      const fails = await this.redis.incrWithTtl(failKey, 300)
      if (fails >= 3) {
        await this.redis.del(key)
        await this.redis.del(failKey)
      }
      throw new UnauthorizedException('验证码错误或已过期')
    }
    await this.redis.del(key)
    await this.redis.del(failKey)
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: jwtConfig.secret,
      })

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌')
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isDeleted: 0 },
      })

      if (!user || user.status === 0 || user.status === 3) {
        throw new UnauthorizedException('用户不存在或已被禁用')
      }

      // 验证 refreshTokenVersion：刷新后旧 refreshToken 立即失效（单次使用）
      if (payload.refreshVersion !== undefined && user.refreshTokenVersion !== payload.refreshVersion) {
        throw new UnauthorizedException('令牌已失效，请重新登录')
      }

      // 刷新令牌轮换：仅递增 refreshTokenVersion，使旧 refreshToken 立即失效（单次使用），不影响 accessToken
      await this.userRepository.increment({ id: user.id }, 'refreshTokenVersion', 1)
      user.refreshTokenVersion += 1

      return this.generateToken(user)
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new UnauthorizedException('无效或过期的刷新令牌')
    }
  }

  /** 登出：递增 tokenVersion 与 refreshTokenVersion，使当前用户所有已签发 token 立即失效 */
  async logout(userId: number): Promise<void> {
    await this.userRepository.increment({ id: userId }, 'tokenVersion', 1)
    await this.userRepository.increment({ id: userId }, 'refreshTokenVersion', 1)
  }

  async validateUserById(userId: number, tokenVersion?: number): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: 0 },
    })

    if (!user || user.status === 0 || user.status === 3) {
      return null
    }

    // 注销后旧 token 失效：token 签发时的版本号与当前版本号不一致则拒绝
    if (tokenVersion !== undefined && user.tokenVersion !== tokenVersion) {
      return null
    }

    return this.sanitizeUser(user)
  }

  async getProfile(userId: number): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: 0 },
      relations: ['photos'],
    })

    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

    // 自动从第一张照片同步头像（历史数据兜底 + 实时同步）
    if ((!user.avatar || !user.avatar.trim()) && user.photos?.length > 0) {
      const mainPhoto = user.photos.find(p => p.isMain === 1) || user.photos[0]
      if (mainPhoto?.photoUrl) {
        user.avatar = mainPhoto.photoUrl
        user.updatedAt = new Date()
        await this.userRepository.save(user)
      }
    }

    const profile = this.sanitizeUser(user, true)

    // 获取实名认证姓名：优先从 UserAuth 记录中取，其次从 real_name_identities 表取
    try {
      // 1. 先查 user_auths 表（兼容历史数据）
      const authRecord = await this.userAuthRepo.findOne({
        where: { userId, authType: 'realname' },
        order: { createdAt: 'DESC' },
      })
      const authData = authRecord?.authData || {}
      let realName = this.cryptoService.tryDecryptIdentity(authData.realName || authData.name || '')

      // 2. 如果 user_auths 中没找到，查询新的 real_name_identities 表（仅 status=0 有效记录）
      if (!realName) {
        const identityRecord = await this.entityManager
          .createQueryBuilder()
          .select('rni.realName')
          .from('real_name_identities', 'rni')
          .where('rni.userId = :userId', { userId })
          .andWhere('rni.status = :sts', { sts: 0 })
          .orderBy('rni.createdAt', 'DESC')
          .getRawOne()
        if (identityRecord?.realName) {
          realName = this.cryptoService.tryDecryptIdentity(identityRecord.realName)
        }
      }
      ;(profile as any).realName = realName
    } catch (_) {
      ;(profile as any).realName = ''
    }

    // 新用户标识：头像为空 且 昵称为系统自动生成（以"昵称"开头）
    ;(profile as any).isNewUser = (!user.avatar || !user.avatar.trim()) && /^昵称/.test(user.nickname || '')

    return profile
  }

  private generateToken(user: User): TokenPair {
    const accessExpiry = jwtConfig.accessTokenExpiresIn
    const refreshExpiry = jwtConfig.refreshTokenExpiresIn

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        openid: user.openid,
        type: 'access',
        tokenVersion: user.tokenVersion,
      },
      {
        expiresIn: accessExpiry,
      },
    )

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        openid: user.openid,
        type: 'refresh',
        refreshVersion: user.refreshTokenVersion,
      },
      {
        expiresIn: refreshExpiry,
      },
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: parseExpirySeconds(accessExpiry),
    }
  }

  private async code2Session(code: string): Promise<WechatSession> {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${wechatConfig.appId}&secret=${wechatConfig.secret}&js_code=${code}&grant_type=authorization_code`

    const response = await fetch(url)
    const data = await response.json()

    if (data.errcode) {
      throw new UnauthorizedException(`微信登录失败: ${data.errmsg}`)
    }

    return data as WechatSession
  }

  private decryptPhone(sessionKey: string, encryptedData: string, iv: string): WechatPhoneData {
    const decodedSessionKey = Buffer.from(sessionKey, 'base64')
    const decodedEncryptedData = Buffer.from(encryptedData, 'base64')
    const decodedIV = Buffer.from(iv, 'base64')

    let decipher = crypto.createDecipheriv('aes-128-cbc', decodedSessionKey, decodedIV)
    decipher.setAutoPadding(true)

    let decrypted = Buffer.concat([decipher.update(decodedEncryptedData), decipher.final()])

    const decryptedData = JSON.parse(decrypted.toString('utf8'))

    if (decryptedData.watermark.appid !== wechatConfig.appId) {
      throw new UnauthorizedException('数据来源不正确')
    }

    return decryptedData as WechatPhoneData
  }

  /** 记录用户协议同意（按 userId + agreementType 去重，再次同意时只更新版本和时间） */
  private async upsertAgreement(
    userId: number,
    agreementType: string,
    version: string,
    action: string,
    ipAddress?: string,
  ) {
    const existing = await this.agreementRepo.findOne({
      where: { userId, agreementType },
    })
    if (existing) {
      existing.version = version
      existing.action = action
      existing.ipAddress = ipAddress || null
      await this.agreementRepo.save(existing)
    } else {
      await this.agreementRepo.save(
        this.agreementRepo.create({
          userId,
          agreementType,
          version,
          action,
          ipAddress: ipAddress || null,
        }),
      )
    }
  }

  private sanitizeUser(user: User, includePhone = false): Partial<User> {
    const sanitized: any = {
      id: user.id,
      userId: user.userId || '',
      nickname: user.nickname,
      avatar: resolveAvatarUrl(user.avatar),
      avatarReviewStatus: user.avatarReviewStatus,
      gender: user.gender,
      birthYear: user.birthYear,
      birthMonth: user.birthMonth,
      birthDay: user.birthDay,
      height: user.height,
      weight: user.weight,
      education: user.education,
      occupation: user.occupation,
      incomeRange: user.incomeRange,
      maritalStatus: user.maritalStatus,
      housingStatus: user.housingStatus,
      carStatus: user.carStatus,
      hometown: user.hometown,
      residence: user.residence,
      onlyChild: user.onlyChild,
      whenMarry: user.whenMarry,
      zodiac: user.zodiac,
      constellation: user.constellation,
      personalityTags: user.personalityTags,
      hopeTaTags: user.hopeTaTags,
      partnerAgeRange: user.partnerAgeRange,
      partnerHeightMin: user.partnerHeightMin,
      partnerEducation: user.partnerEducation,
      partnerIncome: user.partnerIncome,
      housingRequirement: user.housingRequirement,
      partnerMaritalStatus: user.partnerMaritalStatus,
      acceptChildren: user.acceptChildren,
      mateRequirement: user.mateRequirement,
      isRealName: user.isRealName,
      eidCertStatus: user.eidCertStatus || 0,
      eidCertTime: user.eidCertTime || null,
      isVip: user.isVip,
      vipLevel: user.vipLevel,
      vipExpireTime: user.vipExpireTime,
      vipPackageName: user.vipPackageName || '',
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      lastActiveAt: user.lastActiveAt,
      protocolAgreedAt: user.protocolAgreedAt,
      protocolVersion: user.protocolVersion,
      showBasicProfile: user.showBasicProfile ?? true,
      delegateToPlatform: user.delegateToPlatform ?? false,
      voiceUrl: resolveStaticUrl(user.voiceUrl || ''),
      voiceAuditStatus: user.voiceAuditStatus,
      voiceDuration: user.voiceDuration,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }

    if (includePhone) {
      sanitized.phone = user.phone
    }

    if (user['photos']) {
      sanitized.photos = user['photos']
    }

    // 新用户标识：头像为空 且 昵称为系统自动生成（以"昵称"开头）
    sanitized.isNewUser = (!user.avatar || !user.avatar.trim()) && /^昵称/.test(user.nickname || '')

    return sanitized
  }

  /** 查询到店认证状态（使用原生 SQL） */
  async getStoreCertStatus(userId: number): Promise<boolean> {
    const rows = await this.userRepository.query(
      `SELECT store_certified FROM users WHERE id = ?`,
      [userId],
    )
    return Number(rows?.[0]?.store_certified) === 1
  }
}
