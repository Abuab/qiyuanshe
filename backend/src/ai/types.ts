/**
 * AI 功能开关数据结构
 */

/** 子功能 Key 枚举 */
export enum AiFeatureKey {
  /** AI 缘分匹配分析 */
  MATCH = 'match',
  /** AI 聊天话术助手 */
  CHAT_SKILL = 'chat_skill',
  /** AI 红娘机器人 */
  MATCHMAKER = 'matchmaker',
  /** AI 趣味缘分测试 */
  FUN_QUIZ = 'fun_quiz',
  /** AI 个人印象生成 */
  PROFILE_GEN = 'profile_gen',
  /** AI助手入口（小程序端金刚区折叠面板） */
  AI_ASSISTANT = 'ai_assistant',
  /** AI 性格深度解读（基于人格测试结果） */
  PERSONALITY = 'personality',
  /** AI 红娘匹配建议（基于双方人格结果） */
  MATCH_ADVICE = 'match_advice',
}

/** 开关配置的 DB key 前缀 */
export const AI_FEATURE_PREFIX = 'ai.feature'

/** 总开关 DB key */
export const AI_MASTER_KEY = `${AI_FEATURE_PREFIX}.master.enabled`

/** 子开关 DB key map */
export const AI_FEATURE_KEYS: Record<AiFeatureKey, string> = {
  [AiFeatureKey.MATCH]: `${AI_FEATURE_PREFIX}.match.enabled`,
  [AiFeatureKey.CHAT_SKILL]: `${AI_FEATURE_PREFIX}.chat_skill.enabled`,
  [AiFeatureKey.MATCHMAKER]: `${AI_FEATURE_PREFIX}.matchmaker.enabled`,
  [AiFeatureKey.FUN_QUIZ]: `${AI_FEATURE_PREFIX}.fun_quiz.enabled`,
  [AiFeatureKey.PROFILE_GEN]: `${AI_FEATURE_PREFIX}.profile_gen.enabled`,
  [AiFeatureKey.AI_ASSISTANT]: `${AI_FEATURE_PREFIX}.ai_assistant.enabled`,
  [AiFeatureKey.PERSONALITY]: `${AI_FEATURE_PREFIX}.personality.enabled`,
  [AiFeatureKey.MATCH_ADVICE]: `${AI_FEATURE_PREFIX}.match_advice.enabled`,
}

/** 所有 DB key 列表 */
export const ALL_AI_KEYS = [AI_MASTER_KEY, ...Object.values(AI_FEATURE_KEYS)]

/** Redis 缓存 key */
export const AI_CONFIG_CACHE_KEY = 'ai:feature:config'

/** 开关状态信息（返回给前端） */
export interface AiFeatureSwitch {
  key: AiFeatureKey | 'master'
  label: string
  keyName: string
  enabled: boolean
  lastModifiedAt: string  // ISO string
}

/** 完整的 AI 配置 */
export interface AiFeatureConfig {
  masterEnabled: boolean
  features: Record<AiFeatureKey, boolean>
  lastModifiedAt: string
}

/** 返回给小程序端的精简配置 */
export interface AiFeaturePublicConfig {
  masterEnabled: boolean
  features: Record<AiFeatureKey, boolean>
}
