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
} as const
