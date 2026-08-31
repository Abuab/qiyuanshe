/**
 * License 功能 featureKey 常量
 * 与后端 backend/src/license/license.service.ts 的 ALL_LICENSE_FEATURES 保持一致。
 * 组件中禁止硬编码 featureKey 字符串，统一从此处引用。
 */
export const LICENSE_FEATURES = {
  USER_BROWSE: 'user_browse',
  LIKE: 'like',
  CONTACT_APPLY: 'contact_apply',
  MATCHMAKER: 'matchmaker',
  AI_MATCH: 'ai_match',
  AI_QUIZ: 'ai_quiz',
  AI_CHAT: 'ai_chat',
  CHAT: 'chat',
  DYNAMIC_POST: 'dynamic_post',
  ANSWER: 'answer',
  VIP: 'vip',
  VISITOR_LOG: 'visitor_log',
  PERSONALITY_TEST: 'personality_test',
  REALNAME_AUTH: 'realname_auth',
} as const

export type LicenseFeatureKey = (typeof LICENSE_FEATURES)[keyof typeof LICENSE_FEATURES]
