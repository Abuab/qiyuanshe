const KEY = 'qiyuanshe_2024_secure_key'

function xor(s: string): string {
  let r = ''
  for (let i = 0; i < s.length; i++) {
    r += String.fromCharCode(s.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length))
  }
  return r
}

function toB64(s: string): string {
  try {
    return uni.arrayBufferToBase64(
      new Uint8Array(s.split('').map((c) => c.charCodeAt(0))).buffer,
    )
  } catch {
    // @ts-ignore fallback for non-uni env
    return btoa(unescape(encodeURIComponent(s)))
  }
}

function fromB64(s: string): string {
  try {
    const b = uni.base64ToArrayBuffer(s)
    return String.fromCharCode(...new Uint8Array(b))
  } catch {
    // @ts-ignore fallback for non-uni env
    return decodeURIComponent(escape(atob(s)))
  }
}

export const secureStorage = {
  setToken(t: string) {
    uni.setStorageSync('_qys_tk', toB64(xor(t)))
  },
  getToken(): string {
    try {
      const v = uni.getStorageSync('_qys_tk')
      return v ? xor(fromB64(v)) : ''
    } catch {
      return ''
    }
  },
  removeToken() {
    uni.removeStorageSync('_qys_tk')
  },

  setUserInfo(u: unknown) {
    uni.setStorageSync('_qys_ui', toB64(xor(JSON.stringify(u))))
  },
  getUserInfo(): unknown {
    try {
      const v = uni.getStorageSync('_qys_ui')
      return v ? JSON.parse(xor(fromB64(v))) : null
    } catch {
      return null
    }
  },
  removeUserInfo() {
    uni.removeStorageSync('_qys_ui')
  },

  setRefreshToken(t: string) {
    uni.setStorageSync('_qys_rt', toB64(xor(t)))
  },
  getRefreshToken(): string {
    try {
      const v = uni.getStorageSync('_qys_rt')
      return v ? xor(fromB64(v)) : ''
    } catch {
      return ''
    }
  },
  removeRefreshToken() {
    uni.removeStorageSync('_qys_rt')
  },

  setProtocolAgreed() {
    uni.setStorageSync('protocolAgreed', true)
  },
  isProtocolAgreed(): boolean {
    return !!uni.getStorageSync('protocolAgreed')
  },

  clearAll() {
    this.removeToken()
    this.removeUserInfo()
    this.removeRefreshToken()
  },
}
