/**
 * 小程序端不做本地加密。
 * Token 安全由后端 HTTPS 传输 + 短有效期 AccessToken + RefreshToken 机制保障。
 */
import { STORAGE_KEY } from '@/config/constants'

export const secureStorage = {
  // ===== Token =====
  setToken(t: string) {
    uni.setStorageSync(STORAGE_KEY.TOKEN, t)
  },
  getToken(): string {
    return uni.getStorageSync(STORAGE_KEY.TOKEN) || ''
  },
  removeToken() {
    uni.removeStorageSync(STORAGE_KEY.TOKEN)
  },

  // ===== 用户信息 =====
  setUserInfo(u: unknown) {
    uni.setStorageSync(STORAGE_KEY.USER_INFO, JSON.stringify(u))
  },
  getUserInfo(): unknown {
    try {
      const v = uni.getStorageSync(STORAGE_KEY.USER_INFO)
      return v ? JSON.parse(v) : null
    } catch {
      return null
    }
  },
  removeUserInfo() {
    uni.removeStorageSync(STORAGE_KEY.USER_INFO)
  },

  // ===== RefreshToken =====
  setRefreshToken(t: string) {
    uni.setStorageSync(STORAGE_KEY.REFRESH_TOKEN, t)
  },
  getRefreshToken(): string {
    return uni.getStorageSync(STORAGE_KEY.REFRESH_TOKEN) || ''
  },
  removeRefreshToken() {
    uni.removeStorageSync(STORAGE_KEY.REFRESH_TOKEN)
  },

  // ===== 协议同意（统一入口） =====
  setProtocolAgreed() {
    uni.setStorageSync(STORAGE_KEY.PROTOCOL_AGREED, true)
  },
  isProtocolAgreed(): boolean {
    return !!uni.getStorageSync(STORAGE_KEY.PROTOCOL_AGREED)
  },
  setPrivacyAgreed() {
    uni.setStorageSync(STORAGE_KEY.PRIVACY_AGREED, '1')
    uni.setStorageSync(STORAGE_KEY.PRIVACY_AGREED_AT, new Date().toISOString())
  },
  isPrivacyAgreed(): boolean {
    return !!uni.getStorageSync(STORAGE_KEY.PRIVACY_AGREED)
  },
  /** 撤回所有协议同意标记（撤回同意协议时调用） */
  revokeAllAgreements() {
    try {
      uni.removeStorageSync(STORAGE_KEY.PROTOCOL_AGREED)
      uni.removeStorageSync(STORAGE_KEY.HAS_AGREED_PROTOCOL)
      uni.removeStorageSync(STORAGE_KEY.PRIVACY_AGREED)
      uni.removeStorageSync(STORAGE_KEY.PRIVACY_AGREED_AT)
      uni.removeStorageSync(STORAGE_KEY.AGREEMENT_CONTENT)
    } catch (_) { /* ignore */ }
  },

  // ===== 清空全部 =====
  clearAll() {
    this.removeToken()
    this.removeUserInfo()
    this.removeRefreshToken()
  },
}
