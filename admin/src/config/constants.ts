/**
 * 管理后台全局常量
 * 所有硬编码的魔法字符串、数字、状态值统一在此管理。
 */

// ================================================================
// 管理员角色
// ================================================================

export const ADMIN_ROLE = {
  SUPER_ADMIN: 'super_admin',
  MATCHMAKER: 'matchmaker',
  OPERATOR: 'operator',
  READONLY: 'readonly',
} as const

export type AdminRole = (typeof ADMIN_ROLE)[keyof typeof ADMIN_ROLE]

/** 角色中文标签 */
export const ROLE_LABELS: Record<AdminRole, string> = {
  [ADMIN_ROLE.SUPER_ADMIN]: '超级管理员',
  [ADMIN_ROLE.MATCHMAKER]: '红娘',
  [ADMIN_ROLE.OPERATOR]: '运营',
  [ADMIN_ROLE.READONLY]: '只读',
}

// ================================================================
// 性别
// ================================================================

export const GENDER = {
  UNKNOWN: 0,
  MALE: 1,
  FEMALE: 2,
} as const

export const GENDER_LABELS: Record<number, string> = {
  0: '未知',
  1: '男',
  2: '女',
}

// ================================================================
// 审核状态
// ================================================================

export const AUDIT_STATUS = {
  UNSUBMITTED: 'unsubmitted',
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const

export const AUDIT_STATUS_LABELS: Record<string | number, string> = {
  unsubmitted: '未提交',
  0: '待审核',
  1: '已通过',
  2: '已拒绝',
}

// ================================================================
// 审核目标类型
// ================================================================

export const AUDIT_TARGET_TYPE = {
  USER: 'user',
  USER_CREATE: 'user_create',
  PHOTO: 'photo',
  AVATAR: 'avatar',
  ANSWER: 'answer',
  VOICE: 'voice',
} as const

// ================================================================
// 用户状态
// ================================================================

export const USER_STATUS = {
  PENDING: 0,
  NORMAL: 1,
  INCOMPLETE: 2,
  DISABLED: 3,
} as const

export const USER_STATUS_LABELS: Record<number, string> = {
  0: '禁用',
  1: '正常',
  2: '待审核',
  3: '已删除',
}

// ================================================================
// VIP 等级
// ================================================================

export const VIP_LEVEL = {
  NORMAL: 0,
  GOLD: 1,
  DIAMOND: 2,
  SUPREME: 3,
} as const

export const VIP_LEVEL_LABELS: Record<number, string> = {
  0: '普通',
  1: '黄金',
  2: '钻石',
  3: '至尊',
}

// ================================================================
// 支付流水状态
// ================================================================

export const VIP_ORDER_STATUS = {
  PENDING: 0,
  PAID: 1,
  REFUNDED: 2,
  CANCELLED: 3,
} as const

export const VIP_ORDER_STATUS_LABELS: Record<number, string> = {
  0: '待支付',
  1: '已支付',
  2: '已退款',
  3: '已取消',
}

// ================================================================
// 通知渠道
// ================================================================

export const NOTIFY_CHANNEL = {
  WECOM: 'wecom',
  FEISHU: 'feishu',
  DINGTALK: 'dingtalk',
} as const

export const NOTIFY_CHANNEL_LABELS: Record<string, string> = {
  wecom: '企业微信',
  feishu: '飞书',
  dingtalk: '钉钉',
}

// ================================================================
// 存储类型
// ================================================================

export const STORAGE_TYPE = {
  LOCAL: 'local',
  SLS: 'sls',
} as const

// ================================================================
// 本地存储 Key
// ================================================================

export const STORAGE_KEY = {
  ADMIN_TOKEN: 'admin_token',
  ADMIN_USER: 'admin_user',
  ADMIN_REMEMBER: 'admin_remember',
} as const

// ================================================================
// 业务限制
// ================================================================

export const PASSWORD_MIN_LENGTH = 6
export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20
export const CAPTCHA_LENGTH = 4
export const MAX_VIP_DAYS = 3650
export const BIRTH_YEAR_MIN = 1950
export const BIRTH_YEAR_MAX = 2010
export const MAX_CASE_PHOTOS = 9
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_UPLOAD_SIZE_ADMIN = 10 * 1024 * 1024 // 10MB
export const DEFAULT_PAGE_SIZE = 20
export const AI_RESULT_MIN_LENGTH = 40
export const TEXT_TRUNCATE_LENGTH = 100
export const TAG_DISPLAY_LIMIT = 3

// ================================================================
// 时间常量（毫秒）
// ================================================================

export const ONE_MINUTE_MS = 60000
export const ONE_HOUR_MS = 3600000
export const ONE_DAY_MS = 86400000
export const AUDIT_COUNT_POLL_INTERVAL = 60000
export const QUEUE_REFRESH_INTERVAL = 10000
