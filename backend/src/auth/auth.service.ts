import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'
import { User } from '../entities/User'
import { UserAgreement } from '../entities/UserAgreement'
import { UserAuth } from '../entities/UserAuth'
import { WechatLoginDto, PhoneLoginDto, UpdateProfileDto } from './dto'
import { wechatConfig } from '../config/wechat'
import { jwtConfig, parseExpirySeconds } from '../config/jwt'
import { AgreementLogStorageService } from '../agreement-log-storage/agreement-log-storage.service'
import { calcProfileScore } from '../common/profile-score'
import { UserService } from '../user/user.service'

import { MIN_REGISTER_AGE, UNDERAGE_REJECT_MESSAGE } from '../ai/ai-compliance.constants'
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
    private readonly jwtService: JwtService,
    private readonly agreementLogStorage: AgreementLogStorageService,
    private readonly userService: UserService,
  ) {}

  async wechatLogin(code: string, ipAddress?: string, userAgent?: string): Promise<{ user: Partial<User>; tokens: TokenPair }> {
    const session = await this.code2Session(code)

    if (!session.openid) {
      throw new UnauthorizedException('微信登录失败，无效的code')
    }

    // 先查该openid是否存在（包括已删除的），如果已删除则禁止登录
    const existingUser = await this.userRepository.findOne({
      where: { openid: session.openid },
    })
    if (existingUser && existingUser.isDeleted === 1) {
      throw new UnauthorizedException('账号已被删除，如有疑问请联系客服')
    }

    let user = await this.userRepository.findOne({
      where: { openid: session.openid, isDeleted: 0 },
    })

    if (!user) {
      // 生成 7 位随机数字
      const randomSuffix = String(Math.floor(Math.random() * 10000000)).padStart(7, '0')
      const randomNickname = `昵称${randomSuffix}`
      const userId = await this.userService.generateUserId()
      user = this.userRepository.create({
        openid: session.openid,
        unionId: session.unionid || null,
        nickname: randomNickname,
        userId: userId,
        status: 2,
      })
      user = await this.userRepository.save(user)

      // 新用户自动记录协议同意（关联登录即视为同意）
      await this.agreementRepo.save(
        this.agreementRepo.create({
          userId: user.id,
          agreementType: 'USER_AGREEMENT',
          version: '1.0',
          action: 'agree',
          ipAddress: ipAddress || null,
        }),
      )
      // 同步写入 AgreementLogStorage，确保管理后台"同意记录查询"可查到
      this.agreementLogStorage.saveLog({
        userId: user.id,
        agreementType: 'USER_AGREEMENT',
        version: '1.0',
        action: 'agree',
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      }).catch(err => console.error('[auth] saveLog failed:', err?.message || err))
      user.protocolAgreedAt = new Date()
      user.protocolVersion = '1.0'
    }

    if (user.status === 0) {
      throw new UnauthorizedException('账号已被禁用')
    }

    // 如果用户尚未记录协议同意，自动补录（老用户微信登录时也补录，与 phoneLogin 一致）
    if (!user.protocolAgreedAt) {
      await this.agreementRepo.save(
        this.agreementRepo.create({
          userId: user.id,
          agreementType: 'USER_AGREEMENT',
          version: '1.0',
          action: 'agree',
          ipAddress: ipAddress || null,
        }),
      )
      // 同步写入 AgreementLogStorage
      this.agreementLogStorage.saveLog({
        userId: user.id,
        agreementType: 'USER_AGREEMENT',
        version: '1.0',
        action: 'agree',
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      }).catch(err => console.error('[auth] saveLog failed:', err?.message || err))
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

    // 2. 解密手机号
    const phoneData = this.decryptPhone(session.session_key, encryptedData, iv)
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
      // 检查是否已删除
      const deletedUser = await this.userRepository.findOne({
        where: { openid: session.openid, isDeleted: 1 },
      })
      if (deletedUser) {
        throw new UnauthorizedException('账号已被删除，如有疑问请联系客服')
      }
      // 新用户注册
      const randomSuffix = String(Math.floor(Math.random() * 10000000)).padStart(7, '0')
      const userId = await this.userService.generateUserId()
      user = this.userRepository.create({
        openid: session.openid,
        unionId: session.unionid || null,
        nickname: `昵称${randomSuffix}`,
        userId,
        phone: phoneData.purePhoneNumber,
        status: 2,
      })
      // 必须先 save 获取 id，后续协议记录依赖 user.id
      user = await this.userRepository.save(user)

      // 新用户自动记录协议同意
      await this.agreementRepo.save(
        this.agreementRepo.create({
          userId: user.id,
          agreementType: 'USER_AGREEMENT',
          version: '1.0',
          action: 'agree',
          ipAddress: ipAddress || null,
        }),
      )
      this.agreementLogStorage.saveLog({
        userId: user.id,
        agreementType: 'USER_AGREEMENT',
        version: '1.0',
        action: 'agree',
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      }).catch(err => console.error('[auth] saveLog failed:', err?.message || err))
      user.protocolAgreedAt = new Date()
      user.protocolVersion = '1.0'
    } else {
      // 已有用户，绑定手机号（如果之前未绑定）
      if (!user.phone) {
        user.phone = phoneData.purePhoneNumber
      }
    }

    if (user.status === 0) {
      throw new UnauthorizedException('账号已被禁用')
    }

    // 5. 老用户协议同意补录（与 wechatLogin 保持一致）
    if (!user.protocolAgreedAt) {
      await this.agreementRepo.save(
        this.agreementRepo.create({
          userId: user.id,
          agreementType: 'USER_AGREEMENT',
          version: '1.0',
          action: 'agree',
          ipAddress: ipAddress || null,
        }),
      )
      this.agreementLogStorage.saveLog({
        userId: user.id,
        agreementType: 'USER_AGREEMENT',
        version: '1.0',
        action: 'agree',
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
      }).catch(err => console.error('[auth] saveLog failed:', err?.message || err))
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

      if (!user || user.status === 0) {
        throw new UnauthorizedException('用户不存在或已被禁用')
      }

      return this.generateToken(user)
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new UnauthorizedException('无效或过期的刷新令牌')
    }
  }

  async validateUserById(userId: number): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: 0 },
    })

    if (!user || user.status === 0) {
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

    // 从 UserAuth 中获取实名认证姓名
    try {
      const authRecord = await this.userAuthRepo.findOne({
        where: { userId, authType: 'realname', status: 1 },
        order: { createdAt: 'DESC' },
      })
      const authData = authRecord?.authData || {}
      ;(profile as any).realName = authData.realName || authData.name || ''
    } catch (_) {
      ;(profile as any).realName = ''
    }

    // 新用户标识：头像为空 且 昵称为系统自动生成（以"昵称"开头）
    ;(profile as any).isNewUser = (!user.avatar || !user.avatar.trim()) && /^昵称/.test(user.nickname || '')

    return profile
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: 0 },
    })

    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

    // 未成年人保护：设置出生年份时校验年龄
    if (dto.birthYear !== undefined) {
      const age = new Date().getFullYear() - dto.birthYear
      if (age < MIN_REGISTER_AGE) {
        throw new ForbiddenException(UNDERAGE_REJECT_MESSAGE)
      }
    }

    Object.assign(user, dto)
    user.profileScore = calcProfileScore(user)
    await this.userRepository.save(user)

    return this.sanitizeUser(user)
  }

  private generateToken(user: User): TokenPair {
    const accessExpiry = jwtConfig.accessTokenExpiresIn
    const refreshExpiry = jwtConfig.refreshTokenExpiresIn

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        openid: user.openid,
        type: 'access',
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
