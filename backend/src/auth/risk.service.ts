import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common'
import * as crypto from 'crypto'
import { RedisService } from '../common/redis.service'

/** 虚拟运营商号段（新设备 + 新 IP + 此类号段，命中即需图形验证） */
const VIRTUAL_PREFIXES = ['170', '171', '165', '162']

interface CaptchaTokenPayload {
  phone: string
  ip: string
  uaHash: string
  nonce: string
  exp: number
}

/**
 * 登录风控服务（穷人版）：
 * - 多维度限频（Redis 原子计数，统一「操作过于频繁」不泄露规则）
 * - 风控判定（命中任一规则 → 强制图形验证）
 * - 图形验证码 token（HMAC 签名 + 一次性 + 绑定手机/IP/UA）
 * - 防重放（时间戳 ±5min + nonce 一次性）
 */
@Injectable()
export class RiskService implements OnModuleInit {
  private readonly logger = new Logger(RiskService.name)
  private readonly secret: Buffer

  constructor(private readonly redis: RedisService) {
    this.secret = Buffer.from(process.env.RISK_HMAC_SECRET || '', 'utf8')
  }

  onModuleInit() {
    if (this.secret.length === 0) {
      const message =
        'RISK_HMAC_SECRET 未配置，图形验证码 token 将无法安全签发。' +
        '请执行 openssl rand -hex 32 生成密钥并注入环境变量。'
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(message)
        throw new Error(message)
      }
      this.logger.warn(message)
    }
  }

  // ===== 多维度限频（超限统一抛「操作过于频繁」，不泄露具体规则） =====
  async enforceRateLimit(
    phone: string,
    ip: string,
    deviceFingerprint: string,
  ): Promise<void> {
    // 手机号：60s/1、1h/3、1天/5
    await this.hit(`sms:rl:phone:60:${phone}`, 60, 1)
    await this.hit(`sms:rl:phone:3600:${phone}`, 3600, 3)
    await this.hit(`sms:rl:phone:86400:${phone}`, 86400, 5)
    // IP：10min/10、1天/50
    if (ip) {
      await this.hit(`sms:rl:ip:600:${ip}`, 600, 10)
      await this.hit(`sms:rl:ip:86400:${ip}`, 86400, 50)
    }
    // 设备指纹：1天/20
    if (deviceFingerprint) {
      await this.hit(`sms:rl:dev:86400:${deviceFingerprint}`, 86400, 20)
    }
  }

  private async hit(key: string, ttl: number, limit: number): Promise<void> {
    const count = await this.redis.incrWithTtl(key, ttl)
    if (count > limit) {
      this.logger.warn(`[risk] 限频命中 ${key} count=${count}`)
      throw new BadRequestException('操作过于频繁，请稍后再试')
    }
  }

  // ===== 风控判定（命中任一规则 → 需要图形验证码） =====
  async checkRisk(
    phone: string,
    ip: string,
    deviceFingerprint: string,
  ): Promise<boolean> {
    // 1. 虚拟运营商号段
    if (VIRTUAL_PREFIXES.includes((phone || '').slice(0, 3))) return true
    // 2. 0-6 点 + 新设备
    if (await this.isNewDeviceAtNight(deviceFingerprint)) return true
    // 3. 同一 IP 1 小时 ≥5 个不同手机号
    if (await this.ipPhoneCountExceeded(ip)) return true
    // 4. 手机号/设备/IP 24 小时内验证码校验失败 ≥3 次
    if (await this.verifyFailExceeded(phone, deviceFingerprint, ip)) return true
    return false
  }

  /** 记录 IP → 手机号 关联（供「同一 IP 1 小时 ≥5 手机号」判定，成功发送后调用） */
  async recordIpPhone(ip: string, phone: string): Promise<void> {
    if (!ip || !phone) return
    const key = `risk:ip:phones:${ip}`
    await this.redis.getClient().sadd(key, phone)
    await this.redis.expire(key, 3600)
  }

  private async ipPhoneCountExceeded(ip: string): Promise<boolean> {
    if (!ip) return false
    const count = await this.redis.getClient().scard(`risk:ip:phones:${ip}`)
    return count >= 5
  }

  private async isNewDeviceAtNight(deviceFingerprint: string): Promise<boolean> {
    if (!deviceFingerprint) return false
    const hour = new Date().getHours()
    if (hour >= 6) return false
    const seen = await this.redis.get(`risk:dev:seen:${deviceFingerprint}`)
    return !seen
  }

  /**
   * 夜间新设备在成功发送短信后标记为「已知设备」，
   * 避免同一设备夜间每次请求都重复触发图形验证。
   * 仅在夜间窗口内生效，白天不写入，保证夜间首次请求仍会触发风控。
   */
  async markDeviceSeen(deviceFingerprint: string): Promise<void> {
    if (!deviceFingerprint) return
    const hour = new Date().getHours()
    if (hour >= 6) return
    await this.redis.set(`risk:dev:seen:${deviceFingerprint}`, '1', 86400)
  }

  private async verifyFailExceeded(
    phone: string,
    deviceFingerprint: string,
    ip: string,
  ): Promise<boolean> {
    const phoneFails = await this.redis.get(`risk:verifyfail:phone:${phone}`)
    if (phoneFails && parseInt(phoneFails, 10) >= 3) return true
    if (deviceFingerprint) {
      const devFails = await this.redis.get(`risk:verifyfail:dev:${deviceFingerprint}`)
      if (devFails && parseInt(devFails, 10) >= 3) return true
    }
    if (ip) {
      const ipFails = await this.redis.get(`risk:verifyfail:ip:${ip}`)
      if (ipFails && parseInt(ipFails, 10) >= 3) return true
    }
    return false
  }

  /** 记录短信验证码校验失败次数（24 小时窗口） */
  async recordVerifyFail(
    phone: string,
    deviceFingerprint: string,
    ip: string,
  ): Promise<void> {
    await this.redis.incrWithTtl(`risk:verifyfail:phone:${phone}`, 86400)
    if (deviceFingerprint) {
      await this.redis.incrWithTtl(`risk:verifyfail:dev:${deviceFingerprint}`, 86400)
    }
    if (ip) {
      await this.redis.incrWithTtl(`risk:verifyfail:ip:${ip}`, 86400)
    }
  }

  // ===== 图形验证码 token（HMAC 签名 + 一次性 + 绑定） =====
  issueCaptchaToken(phone: string, ip: string, userAgent: string): string {
    const payload: CaptchaTokenPayload = {
      phone,
      ip,
      uaHash: this.hash(userAgent || ''),
      nonce: crypto.randomBytes(12).toString('hex'),
      exp: Date.now() + 5 * 60 * 1000,
    }
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
    const sig = crypto
      .createHmac('sha256', this.secret)
      .update(body, 'utf8')
      .digest('base64url')
    return `${body}.${sig}`
  }

  async verifyCaptchaToken(
    token: string,
    phone: string,
    ip: string,
    userAgent: string,
  ): Promise<boolean> {
    if (!token) return false
    const dot = token.indexOf('.')
    if (dot <= 0) return false
    const body = token.slice(0, dot)
    const sig = token.slice(dot + 1)

    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(body, 'utf8')
      .digest('base64url')
    if (sig !== expected) return false

    let payload: CaptchaTokenPayload
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    } catch {
      return false
    }

    if (!payload || payload.exp < Date.now()) return false
    if (payload.phone !== phone) return false
    if (payload.ip !== ip) return false
    if (payload.uaHash !== this.hash(userAgent || '')) return false

    // 一次性：nonce 去重（首次使用返回 true，重复使用返回 false）
    return this.redis.setNx(`captcha:token:used:${payload.nonce}`, '1', 600)
  }

  // ===== 防重放：时间戳 ±5min + nonce 一次性 =====
  async verifyAntiReplay(timestamp: number | string, nonce: string): Promise<void> {
    const ts = Number(timestamp)
    if (!ts || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
      throw new BadRequestException('请求已过期，请重试')
    }
    if (!nonce || !/^[a-f0-9]{8,64}$/i.test(nonce)) {
      throw new BadRequestException('请求参数错误')
    }
    const ok = await this.redis.setNx(`sms:nonce:${nonce}`, '1', 600)
    if (!ok) {
      throw new BadRequestException('操作过于频繁，请稍后再试')
    }
  }

  private hash(input: string): string {
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
  }
}
