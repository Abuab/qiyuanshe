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

/** 资料完整度评分权重 */
export const COMPLETENESS_WEIGHTS = {
  /** 头像（至少1张审核通过） */
  AVATAR: 15,
  /** 年龄 */
  AGE: 10,
  /** 身高 */
  HEIGHT: 10,
  /** 学历 */
  EDUCATION: 10,
  /** 收入 */
  INCOME: 10,
  /** 城市 */
  CITY: 10,
  /** 职业 */
  OCCUPATION: 5,
  /** 标签基础分（每标签5分，上限15） */
  TAG_PER: 5,
  TAG_MAX: 15,
  /** 问答基础分（每问答5分，上限15） */
  ANSWER_PER: 5,
  ANSWER_MAX: 15,
  /** 分析最低完整度阈值 */
  MIN_COMPLETENESS: 60,
} as const

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
  /** 当前用户完整度分数（0-100） */
  selfCompleteness: number
  /** 对方用户完整度分数（0-100） */
  targetCompleteness: number
  /** 是否可分析（双方都 ≥ 60% 为 true） */
  canAnalyze: boolean
  /** 哪一方资料不足 */
  insufficientSide: 'self' | 'target' | 'both' | null
  /** 今天是否已提醒过对方 */
  hasReminded: boolean
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
