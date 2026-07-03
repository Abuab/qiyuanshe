/**
 * 全项目共享枚举常量
 *
 * 所有硬编码的业务状态值统一在此定义，禁止在 Service/Controller 中直接使用魔法字符串或数字。
 * 实体级枚举仍可定义在 Entity 文件中，但跨模块使用的枚举必须在此统一管理。
 */

// ================================================================
// 管理员角色
// ================================================================

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  MATCHMAKER = 'matchmaker',
  OPERATOR = 'operator',
  READONLY = 'readonly',
}

/** 所有合法管理员角色列表（用于运行时校验） */
export const ALL_ADMIN_ROLES: string[] = Object.values(AdminRole)

// ================================================================
// 用户状态
// ================================================================

/** 用户账号状态（users.status） */
export enum UserStatus {
  /** 待审核（新注册未审核） */
  PENDING = 0,
  /** 正常 */
  NORMAL = 1,
  /** 未完善资料（不可被推荐） */
  INCOMPLETE = 2,
  /** 已禁用 */
  DISABLED = 3,
}

/** 用户删除标记 */
export enum UserDeletedFlag {
  NORMAL = 0,
  DELETED = 1,
}

// ================================================================
// 性别
// ================================================================

export enum Gender {
  UNKNOWN = 0,
  MALE = 1,
  FEMALE = 2,
}

// ================================================================
// 审核状态（通用三态）
// ================================================================

export enum AuditStatus {
  /** 待审核 */
  PENDING = 0,
  /** 已通过 */
  APPROVED = 1,
  /** 已拒绝 */
  REJECTED = 2,
}

/** 审核目标类型 */
export enum AuditTargetType {
  USER = 'user',
  PHOTO = 'photo',
  AVATAR = 'avatar',
  ANSWER = 'answer',
  VOICE = 'voice',
  USER_CREATE = 'user_create',
}

// ================================================================
// 支付 & 订单
// ================================================================

/** 支付流水状态（vip_orders.status） */
export enum VipOrderStatus {
  PENDING = 0,
  PAID = 1,
  REFUNDED = 2,
  CANCELLED = 3,
}

/** 支付方式 */
export enum PayType {
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  ADMIN = 'admin',
}

/** VIP 等级 */
export enum VipLevel {
  NORMAL = 0,
  GOLD = 1,
  DIAMOND = 2,
  SUPREME = 3,
}

// ================================================================
// 活动
// ================================================================

export enum ActivityStatus {
  DRAFT = 0,
  ONGOING = 1,
  ENDED = 2,
  CANCELLED = 3,
}

export enum ActivityType {
  LATEST = 'latest',
  ONLINE = 'online',
  CP = 'cp',
}

// ================================================================
// 匹配记录
// ================================================================

export enum MatchRecordStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
}

// ================================================================
// 消息类型
// ================================================================

export enum ChatMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VOICE = 'voice',
  SYSTEM = 'system',
}

// ================================================================
// AI 调用
// ================================================================

export enum AiCallType {
  MATCH = 'match',
  CHAT_SKILL = 'chat_skill',
  MATCHMAKER = 'matchmaker',
  FUN_QUIZ = 'fun_quiz',
  PROFILE_GEN = 'profile_gen',
}

export enum AiCallStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  TIMEOUT = 'timeout',
}

export enum AiSafetyFlag {
  UNCHECKED = 0,
  SAFE = 1,
  SUSPICIOUS = 2,
  CONFIRMED_VIOLATION = 3,
}

// ================================================================
// 动态
// ================================================================

export enum DynamicType {
  PHOTO = 'photo',
  ANSWER = 'answer',
  TEXT = 'text',
  /** 红娘匹配动态（从 match_records 查询，不存入 dynamics 表） */
  MATCHMAKER = 'matchmaker',
}

// ================================================================
// 单线承诺书
// ================================================================

export enum SinglePromiseStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
}

// ================================================================
// 曝光池
// ================================================================

export enum ExposurePool {
  CITY = 'city',
  PROVINCE = 'province',
  NATIONAL = 'national',
}

// ================================================================
// MFA 类型
// ================================================================

export enum MfaType {
  NONE = 'none',
  TOTP = 'totp',
  SMS = 'sms',
}
