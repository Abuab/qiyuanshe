import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'
import { AdminUser } from '../entities/AdminUser'
import { RedisService } from '../common/redis.service'

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name)

  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
    private readonly redisService: RedisService,
  ) {}

  async setupTotp(adminId: number) {
    const secret = speakeasy.generateSecret({
      name: 'Qiyuanshe',
      length: 20,
    })

    const cleanBase32 = secret.base32.toUpperCase().replace(/=/g, '')

    const otpauthUrl = `otpauth://totp/Qiyuanshe%3Aadmin-${adminId}?secret=${cleanBase32}&issuer=Qiyuanshe`

    this.logger.debug(`[MFA Setup] adminId: ${adminId}, server time: ${new Date().toISOString()}`)

    await this.redisService.set(`mfa:temp:${adminId}`, cleanBase32, 300)

    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl)

    return { qrCodeUrl, secret: cleanBase32 }
  }

  async enableTotp(adminId: number, code: string) {
    const tempSecret = await this.redisService.get(`mfa:temp:${adminId}`)

    this.logger.debug(`[MFA Verify] adminId: ${adminId}, server time: ${new Date().toISOString()}`)

    if (!tempSecret) {
      this.logger.log(`[MFA Verify] FAIL: tempSecret expired for adminId=${adminId}`)
      throw new Error('绑定已过期，请重新发起设置')
    }

    const token = String(code).trim()

    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token,
      window: 5,
    })

    if (!verified) {
      this.logger.log(`[MFA Verify] FAIL: code mismatch for adminId=${adminId}`)
      throw new Error('验证码错误或已过期')
    }

    this.logger.log(`[MFA Verify] SUCCESS: adminId=${adminId} MFA enabled`)

    await this.adminRepo.update(adminId, {
      mfaSecret: tempSecret,
      isMfaEnabled: true,
    })

    await this.redisService.del(`mfa:temp:${adminId}`)

    return { success: true }
  }

  async disableMfa(adminId: number, code: string) {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } })
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

    if (!verified) {
      this.logger.log(`[MFA Disable] FAIL: code mismatch for adminId=${adminId}`)
      throw new Error('验证码错误')
    }

    this.logger.log(`[MFA Disable] SUCCESS: adminId=${adminId} MFA disabled`)

    await this.adminRepo.update(adminId, {
      mfaSecret: null,
      isMfaEnabled: false,
    })

    return { success: true }
  }

  async verifyLoginMfa(adminId: number, code: string): Promise<boolean> {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } })
    if (!admin || !admin.isMfaEnabled) {
      return true
    }

    this.logger.debug(`[MFA Login] adminId: ${adminId}, verifying code`)

    const token = String(code).trim()

    const verified = speakeasy.totp.verify({
      secret: admin.mfaSecret!,
      encoding: 'base32',
      token,
      window: 5,
    })

    if (!verified) {
      this.logger.log(`[MFA Login] FAIL: code mismatch for adminId=${adminId}`)
    } else {
      this.logger.debug(`[MFA Login] SUCCESS: adminId=${adminId}`)
    }

    return verified
  }
}
