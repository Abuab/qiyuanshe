import { ref } from 'vue'

export const authSteps = ref({
  wechat: false,
  phone: false,
  realName: false,
})

export function initAuthSteps() {
  const storedNickname = uni.getStorageSync('user_nickname')
  const storedPhone = uni.getStorageSync('user_phone')
  const storedRealName = uni.getStorageSync('user_real_name')

  authSteps.value.wechat = !!storedNickname
  authSteps.value.phone = !!storedPhone
  authSteps.value.realName = !!(storedRealName === '1')
}

/** 微信授权：弹出用户授权弹窗，获取昵称头像 */
export function goAuthWechat() {
  // #ifdef MP-WEIXIN
  uni.getUserProfile({
    desc: '用于完善用户资料',
    success: (res) => {
      const nickName = res.userInfo?.nickName
      if (nickName) {
        uni.setStorageSync('user_nickname', nickName)
        authSteps.value.wechat = true
        uni.showToast({ title: '授权成功', icon: 'success' })
        // 通知全局更新用户信息
        uni.$emit('userProfileUpdated')
      }
    },
    fail: (err: any) => {
      console.error('getUserProfile fail:', err)
      uni.showToast({ title: '授权已取消', icon: 'none' })
    }
  })
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在小程序端完成微信授权', icon: 'none' })
  // #endif
}

/** 手机绑定：已登录则跳转编辑资料页修改手机号，未登录则跳转登录页 */
export function goAuthPhone() {
  // 检查是否已登录
  const token = uni.getStorageSync('token')
  if (token) {
    // 已登录用户 → 编辑资料页可修改手机号
    uni.navigateTo({ url: '/pages/edit-profile/index' })
  } else {
    uni.navigateTo({ url: '/pages/login/index' })
  }
}

/** 实名认证：跳转至实名认证页面 */
export function goRealNameAuth() {
  uni.navigateTo({ url: '/subpkg-pages/realname-auth/index' })
}

/** 刷新认证状态（登录后/绑定手机后调用） */
export function refreshAuthSteps() {
  initAuthSteps()
}
