import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'
import { User } from '../entities/User'
import { RedisService } from '../common/redis.service'

@Injectable()
export class MfaService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  async setupTotp(adminId: number) {
    const secret = speakeasy.generateSecret({
      name: 'Qiyuanshe',
      length: 20,
    })

    const cleanBase32 = secret.base32.toUpperCase().replace(/=/g, '')

    const otpauthUrl = `otpauth://totp/Qiyuanshe%3Aadmin-${adminId}?secret=${cleanBase32}&issuer=Qiyuanshe`

    console.log('[MFA Setup] adminId:', adminId)
    console.log('[MFA Setup] raw base32:', secret.base32)
    console.log('[MFA Setup] cleanBase32:', cleanBase32)
    console.log('[MFA Setup] otpauthUrl:', otpauthUrl)
    console.log('[MFA Setup] server time:', new Date().toISOString())

    await this.redisService.set(`mfa:temp:${adminId}`, cleanBase32, 300)

    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl)

    return { qrCodeUrl, secret: cleanBase32 }
  }

  async enableTotp(adminId: number, code: string) {
    const tempSecret = await this.redisService.get(`mfa:temp:${adminId}`)

    console.log('[MFA Verify] adminId:', adminId)
    console.log('[MFA Verify] tempSecret from Redis:', tempSecret)
    console.log('[MFA Verify] input code:', code)
    console.log('[MFA Verify] server time:', new Date().toISOString())

    if (!tempSecret) {
      console.log('[MFA Verify] FAIL: tempSecret not found in Redis (expired)')
      throw new Error('绑定已过期，请重新发起设置')
    }

    const token = String(code).trim()
    console.log('[MFA Verify] sanitized token:', token)

    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token,
      window: 5,
    })

    console.log('[MFA Verify] result:', verified)

    if (!verified) {
      console.log('[MFA Verify] FAIL: code does not match. Server tokens:')
      for (let i = -2; i <= 2; i++) {
        const t = speakeasy.totp({
          secret: tempSecret,
          encoding: 'base32',
          time: Math.floor(Date.now() / 1000) + i * 30,
        })
        console.log(`[MFA Verify]   offset ${i}: ${t}`)
      }
      throw new Error('验证码错误或已过期')
    }

    console.log('[MFA Verify] SUCCESS')

    await this.userRepo.update(adminId, {
      mfaSecret: tempSecret,
      isMfaEnabled: true,
      mfaType: 'totp',
    })

    await this.redisService.del(`mfa:temp:${adminId}`)

    return { success: true }
  }

  async disableMfa(adminId: number, code: string) {
    const admin = await this.userRepo.findOne({ where: { id: adminId } })
    if (!admin || !admin.isMfaEnabled) {
      throw new Error('未启用双因素认证')
    }

    const token = String(code).trim()
    const verified = speakeasy.totp.verify({
      secret: admin.mfaSecret!,
      encoding: 'base32',
      token,
      window: 5,
    })

    console.log('[MFA Disable] result:', verified)

    if (!verified) {
      throw new Error('验证码错误')
    }

    await this.userRepo.update(adminId, {
      mfaSecret: null,
      isMfaEnabled: false,
      mfaType: 'none',
    })

    return { success: true }
  }

  async verifyLoginMfa(adminId: number, code: string): Promise<boolean> {
    const admin = await this.userRepo.findOne({ where: { id: adminId } })
    if (!admin || !admin.isMfaEnabled) {
      return true
    }

    console.log('[MFA Login] adminId:', adminId)
    console.log('[MFA Login] input code:', code)

    const token = String(code).trim()

    const verified = speakeasy.totp.verify({
      secret: admin.mfaSecret!,
      encoding: 'base32',
      token,
      window: 5,
    })

    console.log('[MFA Login] result:', verified)

    if (!verified) {
      console.log('[MFA Login] FAIL: no match. Server tokens:')
      for (let i = -2; i <= 2; i++) {
        const t = speakeasy.totp({
          secret: admin.mfaSecret!,
          encoding: 'base32',
          time: Math.floor(Date.now() / 1000) + i * 30,
        })
        console.log(`[MFA Login]   offset ${i}: ${t}`)
      }
    }

    return verified
  }
}
