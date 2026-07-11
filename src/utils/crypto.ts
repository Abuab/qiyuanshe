/**
 * 小程序端不做本地加密。
 * Token 安全由后端 HTTPS 传输 + 短有效期 AccessToken + RefreshToken 机制保障。
 * 此处直接明文存取 uni storage，接口签名保持与历史版本兼容。
 */

export const secureStorage = {
  // ===== Token =====
  setToken(t: string) {
    uni.setStorageSync('_qys_tk', t)
  },
  getToken(): string {
    return uni.getStorageSync('_qys_tk') || ''
  },
  removeToken() {
    uni.removeStorageSync('_qys_tk')
  },

  // ===== 用户信息 =====
  setUserInfo(u: unknown) {
    uni.setStorageSync('_qys_ui', JSON.stringify(u))
  },
  getUserInfo(): unknown {
    try {
      const v = uni.getStorageSync('_qys_ui')
      return v ? JSON.parse(v) : null
    } catch {
      return null
    }
  },
  removeUserInfo() {
    uni.removeStorageSync('_qys_ui')
  },

  // ===== RefreshToken =====
  setRefreshToken(t: string) {
    uni.setStorageSync('_qys_rt', t)
  },
  getRefreshToken(): string {
    return uni.getStorageSync('_qys_rt') || ''
  },
  removeRefreshToken() {
    uni.removeStorageSync('_qys_rt')
  },

  // ===== 协议同意（统一入口） =====
  setProtocolAgreed() {
    uni.setStorageSync('protocolAgreed', true)
  },
  isProtocolAgreed(): boolean {
    return !!uni.getStorageSync('protocolAgreed')
  },
  setPrivacyAgreed() {
    uni.setStorageSync('privacy_agreed', '1')
    uni.setStorageSync('privacy_agreed_at', new Date().toISOString())
  },
  isPrivacyAgreed(): boolean {
    return !!uni.getStorageSync('privacy_agreed')
  },
  /** 撤回所有协议同意标记（撤回同意协议时调用） */
  revokeAllAgreements() {
    try {
      uni.removeStorageSync('protocolAgreed')
      uni.removeStorageSync('hasAgreedProtocol')
      uni.removeStorageSync('privacy_agreed')
      uni.removeStorageSync('privacy_agreed_at')
      uni.removeStorageSync('agreement_content')
    } catch (_) { /* ignore */ }
  },

  // ===== 清空全部 =====
  clearAll() {
    this.removeToken()
    this.removeUserInfo()
    this.removeRefreshToken()
  },
}
