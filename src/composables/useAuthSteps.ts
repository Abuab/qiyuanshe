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

export function goAuthWechat() {
  uni.showToast({ title: '请先完成微信登录', icon: 'none' })
}

export function goAuthPhone() {
  uni.navigateTo({ url: '/pages/auth-phone/auth-phone' })
}

export function goRealNameAuth() {
  uni.navigateTo({ url: '/pages/real-name-auth/real-name-auth' })
}
