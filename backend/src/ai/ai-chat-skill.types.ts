/**
 * AI 聊天话术助手 —— 类型定义
 */

/** 对话上下文中的单条消息 */
export interface ChatContextMessage {
  /** 角色：me=当前用户, ta=对方 */
  role: 'me' | 'ta'
  /** 脱敏后的消息内容 */
  content: string
  /** 消息时间 */
  time: string
}

/** 生成的话术建议 */
export interface ChatSkillSuggestion {
  /** 风格：humorous/sincere/flirtatious */
  style: 'humorous' | 'sincere' | 'flirtatious'
  /** 风格标签 */
  label: string
  /** 建议内容 */
  content: string
  /** 是否通过安全检测 */
  safe: boolean
}

/** AI 帮回请求参数 */
export interface ChatSkillRequest {
  /** 目标用户 ID */
  targetUserId: number
}

/** AI 帮回响应 */
export interface ChatSkillResponse {
  /** 三条建议 */
  suggestions: ChatSkillSuggestion[]
  /** 今日剩余次数 */
  remainingQuota: number
}

// ===== 次数限制 =====

/** 免费用户每日次数 */
export const CHAT_SKILL_FREE_DAILY_LIMIT = 5
/** 会员用户每日次数 */
export const CHAT_SKILL_VIP_DAILY_LIMIT = 50

// ===== 防刷 =====

/** 同一用户每天最大违规次数（触发后当日禁用） */
export const CHAT_SKILL_MAX_VIOLATIONS = 3
