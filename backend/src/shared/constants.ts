/**
 * 全项目共享常量
 *
 * 所有魔法数字、业务规则参数、限制值统一在此定义。
 * 不可变的、非用户可配置的参数放这里；管理员可动态修改的参数放 SystemConfig 表。
 */

// ================================================================
// 密码加密
// ================================================================

/** bcrypt salt 轮数 */
export const BCRYPT_SALT_ROUNDS = 10

// ================================================================
// 分页
// ================================================================

/** 默认每页条数 */
export const DEFAULT_PAGE_SIZE = 20

/** 最大每页条数 */
export const MAX_PAGE_SIZE = 100

/** 小列表每页条数（如热门回答展示） */
export const SMALL_PAGE_SIZE = 10

// ================================================================
// 文件上传限制
// ================================================================

/** 图片最大上传大小（字节） */
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024 // 5MB

/** 小程序语音最大时长（秒） */
export const MAX_VOICE_DURATION_SEC = 10

// ================================================================
// 时间常量（毫秒）
// ================================================================

export const ONE_SECOND_MS = 1000
export const ONE_MINUTE_MS = 60 * ONE_SECOND_MS
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS
export const ONE_DAY_MS = 24 * ONE_HOUR_MS
export const ONE_WEEK_MS = 7 * ONE_DAY_MS
export const THIRTY_DAYS_MS = 30 * ONE_DAY_MS
export const ONE_YEAR_MS = 365 * ONE_DAY_MS

// ================================================================
// 请求超时（毫秒）
// ================================================================

/** API 请求默认超时 */
export const REQUEST_TIMEOUT_MS = 5000

/** 管理后台 axios 超时 */
export const ADMIN_REQUEST_TIMEOUT_MS = 30000

// ================================================================
// 聊天限制
// ================================================================

/** 聊天消息最大字数 */
export const MAX_CHAT_MESSAGE_LENGTH = 500

/** 聊天轮询间隔（毫秒） */
export const CHAT_POLL_INTERVAL_MS = 2500

// ================================================================
// 文本长度限制
// ================================================================

export const MAX_FEEDBACK_LENGTH = 200
export const MAX_ANSWER_LENGTH = 200
export const MAX_REPORT_LENGTH = 200
export const MAX_CIRCLE_POST_LENGTH = 500

// ================================================================
// 身份证
// ================================================================

export const ID_CARD_LENGTH = 18
