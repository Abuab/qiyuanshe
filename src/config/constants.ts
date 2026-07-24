/**
 * 小程序端全局常量
 * 所有硬编码的魔法字符串、数字、状态值统一在此管理。
 */

// ================================================================
// 性别
// ================================================================

export const GENDER = {
  UNKNOWN: 0,
  MALE: 1,
  FEMALE: 2,
} as const

// ================================================================
// 审核状态
// ================================================================

export const AUDIT_STATUS = {
  /** 待审核 */
  PENDING: 0,
  /** 已通过 */
  APPROVED: 1,
  /** 已拒绝 */
  REJECTED: 2,
} as const

// ================================================================
// 审核目标类型
// ================================================================

export const AUDIT_TARGET_TYPE = {
  USER: 'user',
  PHOTO: 'photo',
  AVATAR: 'avatar',
  ANSWER: 'answer',
  VOICE: 'voice',
  USER_CREATE: 'user_create',
} as const

// ================================================================
// 支付结果
// ================================================================

export const PAY_RESULT = {
  SUCCESS: 'success',
  FAIL: 'fail',
} as const

// ================================================================
// 消息类型
// ================================================================

export const MSG_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  VOICE: 'voice',
  SYSTEM: 'system',
} as const

// ================================================================
// 动态类型
// ================================================================

export const DYNAMIC_TYPE = {
  PHOTO: 'photo',
  ANSWER: 'answer',
  TEXT: 'text',
} as const

// ================================================================
// 通知类型
// ================================================================

export const NOTICE_TYPE = {
  TASK: 'task',
  SYSTEM: 'system',
  POPUP: 'popup',
} as const

// ================================================================
// 协议类型
// ================================================================

export const AGREEMENT_TYPE = {
  USER: 'user',
  REAl_NAME: 'real_name',
  SINGLE: 'single',
  USER_AGREEMENT: 'USER_AGREEMENT',
  PRIVACY_POLICY: 'PRIVACY_POLICY',
} as const

// ================================================================
// 页面路由
// ================================================================

export const ROUTE = {
  // Tab 页
  INDEX: '/pages/index/index',
  DYNAMIC: '/pages/dynamic/index',
  MATCHMAKER: '/pages/matchmaker/index',
  CHAT: '/pages/chat/index',
  MY: '/pages/my/index',

  // 功能页
  LOGIN: '/pages/login/index',
  USER_DETAIL: '/pages/user-detail/index',
  EDIT_PROFILE: '/pages/edit-profile/index',
  BASIC_INFO: '/subpkg-pages/basic-info/index',
  VIP: '/pages/vip/index',
  ANSWER: '/subpkg-pages/answer/index',
  CONTACT_APPLY: '/pages/contact-apply/index',
  POSTER: '/pages/poster/index',
  AGREEMENT: '/pages/agreement/index',
  USER_AGREEMENT: '/pages/user-agreement/index',
  PRIVACY_POLICY: '/pages/privacy-policy/index',
  PRIVACY_SETTINGS: '/subpkg-pages/privacy-settings/index',
  REALNAME_AUTH: '/subpkg-pages/real-name-auth/index',
  REALNAME_AUTH_INPUT: '/subpkg-pages/realname-auth-input/index',

  // 我的
  MY_FOLLOWS: '/subpkg-pages/my-follows/index',
  MY_VISITORS: '/subpkg-pages/my-visitors/index',
  CIRCLE_POSTS: '/subpkg-pages/circle-posts/index',
  CIRCLE_PUBLISH: '/subpkg-pages/circle-publish/index',
  MESSAGE_LIST: '/pages/message-list/index',
  PAY_RESULT: '/pages/pay-result/index',
  SYSTEM_MESSAGES: '/subpkg-pages/system-messages/index',
  SINGLE_PROMISE: '/subpkg-pages/single-promise/index',

  // AI
  AI_QUIZ: '/subpkg-pages/ai-quiz/ai-quiz',

  // 管理后台
  ADMIN_AUDIT_LIST: '/pages/admin/audit/list',
} as const

// ================================================================
// LocalStorage Key
// ================================================================

export const STORAGE_KEY = {
  PHONE_CREDENTIAL: '_qys_pc',
  TOKEN: '_qys_tk',
  USER_INFO: '_qys_ui',
  REFRESH_TOKEN: '_qys_rt',
  UNLOCKED_TARGETS: 'unlocked_targets',
  SUBSCRIBE_ALWAYS_ALLOW: 'subscribe_always_allow',
  HAS_AGREED_PROTOCOL: 'hasAgreedProtocol',
  PROTOCOL_AGREED: 'protocolAgreed',
  UNREAD_MESSAGE_COUNT: 'unreadMessageCount',
  OA_BANNER_CLOSED: 'oa_banner_closed',
  SYSTEM_CONFIG: 'systemConfig',
  AI_FEATURE_CONFIG: 'aiFeatureConfig',
  API_BASE_URL: 'api_base_url',
  USER_NICKNAME: 'user_nickname',
  USER_PHONE: 'user_phone',
  USER_REAL_NAME: 'user_real_name',
  PRIVACY_AGREED: 'privacy_agreed',
  PRIVACY_AGREED_AT: 'privacy_agreed_at',
  AGREEMENT_CONTENT: 'agreement_content',
} as const

// ================================================================
// API 路径
// ================================================================

export const API_PATH = {
  LOGIN: '/users/login-by-code',
  UPLOAD: '/upload',
  UPLOAD_USER_VOICE: '/users/voice-intro',
  UPLOAD_SINGLE_PROMISE: '/single-promise/submit',
} as const

// ================================================================
// 业务限制
// ================================================================

/** 聊天消息最大字数 */
export const MAX_CHAT_MESSAGE_LENGTH = 500
/** 回答最大字数 */
export const MAX_ANSWER_LENGTH = 200
/** 举报理由最大字数 */
export const MAX_REPORT_LENGTH = 200
/** 发布内容最大字数 */
export const MAX_POST_LENGTH = 500
/** 反馈最大字数 */
export const MAX_FEEDBACK_LENGTH = 200
/** 身份证位数 */
export const ID_CARD_LENGTH = 18
/** 录音最大时长（秒） */
export const MAX_VOICE_DURATION = 10
/** 分页大小 */
export const PAGE_SIZE = 20
/** 小分页大小 */
export const PAGE_SIZE_SMALL = 10
/** 请求超时（毫秒） */
export const REQUEST_TIMEOUT = 5000
/** 聊天轮询间隔（毫秒） */
export const CHAT_POLL_INTERVAL = 2500
/** 免费消息条数 */
export const MAX_FREE_MESSAGES = 3
/** 每日消息上限 */
export const MAX_DAILY_MESSAGES = 3
