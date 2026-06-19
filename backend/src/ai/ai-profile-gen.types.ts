/**
 * AI 个人画像生成 —— 类型定义
 *
 * 画像基于：系统标签组合 + 审核通过的问答内容
 * 用户不可直接编辑，只能点击"刷新画像"重新生成
 */

/** 画像生成条件校验 */
export interface ProfileGenEligibility {
  eligible: boolean
  reasons: string[]
  tagCount: number
  answerCount: number
}

/** 画像生成请求 */
export interface ProfileGenRequest {
  /** 强制刷新（不检查次数限制） - 仅管理员 */
  force?: boolean
}

/** 画像生成响应 */
export interface ProfileGenResponse {
  /** 画像ID */
  id: number
  /** AI 生成的画像摘要（一句话） */
  summary: string
  /** AI 生成的完整画像内容 */
  content: string
  /** 使用的标签数 */
  tagCount: number
  /** 使用的问答数 */
  answerCount: number
  /** 画像版本号 */
  version: number
  /** 本月剩余刷新次数 */
  remainingQuota: number
  /** 生成时间 */
  createdAt: string
}

// ===== 次数限制（按月） =====

/** 免费用户每月刷新次数 */
export const PROFILE_GEN_FREE_MONTHLY_LIMIT = 1
/** 会员用户每月刷新次数 */
export const PROFILE_GEN_VIP_MONTHLY_LIMIT = 5

/** 画像生成最低标签数 */
export const PROFILE_GEN_MIN_TAGS = 3
/** 画像生成最低问答数 */
export const PROFILE_GEN_MIN_ANSWERS = 3

// ===== 每月配额 Redis Key 前缀 =====

export const PROFILE_GEN_QUOTA_KEY = 'ai:profile-gen:quota:'
