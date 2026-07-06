import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { createHash, randomBytes } from 'crypto'
import { RedisService } from '../common/redis.service'
import { PersonalityConfigService } from './personality-config.service'
import { PersonalityResultView } from './personality.types'
import {
  shanghaiDayKey,
  shanghaiHourKey,
  secondsUntilShanghaiMidnight,
} from './personality-time.util'

/**
 * 人格测试 - 游客模式服务
 *
 * 游客 token、答题进度、结果全部暂存 Redis，不写入 MySQL 主表。
 * 登录后由 user 服务调用迁移逻辑写入 MySQL 并清理 Redis。
 */
@Injectable()
export class PersonalityGuestService {
  private static readonly PREFIX = 'ptest:guest'

  constructor(
    private readonly redis: RedisService,
    private readonly configService: PersonalityConfigService,
  ) {}

  // ==================== 游客 token ====================

  /**
   * 创建游客 token
   * - 同一 IP 每小时创建数量受限（超频抛「操作频繁」）
   * - token = 设备指纹 + 时间戳 + 随机串，有效期存 Redis
   */
  async createGuestToken(
    deviceInfo: Record<string, any> | undefined,
    ip: string,
  ): Promise<{ guestToken: string; expiresIn: number }> {
    const cfg = await this.configService.getConfig()

    // IP 每小时限流
    const safeIp = this.sanitizeIp(ip)
    if (safeIp) {
      const ipKey = `${PersonalityGuestService.PREFIX}:ipcount:${safeIp}:${shanghaiHourKey()}`
      const count = await this.redis.incr(ipKey)
      if (count === 1) {
        await this.redis.expire(ipKey, 3600)
      }
      if (count > cfg.guestIpHourlyLimit) {
        throw new HttpException('操作频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS)
      }
    }

    const deviceHash = this.deviceFingerprint(deviceInfo)
    const token = `g${Date.now().toString(36)}${randomBytes(16).toString('hex')}${deviceHash.slice(0, 8)}`
    const ttl = cfg.guestTokenTtlHours * 3600

    await this.redis.set(
      this.tokenKey(token),
      JSON.stringify({ deviceHash, createdAt: Date.now() }),
      ttl,
    )

    return { guestToken: token, expiresIn: ttl }
  }

  /** 校验游客 token 是否有效 */
  async isValidToken(token: string): Promise<boolean> {
    if (!token) return false
    const raw = await this.redis.get(this.tokenKey(token))
    return raw !== null
  }

  // ==================== 每日答题计数（防刷） ====================

  /** 当前游客今日已答题次数 */
  async getDailyCount(token: string): Promise<number> {
    const raw = await this.redis.get(this.dayCountKey(token))
    return raw ? parseInt(raw, 10) || 0 : 0
  }

  /** 递增今日答题次数并返回最新值（首次写入设置到自然天结束过期） */
  async incrDailyCount(token: string): Promise<number> {
    const key = this.dayCountKey(token)
    const count = await this.redis.incr(key)
    if (count === 1) {
      await this.redis.expire(key, secondsUntilShanghaiMidnight() + 60)
    }
    return count
  }

  // ==================== 游客结果暂存 ====================

  async getResult(token: string): Promise<PersonalityResultView | null> {
    const raw = await this.redis.get(this.resultKey(token))
    if (!raw) return null
    try {
      return JSON.parse(raw) as PersonalityResultView
    } catch {
      return null
    }
  }

  async saveResult(token: string, result: PersonalityResultView): Promise<void> {
    const cfg = await this.configService.getConfig()
    await this.redis.set(
      this.resultKey(token),
      JSON.stringify(result),
      cfg.guestTokenTtlHours * 3600,
    )
  }

  /** 清空游客结果（重测时用） */
  async clearResult(token: string): Promise<void> {
    await this.redis.del(this.resultKey(token))
  }

  /**
   * 迁移完成后清理游客数据：结果 + token
   * 每日计数键保留（自然过期），防止刚迁移又反复刷 token 绕过限制
   */
  async clearAfterMigration(token: string): Promise<void> {
    await this.redis.del(this.resultKey(token))
    await this.redis.del(this.tokenKey(token))
  }

  // ==================== 内部工具 ====================

  private deviceFingerprint(deviceInfo: Record<string, any> | undefined): string {
    // 取微信系统信息中相对稳定的字段构成设备指纹
    const parts = deviceInfo
      ? [
          deviceInfo.brand,
          deviceInfo.model,
          deviceInfo.system,
          deviceInfo.platform,
          deviceInfo.pixelRatio,
          deviceInfo.screenWidth,
          deviceInfo.screenHeight,
        ]
          .filter((v) => v !== undefined && v !== null)
          .join('|')
      : ''
    return createHash('sha1').update(`${parts}|${Date.now()}`).digest('hex')
  }

  private sanitizeIp(ip: string): string {
    if (!ip) return ''
    const first = ip.split(',')[0].trim()
    // 仅保留 IPv4/IPv6 合法字符，防止注入进 Redis key
    return first.replace(/[^0-9a-fA-F:.]/g, '').slice(0, 45)
  }

  private tokenKey(token: string): string {
    return `${PersonalityGuestService.PREFIX}:token:${token}`
  }

  private dayCountKey(token: string): string {
    return `${PersonalityGuestService.PREFIX}:daycount:${token}:${shanghaiDayKey()}`
  }

  private resultKey(token: string): string {
    return `${PersonalityGuestService.PREFIX}:result:${token}`
  }
}
