/**
 * 小程序端全局常量
 * 所有硬编码的魔法字符串、数字、状态值统一在此管理。
 */

// ================================================================
// LocalStorage Key
// ================================================================

export const STORAGE_KEY = {
  PHONE_CREDENTIAL: '_qys_pc',
  TOKEN: '_qys_tk',
  USER_INFO: '_qys_ui',
  REFRESH_TOKEN: '_qys_rt',
  HAS_AGREED_PROTOCOL: 'hasAgreedProtocol',
  PROTOCOL_AGREED: 'protocolAgreed',
  PRIVACY_AGREED: 'privacy_agreed',
  PRIVACY_AGREED_AT: 'privacy_agreed_at',
  AGREEMENT_CONTENT: 'agreement_content',
  // 未登录访客浏览用户详情的计数（H5 拉新转化漏斗）
  GUEST_VIEW_COUNT: '_qys_guest_view_count',
} as const

// ================================================================
// 未登录浏览限制
// ================================================================

/** 未登录访客免费浏览用户详情的次数上限（超过后弹出登录引导） */
export const GUEST_FREE_VIEW_LIMIT = 20

// ================================================================
// 第三方小程序 AppId
// ================================================================

/** 腾讯 E证通（eID 数字身份）小程序 AppId：用于跳转核身小程序，以及识别从核身返回的场景 */
export const EID_APPID = 'wx0e2cb0b052a91c92'
