/**
 * AI 接口防刷限流 —— 类型定义 & 错误码体系
 *
 * 多维度识别：IP / User-Agent / 设备指纹 / 用户ID
 * 分级策略：免费严格、会员宽松、IP全局、设备全局、QPS上限、日报预算
 */

// ================================================================
// 错误码体系
// ================================================================

export enum AiRateLimitCode {
  /** IP 维度超限 */
  IP_LIMITED = 'AI_IP_LIMITED',
  /** 设备维度超限 */
  DEVICE_LIMITED = 'AI_DEVICE_LIMITED',
  /** 用户维度超限（免费/会员） */
  USER_LIMITED = 'AI_USER_LIMITED',
  /** 黑名单拦截 */
  BLACKLISTED = 'AI_BLACKLISTED',
  /** 异常 User-Agent */
  ABNORMAL_UA = 'AI_ABNORMAL_UA',
  /** 全局 QPS 限制 */
  GLOBAL_QPS = 'AI_GLOBAL_QPS',
  /** 日预算上限 */
  DAILY_BUDGET_EXHAUSTED = 'AI_DAILY_BUDGET',
  /** 敏感词违规次数过多 */
  SAFETY_VIOLATION = 'AI_SAFETY_VIOLATION',
}

export const RATE_LIMIT_MESSAGES: Record<AiRateLimitCode, string> = {
  [AiRateLimitCode.IP_LIMITED]: '请求过于频繁，请稍后再试',
  [AiRateLimitCode.DEVICE_LIMITED]: '设备请求次数已达上限，请明日再来',
  [AiRateLimitCode.USER_LIMITED]: '今日次数已用完，开通会员享更多次数',
  [AiRateLimitCode.BLACKLISTED]: '服务暂不可用，如有疑问请联系客服',
  [AiRateLimitCode.ABNORMAL_UA]: '请求异常，请使用正常设备访问',
  [AiRateLimitCode.GLOBAL_QPS]: '系统繁忙，请稍后再试',
  [AiRateLimitCode.DAILY_BUDGET_EXHAUSTED]: '系统繁忙，请明日再来',
  [AiRateLimitCode.SAFETY_VIOLATION]: '您今日已多次触发安全提醒，该功能暂不可用',
}

// ================================================================
// Redis Key 前缀
// ================================================================

export const RATE_LIMIT_KEYS = {
  /** IP 计数器: ai:rate:ip:{ip}:{YYYY-MM-DD HH:mm}  */
  IP_MINUTE: 'ai:rate:ip:%s:%s',
  /** IP 小时计数器: ai:rate:ip:hop:{ip}:{YYYY-MM-DD HH} */
  IP_HOUR: 'ai:rate:ip:hop:%s:%s',
  /** 设备计数器: ai:rate:dev:{fingerprint}:{YYYY-MM-DD} */
  DEVICE_DAY: 'ai:rate:dev:%s:%s',
  /** 用户计数器: ai:rate:uid:{userId}:{callType}:{YYYY-MM-DD} */
  USER_DAY: 'ai:rate:uid:%d:%s:%s',
  /** 全局 QPS: ai:rate:global:qps:{YYYY-MM-DD HH:mm:ss} */
  GLOBAL_QPS: 'ai:rate:global:qps:%s',
  /** 日报预算: ai:rate:global:budget:{YYYY-MM-DD} */
  DAILY_BUDGET: 'ai:rate:global:budget:%s',

  /** IP 黑名单 Set: ai:blacklist:ip */
  BLACKLIST_IP: 'ai:blacklist:ip',
  /** 设备黑名单 Set: ai:blacklist:dev */
  BLACKLIST_DEV: 'ai:blacklist:dev',
  /** 用户黑名单 Set: ai:blacklist:uid */
  BLACKLIST_UID: 'ai:blacklist:uid',
}

// ================================================================
// 限流阈值配置
// ================================================================

export interface RateLimitConfig {
  /** IP 每分钟上限 */
  ipPerMinute: number
  /** IP 每小时上限 */
  ipPerHour: number
  /** 设备每日上限 */
  devicePerDay: number
  /** 用户每日上限（免费用户） */
  userFreePerDay: number
  /** 用户每日上限（会员用户，0=不限） */
  userVipPerDay: number
  /** 全局每秒 QPS */
  globalQps: number
}

/** 各 AI 功能限流配置 */
export const AI_RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  match: {
    ipPerMinute: 10, ipPerHour: 50, devicePerDay: 100,
    userFreePerDay: 3, userVipPerDay: 20, globalQps: 20,
  },
  chat_skill: {
    ipPerMinute: 10, ipPerHour: 50, devicePerDay: 100,
    userFreePerDay: 5, userVipPerDay: 50, globalQps: 20,
  },
  matchmaker: {
    ipPerMinute: 10, ipPerHour: 100, devicePerDay: 100,
    userFreePerDay: 10, userVipPerDay: 0, globalQps: 20,
  },
  fun_quiz: {
    ipPerMinute: 10, ipPerHour: 50, devicePerDay: 100,
    userFreePerDay: 2, userVipPerDay: 10, globalQps: 20,
  },
  profile_gen: {
    ipPerMinute: 10, ipPerHour: 50, devicePerDay: 100,
    userFreePerDay: 1, userVipPerDay: 5, globalQps: 20,
  },
  default: {
    ipPerMinute: 5, ipPerHour: 30, devicePerDay: 50,
    userFreePerDay: 3, userVipPerDay: 20, globalQps: 20,
  },
}

// ================================================================
// 黑名单配置
// ================================================================

/** 自动加入黑名单的触发条件 */
export interface BlacklistTrigger {
  /** 1 小时内 IP 超过此次数 */
  ipHourly: number
  /** 每日设备超过此次数 */
  deviceDaily: number
  /** 每日敏感词违规超过此次数 */
  safetyViolations: number
}

export const BLACKLIST_TRIGGERS: BlacklistTrigger = {
  ipHourly: 100,
  deviceDaily: 200,
  safetyViolations: 5,
}

/** 黑名单有效期（秒）-- 24小时 */
export const BLACKLIST_TTL = 24 * 60 * 60

// ================================================================
// 日预算
// ================================================================

/** 全局日预算上限（次） */
export const DAILY_AI_BUDGET = 100000

// ================================================================
// 异常 UA 特征
// ================================================================

export const ABNORMAL_UA_PATTERNS = [
  /headless/i,
  /puppeteer/i,
  /selenium/i,
  /playwright/i,
  /scrapy/i,
  /curl/i,
  /wget/i,
  /python/i,
  /go-http/i,
  /axios/i,
  /node-fetch/i,
  /okhttp/i,     // Android 非浏览器
  /^$/,
  /^-\s*$/,
]

// ================================================================
// 限流结果
// ================================================================

export interface RateLimitResult {
  /** 是否放行 */
  allowed: boolean
  /** 拒绝时返回的错误码 */
  code: AiRateLimitCode | null
  /** 拒绝文案 */
  message: string
  /** 当前各维度计数（用于前端展示剩余次数） */
  details?: {
    ipCount: number
    ipLimit: number
    deviceCount: number
    deviceLimit: number
    userCount: number
    userLimit: number
  }
}
