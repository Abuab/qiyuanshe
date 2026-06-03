<template>
  <view class="login-page">
    <view class="background"></view>

    <view class="content">
      <view class="logo-section">
        <view class="logo-circle">💕</view>
        <text class="app-name">栖缘社</text>
        <text class="slogan">遇见对的TA</text>
      </view>

      <view v-if="showProtocol" class="protocol-popup">
        <view class="protocol-overlay" @tap="handleProtocolClose"></view>
        <view class="protocol-card">
          <view class="protocol-header">
            <text class="protocol-title">用户协议与隐私政策</text>
          </view>

          <scroll-view class="protocol-content" scroll-y>
            <text class="protocol-text">
              欢迎使用产品及相关服务。

              您需要同意《用户协议》和《隐私政策》才可以继续使用，我们将严格按照您同意的各项条款保护您的个人信息，请点击同意以继续。

              【用户协议】

              一、服务说明
              栖缘社是一款婚恋交友平台，旨在帮助用户找到合适的伴侣。我们不对用户发布的内容真实性负责，请用户自行判断。

              二、用户注册
              1. 您需要提供真实的个人信息进行注册
              2. 您必须年满18周岁方可使用本服务
              3. 您需对账户安全负责，因个人原因导致的账户被盗用，责任自负

              三、用户行为
              1. 不得发布虚假信息、诈骗信息
              2. 不得骚扰、辱骂其他用户
              3. 不得发布违法、违规内容
              4. 不得利用本平台进行商业营销

              四、隐私保护
              我们承诺保护您的个人信息，不会未经您的同意向第三方透露您的个人信息。

              【隐私政策】

              一、信息收集
              1. 我们会收集您主动提供的信息（手机号、头像等）
              2. 我们会收集您使用服务时自动产生的信息（登录日志、操作记录等）
              3. 我们会获取您的地理位置信息用于匹配功能

              二、信息使用
              1. 用于提供和改进我们的服务
              2. 用于向您推送个性化内容
              3. 用于账号安全保护

              三、信息共享
              未经您的同意，我们不会与任何第三方共享您的个人信息，法律要求除外。

              四、信息安全
              我们采用行业标准的安全措施保护您的个人信息。
            </text>
          </scroll-view>

          <view class="protocol-buttons">
            <button class="btn-agree" @tap="handleAgree">同意</button>
            <button class="btn-disagree" @tap="handleProtocolClose">不同意</button>
          </view>
        </view>
      </view>

      <view v-if="!showProtocol" class="login-buttons">
        <button class="btn-wechat" @tap="handleWechatLogin">
          <text class="wechat-icon-text">微</text>
          <text>微信一键登录</text>
        </button>

        <view class="divider">
          <view class="divider-line"></view>
          <text class="divider-text">其他登录方式</text>
          <view class="divider-line"></view>
        </view>

        <button class="btn-phone" @tap="handlePhoneLogin">
          <text>手机验证码登录</text>
        </button>

        <view class="skip-link">
          <text @tap="handleSkip">暂不授权</text>
        </view>
      </view>

      <view class="phone-popup" v-if="showPhonePopup">
        <view class="phone-overlay" @tap="handlePhonePopupClose"></view>
        <view class="phone-card">
          <view class="phone-header">
            <text class="phone-title">手机号登录</text>
            <text class="phone-desc">请先获取手机号授权</text>
          </view>

          <button class="btn-get-phone" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
            获取手机号
          </button>

          <button class="btn-cancel" @tap="handlePhonePopupClose">取消</button>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading-mask">
      <view class="loading-spinner"></view>
      <text class="loading-text">登录中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { post } from '@/utils/request'
import { showToast } from '@/utils/common'

interface LoginResult {
  user: any
  tokens: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
}

interface WechatLoginResult {
  code: string
  errMsg: string
}

const userStore = useUserStore()
const showProtocol = ref(false)
const showPhonePopup = ref(false)
const loading = ref(false)
const pendingCallback = ref<(() => void) | null>(null)

onMounted(() => {
  checkLogin()
})

const checkLogin = () => {
  if (userStore.isLoggedIn) {
    handleLoginSuccess()
  } else {
    // 检查是否已同意协议
    const protocolAgreed = uni.getStorageSync('protocolAgreed')
    if (!protocolAgreed) {
      showProtocol.value = true
    }
  }
}

const handleAgree = async () => {
  showProtocol.value = false
  // 记录用户已同意协议
  uni.setStorageSync('protocolAgreed', true)
  await performWechatLogin()
}

const handleProtocolClose = () => {
  showProtocol.value = false
}

const handleWechatLogin = () => {
  showProtocol.value = true
}

const performWechatLogin = async () => {
  try {
    loading.value = true

    const loginRes = await new Promise<WechatLoginResult>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject,
      })
    })

    if (!loginRes.code) {
      throw new Error('微信登录失败')
    }

    const result = await post<LoginResult>('/auth/wechat-login', {
      code: loginRes.code,
    })

    if (result && result.user && result.tokens) {
      userStore.login(result.tokens.accessToken, result.user)

      if (result.tokens.refreshToken) {
        uni.setStorageSync('refreshToken', result.tokens.refreshToken)
      }

      showToast('登录成功', 'success')
      handleLoginSuccess()
    } else {
      throw new Error('登录响应数据异常')
    }
  } catch (error: any) {
    console.error('微信登录失败:', error)
    showToast(error.message || '登录失败，请重试', 'none')
  } finally {
    loading.value = false
  }
}

const handlePhoneLogin = () => {
  showPhonePopup.value = true
}

const handlePhonePopupClose = () => {
  showPhonePopup.value = false
}

const onGetPhoneNumber = async (e: any) => {
  if (e.detail.errMsg !== 'getPhoneNumber:ok') {
    showToast('获取手机号失败', 'none')
    return
  }

  showPhonePopup.value = false
  loading.value = true

  try {
    const loginRes = await new Promise<WechatLoginResult>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject,
      })
    })

    const result = await post<LoginResult>('/auth/phone-login', {
      code: loginRes.code,
      encryptedData: e.detail.encryptedData,
      iv: e.detail.iv,
    })

    if (result && result.user && result.tokens) {
      userStore.login(result.tokens.accessToken, result.user)

      if (result.tokens.refreshToken) {
        uni.setStorageSync('refreshToken', result.tokens.refreshToken)
      }

      showToast('登录成功', 'success')
      handleLoginSuccess()
    }
  } catch (error: any) {
    console.error('手机号登录失败:', error)
    showToast(error.message || '登录失败，请重试', 'none')
  } finally {
    loading.value = false
  }
}

const handleSkip = () => {
  uni.switchTab({
    url: '/pages/index/index',
  })
}

const handleLoginSuccess = () => {
  const pages = getCurrentPages()
  const prevPage = pages.length > 1 ? pages[pages.length - 2] : null

  if (prevPage) {
    uni.navigateBack()
  } else {
    uni.switchTab({
      url: '/pages/index/index',
    })
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  position: relative;
}

.background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #FFF5F7 0%, #FFE4ED 100%);
  z-index: -1;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 100rpx;
}

.logo-circle {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B9D, #FF8FB0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.app-name {
  font-size: 48rpx;
  font-weight: bold;
  color: var(--primary);
  margin-bottom: 16rpx;
}

.slogan {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.protocol-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.protocol-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.protocol-card {
  position: relative;
  width: 640rpx;
  max-height: 80vh;
  background-color: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  margin: 40rpx;
}

.protocol-header {
  padding: 40rpx 32rpx 24rpx;
  text-align: center;
}

.protocol-title {
  font-size: 36rpx;
  font-weight: bold;
  color: var(--text);
}

.protocol-content {
  padding: 0 32rpx;
  max-height: 50vh;
}

.protocol-text {
  font-size: 26rpx;
  color: var(--text);
  line-height: 1.8;
}

.protocol-buttons {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.btn-agree {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: var(--primary);
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  border: none;

  &:active {
    background-color: var(--primary-light);
  }
}

.btn-disagree {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 28rpx;
  border: none;
}

.login-buttons {
  width: 640rpx;
  padding: 0 32rpx;
}

.btn-wechat {
  width: 100%;
  height: 96rpx;
  background-color: #07C160;
  color: #fff;
  font-size: 32rpx;
  border-radius: 48rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;

  &:active {
    background-color: #06a050;
  }
}

.wechat-icon-text {
  width: 48rpx;
  height: 48rpx;
  line-height: 48rpx;
  text-align: center;
  background-color: #07C160;
  color: #fff;
  border-radius: 50%;
  font-size: 28rpx;
  font-weight: bold;
  margin-right: 12rpx;
}

.divider {
  display: flex;
  align-items: center;
  margin: 48rpx 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background-color: #eee;
}

.divider-text {
  padding: 0 24rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
}

.btn-phone {
  width: 100%;
  height: 96rpx;
  background-color: #fff;
  color: var(--primary);
  font-size: 32rpx;
  border-radius: 48rpx;
  border: 2px solid var(--primary);

  &:active {
    background-color: var(--bg);
  }
}

.skip-link {
  margin-top: 32rpx;
  text-align: center;
}

.skip-link text {
  font-size: 26rpx;
  color: var(--text-secondary);
  text-decoration: underline;
}

.phone-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.phone-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.phone-card {
  position: relative;
  width: 600rpx;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
}

.phone-header {
  text-align: center;
  margin-bottom: 48rpx;
}

.phone-title {
  font-size: 36rpx;
  font-weight: bold;
  color: var(--text);
  display: block;
  margin-bottom: 16rpx;
}

.phone-desc {
  font-size: 26rpx;
  color: var(--text-secondary);
}

.btn-get-phone {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: var(--primary);
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  border: none;
  margin-bottom: 24rpx;

  &:active {
    background-color: var(--primary-light);
  }
}

.btn-cancel {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #f5f5f5;
  color: var(--text);
  font-size: 32rpx;
  border-radius: 44rpx;
  border: none;

  &:active {
    background-color: #eee;
  }
}

.loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  margin-top: 24rpx;
  color: #fff;
  font-size: 28rpx;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
