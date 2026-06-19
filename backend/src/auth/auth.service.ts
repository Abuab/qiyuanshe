import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'
import { User } from '../entities/User'
import { WechatLoginDto, PhoneLoginDto, UpdateProfileDto } from './dto'
import { wechatConfig } from '../config/wechat'
import { jwtConfig } from '../config/jwt'
import { calcProfileScore } from '../common/profile-score'

import { MIN_REGISTER_AGE, UNDERAGE_REJECT_MESSAGE } from '../ai/ai-compliance.constants'

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
    private readonly jwtService: JwtService,
  ) {}

  async wechatLogin(code: string): Promise<{ user: Partial<User>; tokens: TokenPair }> {
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
      user = this.userRepository.create({
        openid: session.openid,
        unionId: session.unionid || '',
        nickname: randomNickname,
        status: 2,
      })
      user = await this.userRepository.save(user)
    }

    if (user.status === 0) {
      throw new UnauthorizedException('账号已被禁用')
    }

    user.lastLoginAt = new Date()
    await this.userRepository.save(user)

    const tokens = this.generateToken(user)

    const userInfo = this.sanitizeUser(user)

    return { user: userInfo, tokens }
  }

  async phoneLogin(sessionKey: string, encryptedData: string, iv: string): Promise<{ user: Partial<User>; tokens: TokenPair }> {
    const phoneData = this.decryptPhone(sessionKey, encryptedData, iv)

    if (!phoneData || !phoneData.purePhoneNumber) {
      throw new UnauthorizedException('手机号解密失败')
    }

    // 先查该手机号是否存在（包括已删除的），如果已删除则禁止登录
    const existingUser = await this.userRepository.findOne({
      where: { phone: phoneData.purePhoneNumber },
    })
    if (existingUser && existingUser.isDeleted === 1) {
      throw new UnauthorizedException('账号已被删除，如有疑问请联系客服')
    }

    let user = await this.userRepository.findOne({
      where: { phone: phoneData.purePhoneNumber, isDeleted: 0 },
    })

    if (!user) {
      throw new UnauthorizedException('该手机号未注册，请先通过微信登录注册')
    }

    if (user.status === 0) {
      throw new UnauthorizedException('账号已被禁用')
    }

    user.lastLoginAt = new Date()
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

    return this.sanitizeUser(user, true)
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
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        openid: user.openid,
        type: 'access',
      },
      {
        expiresIn: '15m',
      },
    )

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        openid: user.openid,
        type: 'refresh',
      },
      {
        expiresIn: '7d',
      },
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
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
      userId: user.id,
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      avatarReviewStatus: user.avatarReviewStatus,
      gender: user.gender,
      birthYear: user.birthYear,
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
      isVip: user.isVip,
      vipLevel: user.vipLevel,
      vipExpireTime: user.vipExpireTime,
      vipPackageName: user.vipPackageName || '',
      status: user.status,
      lastLoginAt: user.lastLoginAt,
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
}
