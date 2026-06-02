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
      name: 'qiyuanshe-admin',
      length: 20,
    })

    await this.redisService.set(
      `mfa:temp:${adminId}`,
      secret.base32,
      300,
    )

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `qiyuanshe-admin-${adminId}`,
      issuer: '栖缘社管理后台',
    })

    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl)

    return { qrCodeUrl, secret: secret.base32 }
  }

  async enableTotp(adminId: number, code: string) {
    const tempSecret = await this.redisService.get(`mfa:temp:${adminId}`)
    if (!tempSecret) {
      throw new Error('绑定已过期，请重新发起设置')
    }

    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    })

    if (!verified) {
      throw new Error('验证码错误或已过期')
    }

    await this.userRepo.update(adminId, {
      mfaSecret: tempSecret,
      isMfaEnabled: true,
      mfaType: 'totp',
    })

    await this.redisService.del(`mfa:temp:${adminId}`)

    return { success: true }
  }

  async sendSmsCode(adminId: number, phone: string) {
    const code = String(Math.floor(100000 + Math.random() * 900000))

    await this.redisService.set(`mfa:sms:${adminId}`, code, 300)

    console.log(`[MFA SMS] 管理员 ${adminId} 手机 ${phone} 验证码: ${code}`)

    return { success: true, message: '验证码已发送（查看后端日志获取）' }
  }

  async enableSms(adminId: number, phone: string, code: string) {
    const savedCode = await this.redisService.get(`mfa:sms:${adminId}`)
    if (!savedCode) {
      throw new Error('验证码已过期，请重新发送')
    }

    if (savedCode !== code) {
      throw new Error('验证码错误')
    }

    await this.userRepo.update(adminId, {
      phone,
      isMfaEnabled: true,
      mfaType: 'sms',
    })

    await this.redisService.del(`mfa:sms:${adminId}`)

    return { success: true }
  }

  async disableMfa(adminId: number, code: string) {
    const admin = await this.userRepo.findOne({ where: { id: adminId } })
    if (!admin || !admin.isMfaEnabled) {
      throw new Error('未启用双因素认证')
    }

    const valid = await this.verifyCode(admin, code)
    if (!valid) {
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

    return this.verifyCode(admin, code)
  }

  private async verifyCode(admin: User, code: string): Promise<boolean> {
    if (admin.mfaType === 'totp') {
      return speakeasy.totp.verify({
        secret: admin.mfaSecret!,
        encoding: 'base32',
        token: code,
        window: 1,
      })
    }

    if (admin.mfaType === 'sms') {
      const savedCode = await this.redisService.get(`mfa:sms:${admin.id}`)
      if (savedCode && savedCode === code) {
        await this.redisService.del(`mfa:sms:${admin.id}`)
        return true
      }
      return false
    }

    return false
  }
}
