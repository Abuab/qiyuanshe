/**
 * AI 缘分匹配分析 —— 类型定义
 */

// ===================== AI 输入：双方数据 =====================

/** 一方用户摘要（扁平化，送 AI 用） */
export interface MatchUserSnapshot {
  userId: number
  nickname: string
  gender: number
  age: number
  height: number
  weight: number
  education: string
  occupation: string
  incomeRange: string
  housingStatus: string
  carStatus: string
  maritalStatus: string
  hometown: string
  residence: string
  zodiac: string
  constellation: string
  /** 系统标签名称列表 */
  tags: string[]
  /** 审核通过的问答：{ question: string, answer: string }[] */
  answers: { question: string; answer: string }[]
}

/** 双方快照 */
export interface MatchPairSnapshot {
  me: MatchUserSnapshot
  ta: MatchUserSnapshot
  /** 双方重叠标签 */
  overlapTags: string[]
}

// ===================== 资料完备校验 =====================

export interface MatchEligibilityCheck {
  /** 是否满足分析条件 */
  eligible: boolean
  /** 不通过原因列表 */
  reasons: string[]
  /** 我方标签数 */
  myTagCount: number
  /** 我方问答数 */
  myAnswerCount: number
  /** 对方标签数 */
  taTagCount: number
  /** 对方问答数 */
  taAnswerCount: number
}

// ===================== AI 输出：匹配报告 =====================

/** AI 返回的原始结构（JSON Schema） */
export interface AiMatchResultRaw {
  /** 综合匹配度 0-100 */
  overallScore: number
  /** 三观契合度 */
  valuesScore: number
  /** 生活方式契合度 */
  lifestyleScore: number
  /** 未来规划契合度 */
  futurePlanScore: number
  /** 自然语言分析 80-120字 */
  analysis: string
  /** 相处建议，3条 */
  advice: string[]
}

/** 返回给小程序端的匹配报告 */
export interface MatchReportResponse {
  /** 报告ID */
  id: number
  /** 是否来自缓存 */
  fromCache: boolean
  /** 综合匹配度 */
  overallScore: number
  /** 三观契合度 */
  valuesScore: number
  /** 生活方式契合度 */
  lifestyleScore: number
  /** 未来规划契合度 */
  futurePlanScore: number
  /** 自然语言分析 */
  analysis: string
  /** 相处建议 */
  advice: string[]
  /** 重叠标签数 */
  overlapTagCount: number
  /** 我方今日剩余次数 */
  remainingQuota: number
  /** 生成时间 */
  createdAt: string
}

// ===================== 次数限制 =====================

/** 每日免费次数 */
export const MATCH_FREE_DAILY_LIMIT = 3
/** 每日会员次数 */
export const MATCH_VIP_DAILY_LIMIT = 20
/** 报告缓存天数 */
export const MATCH_CACHE_DAYS = 7
/** 资料完备最低标签数 */
export const MATCH_MIN_TAGS = 3
/** 资料完备最低问答数 */
export const MATCH_MIN_ANSWERS = 3

export interface MatchQuotaInfo {
  dailyLimit: number
  usedToday: number
  remaining: number
}
