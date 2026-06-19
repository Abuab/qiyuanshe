import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../common/redis.service'
import {
  AiRateLimitCode,
  RateLimitConfig,
  RateLimitResult,
  AI_RATE_LIMIT_CONFIGS,
  BLACKLIST_TRIGGERS,
  BLACKLIST_TTL,
  DAILY_AI_BUDGET,
  ABNORMAL_UA_PATTERNS,
  RATE_LIMIT_KEYS,
  RATE_LIMIT_MESSAGES,
} from './ai-rate-limit.types'

/**
 * AI 接口多维度防刷限流服务
 *
 * 维度：IP / User-Agent / 设备指纹 / 用户ID
 * 策略：分级限流（免费/会员）+ 黑名单 + 全局QPS + 日报预算
 */
@Injectable()
export class AiRateLimitService {
  private readonly logger = new Logger(AiRateLimitService.name)

  constructor(private readonly redis: RedisService) {}

  // ================================================================
  // 主入口：多维度限流检查
  // ================================================================

  /**
   * 对单次 AI 请求执行全维度限流检查
   *
   * @param callType - AI 调用类型（match/chat_skill/matchmaker/fun_quiz/profile_gen）
   * @param userId - 用户 ID（未登录传 0）
   * @param ip - 客户端 IP
   * @param userAgent - User-Agent 头
   * @param deviceFingerprint - 设备指纹（前端生成，如 md5(navigator+screen+canvas)）
   * @param isVip - 是否为会员
   */
  async checkRateLimit(
    callType: string,
    userId: number,
    ip: string,
    userAgent: string,
    deviceFingerprint: string,
    isVip: boolean,
  ): Promise<RateLimitResult> {
    const config = AI_RATE_LIMIT_CONFIGS[callType] || AI_RATE_LIMIT_CONFIGS.default

    // 0. 黑名单检查（最先执行）
    const blacklistCheck = await this.checkBlacklist(ip, deviceFingerprint, userId)
    if (!blacklistCheck.allowed) return blacklistCheck

    // 1. 异常 UA 检查
    const uaCheck = this.checkAbnormalUA(userAgent)
    if (!uaCheck.allowed) return uaCheck

    // 2. 全局 QPS 检查
    const qpsCheck = await this.checkGlobalQps(config)
    if (!qpsCheck.allowed) return qpsCheck

    // 3. 全局日报预算检查
    const budgetCheck = await this.checkDailyBudget()
    if (!budgetCheck.allowed) return budgetCheck

    // 4. 多维度并行检查
    const [ipResult, deviceResult, userResult] = await Promise.all([
      this.checkIpLimit(ip, config),
      this.checkDeviceLimit(deviceFingerprint, config),
      this.checkUserLimit(userId, callType, config, isVip),
    ])

    // 找到第一个拒绝的维度
    const checks: RateLimitResult[] = [ipResult, deviceResult, userResult]
    for (const check of checks) {
      if (!check.allowed) return check
    }

    // 全部通过
    return {
      allowed: true,
      code: null,
      message: '',
      details: {
        ipCount: ipResult.details?.ipCount ?? 0,
        ipLimit: config.ipPerMinute,
        deviceCount: deviceResult.details?.deviceCount ?? 0,
        deviceLimit: config.devicePerDay,
        userCount: userResult.details?.userCount ?? 0,
        userLimit: userResult.details?.userLimit ?? 0,
      },
    }
  }

  // ================================================================
  // 黑名单系统
  // ================================================================

  /** 检查是否在黑名单中 */
  async checkBlacklist(
    ip: string,
    deviceFingerprint: string,
    userId: number,
  ): Promise<RateLimitResult> {
    const results = await Promise.all([
      this.isIpBlacklisted(ip),
      deviceFingerprint ? this.isDeviceBlacklisted(deviceFingerprint) : false,
      userId > 0 ? this.isUserBlacklisted(userId) : false,
    ])

    if (results.some((r) => r)) {
      return {
        allowed: false,
        code: AiRateLimitCode.BLACKLISTED,
        message: RATE_LIMIT_MESSAGES[AiRateLimitCode.BLACKLISTED],
      }
    }

    return { allowed: true, code: null, message: '' }
  }

  /** 将 IP 加入黑名单（手动或自动触发） */
  async addIpBlacklist(ip: string, reason: string): Promise<void> {
    await this.redis.getClient().sadd(RATE_LIMIT_KEYS.BLACKLIST_IP, ip)
    this.logger.warn(`[Blacklist] IP ${ip} blocked: ${reason}`)
  }

  /** 将设备加入黑名单 */
  async addDeviceBlacklist(fingerprint: string, reason: string): Promise<void> {
    await this.redis.getClient().sadd(RATE_LIMIT_KEYS.BLACKLIST_DEV, fingerprint)
    this.logger.warn(`[Blacklist] Device ${fingerprint.slice(0, 12)} blocked: ${reason}`)
  }

  /** 将用户加入黑名单 */
  async addUserBlacklist(userId: number, reason: string): Promise<void> {
    await this.redis.getClient().sadd(RATE_LIMIT_KEYS.BLACKLIST_UID, String(userId))
    // 24 小时自动过期
    await this.redis.getClient().sadd(`ai:blacklist:uid:ts:${userId}`, String(Date.now()))
    await this.redis.expire(`ai:blacklist:uid:ts:${userId}`, BLACKLIST_TTL)
    this.logger.warn(`[Blacklist] User ${userId} blocked: ${reason}`)
  }

  /** 移除 IP 黑名单（管理后台解除） */
  async removeIpBlacklist(ip: string): Promise<void> {
    await this.redis.getClient().srem(RATE_LIMIT_KEYS.BLACKLIST_IP, ip)
    this.logger.log(`[Blacklist] IP ${ip} unblocked`)
  }

  /** 移除设备黑名单 */
  async removeDeviceBlacklist(fingerprint: string): Promise<void> {
    await this.redis.getClient().srem(RATE_LIMIT_KEYS.BLACKLIST_DEV, fingerprint)
  }

  /** 移除用户黑名单 */
  async removeUserBlacklist(userId: number): Promise<void> {
    await this.redis.getClient().srem(RATE_LIMIT_KEYS.BLACKLIST_UID, String(userId))
  }

  /** 获取所有黑名单 IP 列表 */
  async getBlacklistIps(): Promise<string[]> {
    return this.redis.getClient().smembers(RATE_LIMIT_KEYS.BLACKLIST_IP)
  }

  /** 获取所有黑名单设备列表 */
  async getBlacklistDevices(): Promise<string[]> {
    return this.redis.getClient().smembers(RATE_LIMIT_KEYS.BLACKLIST_DEV)
  }

  /** 获取所有黑名单用户列表 */
  async getBlacklistUsers(): Promise<string[]> {
    return this.redis.getClient().smembers(RATE_LIMIT_KEYS.BLACKLIST_UID)
  }

  /** 检查是否应自动加入黑名单（由外部在违规时调用） */
  async checkAutoBlacklist(
    ip: string,
    deviceFingerprint: string,
    userId: number,
    safetyViolationCount: number,
  ): Promise<void> {
    // IP 触发
    const today = new Date().toISOString().slice(0, 10)
    const ipHourKey = `ai:rate:ip:hop:${ip}:all:${today}`
    const ipHourCount = parseInt(await this.redis.get(ipHourKey) || '0', 10)
    if (ipHourCount > BLACKLIST_TRIGGERS.ipHourly) {
      await this.addIpBlacklist(ip, `IP 1小时${ipHourCount}次 > ${BLACKLIST_TRIGGERS.ipHourly}`)
    }

    // 设备触发
    if (deviceFingerprint) {
      const devDayKey = `ai:rate:dev:all:${deviceFingerprint}:${today}`
      const devDayCount = parseInt(await this.redis.get(devDayKey) || '0', 10)
      if (devDayCount > BLACKLIST_TRIGGERS.deviceDaily) {
        await this.addDeviceBlacklist(deviceFingerprint, `设备每日${devDayCount}次 > ${BLACKLIST_TRIGGERS.deviceDaily}`)
      }
    }

    // 安全违规触发
    if (safetyViolationCount > BLACKLIST_TRIGGERS.safetyViolations && userId > 0) {
      await this.addUserBlacklist(userId, `安全违规${safetyViolationCount}次 > ${BLACKLIST_TRIGGERS.safetyViolations}`)
    }
  }

  // ================================================================
  // 内部检查方法
  // ================================================================

  private async isIpBlacklisted(ip: string): Promise<boolean> {
    const exists = await this.redis.getClient().sismember(RATE_LIMIT_KEYS.BLACKLIST_IP, ip)
    return exists === 1
  }

  private async isDeviceBlacklisted(fingerprint: string): Promise<boolean> {
    const exists = await this.redis.getClient().sismember(RATE_LIMIT_KEYS.BLACKLIST_DEV, fingerprint)
    return exists === 1
  }

  private async isUserBlacklisted(userId: number): Promise<boolean> {
    const exists = await this.redis.getClient().sismember(RATE_LIMIT_KEYS.BLACKLIST_UID, String(userId))
    return exists === 1
  }

  /** 异常 UA 检测 */
  private checkAbnormalUA(userAgent: string): RateLimitResult {
    if (!userAgent) {
      return {
        allowed: false,
        code: AiRateLimitCode.ABNORMAL_UA,
        message: RATE_LIMIT_MESSAGES[AiRateLimitCode.ABNORMAL_UA],
      }
    }

    for (const pattern of ABNORMAL_UA_PATTERNS) {
      if (pattern.test(userAgent)) {
        this.logger.warn(`[RateLimit] Abnormal UA detected: ${userAgent.slice(0, 80)}`)
        return {
          allowed: false,
          code: AiRateLimitCode.ABNORMAL_UA,
          message: RATE_LIMIT_MESSAGES[AiRateLimitCode.ABNORMAL_UA],
        }
      }
    }

    return { allowed: true, code: null, message: '' }
  }

  /** IP 维度限流 */
  private async checkIpLimit(
    ip: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const now = new Date()
    const minuteKey = RATE_LIMIT_KEYS.IP_MINUTE
      .replace('%s', ip)
      .replace('%s', now.toISOString().slice(0, 16)) // YYYY-MM-DD HH:mm

    const count = await this.redis.incr(minuteKey)
    if (count === 1) await this.redis.expire(minuteKey, 60)

    // 同时更新小时计数器（用于黑名单触发）
    const hourKey = RATE_LIMIT_KEYS.IP_HOUR
      .replace('%s', ip)
      .replace('%s', now.toISOString().slice(0, 13)) // YYYY-MM-DD HH
    await this.redis.incr(hourKey)
    const hourTtl = await this.redis.getClient().ttl(hourKey)
    if (hourTtl < 0) await this.redis.expire(hourKey, 3600)

    if (count > config.ipPerMinute) {
      return {
        allowed: false,
        code: AiRateLimitCode.IP_LIMITED,
        message: RATE_LIMIT_MESSAGES[AiRateLimitCode.IP_LIMITED],
        details: { ipCount: count, ipLimit: config.ipPerMinute, deviceCount: 0, deviceLimit: 0, userCount: 0, userLimit: 0 },
      }
    }

    return {
      allowed: true, code: null, message: '',
      details: { ipCount: count, ipLimit: config.ipPerMinute, deviceCount: 0, deviceLimit: 0, userCount: 0, userLimit: 0 },
    }
  }

  /** 设备维度限流 */
  private async checkDeviceLimit(
    fingerprint: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    if (!fingerprint) {
      return { allowed: true, code: null, message: '' }
    }

    const today = new Date().toISOString().slice(0, 10)
    const key = RATE_LIMIT_KEYS.DEVICE_DAY.replace('%s', fingerprint).replace('%s', today)

    const count = await this.redis.incr(key)
    if (count === 1) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      await this.redis.expire(key, Math.ceil((tomorrow.getTime() - Date.now()) / 1000))
    }

    if (count > config.devicePerDay) {
      return {
        allowed: false,
        code: AiRateLimitCode.DEVICE_LIMITED,
        message: RATE_LIMIT_MESSAGES[AiRateLimitCode.DEVICE_LIMITED],
        details: { ipCount: 0, ipLimit: 0, deviceCount: count, deviceLimit: config.devicePerDay, userCount: 0, userLimit: 0 },
      }
    }

    return {
      allowed: true, code: null, message: '',
      details: { ipCount: 0, ipLimit: 0, deviceCount: count, deviceLimit: config.devicePerDay, userCount: 0, userLimit: 0 },
    }
  }

  /** 用户维度限流（按功能） */
  private async checkUserLimit(
    userId: number,
    callType: string,
    config: RateLimitConfig,
    isVip: boolean,
  ): Promise<RateLimitResult> {
    if (userId <= 0) {
      return { allowed: true, code: null, message: '' }
    }

    const dailyLimit = isVip && config.userVipPerDay > 0 ? config.userVipPerDay : config.userFreePerDay
    if (dailyLimit === 0) {
      // 会员不限
      return { allowed: true, code: null, message: '', details: { ipCount: 0, ipLimit: 0, deviceCount: 0, deviceLimit: 0, userCount: 0, userLimit: 0 } }
    }

    const today = new Date().toISOString().slice(0, 10)
    const key = RATE_LIMIT_KEYS.USER_DAY
      .replace('%d', String(userId))
      .replace('%s', callType)
      .replace('%s', today)

    const count = await this.redis.incr(key)
    if (count === 1) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      await this.redis.expire(key, Math.ceil((tomorrow.getTime() - Date.now()) / 1000))
    }

    if (count > dailyLimit) {
      return {
        allowed: false,
        code: AiRateLimitCode.USER_LIMITED,
        message: RATE_LIMIT_MESSAGES[AiRateLimitCode.USER_LIMITED],
        details: { ipCount: 0, ipLimit: 0, deviceCount: 0, deviceLimit: 0, userCount: count, userLimit: dailyLimit },
      }
    }

    return {
      allowed: true, code: null, message: '',
      details: { ipCount: 0, ipLimit: 0, deviceCount: 0, deviceLimit: 0, userCount: count, userLimit: dailyLimit },
    }
  }

  /** 全局 QPS 限流 */
  private async checkGlobalQps(config: RateLimitConfig): Promise<RateLimitResult> {
    const now = new Date()
    const secondKey = RATE_LIMIT_KEYS.GLOBAL_QPS
      .replace('%s', now.toISOString().slice(0, 19)) // YYYY-MM-DD HH:mm:ss

    const count = await this.redis.incr(secondKey)
    if (count === 1) await this.redis.expire(secondKey, 2)

    if (count > config.globalQps) {
      return {
        allowed: false,
        code: AiRateLimitCode.GLOBAL_QPS,
        message: RATE_LIMIT_MESSAGES[AiRateLimitCode.GLOBAL_QPS],
      }
    }

    return { allowed: true, code: null, message: '' }
  }

  /** 全局日报预算 */
  private async checkDailyBudget(): Promise<RateLimitResult> {
    const today = new Date().toISOString().slice(0, 10)
    const key = RATE_LIMIT_KEYS.DAILY_BUDGET.replace('%s', today)

    const count = await this.redis.incr(key)
    if (count === 1) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      await this.redis.expire(key, Math.ceil((tomorrow.getTime() - Date.now()) / 1000))
    }

    if (count > DAILY_AI_BUDGET) {
      return {
        allowed: false,
        code: AiRateLimitCode.DAILY_BUDGET_EXHAUSTED,
        message: RATE_LIMIT_MESSAGES[AiRateLimitCode.DAILY_BUDGET_EXHAUSTED],
      }
    }

    return { allowed: true, code: null, message: '' }
  }
}
