<template>
  <view class="login-page">
    <!-- 粉色渐变背景 -->
    <view class="bg-pink" />

    <!-- 情侣插画 + 底部阴影 -->
    <view v-if="illustrationImg" class="illustration-area">
      <image
        :src="illustrationImg"
        mode="widthFix"
        class="illustration-img"
      />
      <view class="illustration-shadow" />
    </view>

    <!-- ===== 用户协议弹窗 ===== -->
    <view v-if="showProtocol" class="protocol-fullscreen">
      <view class="protocol-mask" />
      <view class="protocol-card">
        <text class="protocol-title">用户协议及隐私协议</text>

        <view class="protocol-body">
          <text class="protocol-p">
            欢迎使用{{ appName }}及相关服务。您需要同意
            <text class="link" @tap="openAgreement">《用户协议》</text>
            和
            <text class="link" @tap="openPrivacy">《隐私政策》</text>
            才可以继续使用，我们将严格按照您同意的各项条款保护您的个人信息，请点击同意以继续。
          </text>
        </view>

        <view class="protocol-actions">
          <view class="btn-agree" @tap="handleAgree">
            <text>同意</text>
          </view>
          <text class="btn-disagree" @tap="handleDisagree">不同意</text>
        </view>
      </view>
    </view>

    <!-- ===== 登录区域 ===== -->
    <view v-else class="login-area">
      <text class="login-tip-line1">需要授权手机号，以便于您下次直接登录</text>
      <text class="login-tip-line2">请放心，我们将严格保护您的隐私</text>

      <view class="login-buttons">
        <view class="btn-phone-quick" @tap="handlePhoneLogin">
          <text>手机号快捷登录</text>
        </view>
        <view class="btn-phone-code" @tap="handlePhoneCodeLogin">
          <text>手机验证码登录</text>
        </view>
      </view>

      <text class="skip-auth" @tap="handleSkipAuth">暂不授权</text>
    </view>

    <!-- 手机号快捷登录弹窗 -->
    <view v-if="showPhonePopup" class="phone-popup" @tap="handlePhonePopupClose">
      <view class="phone-mask" />
      <view class="phone-card" @tap.stop>
        <text class="phone-title">手机号登录</text>
        <text class="phone-desc">请先获取手机号授权</text>
        <button class="get-phone-btn" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
          获取手机号
        </button>
        <text class="phone-cancel" @tap="handlePhonePopupClose">取消</text>
      </view>
    </view>

    <!-- 加载遮罩 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-spinner" />
      <text class="loading-text">登录中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { post, get } from '@/utils/request'
import { showToast } from '@/utils/common'
import { logger } from '@/utils/logger'
import { secureStorage } from '@/utils/crypto'

interface LoginResult {
  user: any
  tokens: { accessToken: string; refreshToken: string; expiresIn: number }
}
interface WechatLoginResult { code: string; errMsg: string }

const userStore = useUserStore()
const systemStore = useSystemStore()
const appName = computed(() => systemStore.appName || '栖缘社')
const showProtocol = ref(false)
const showPhonePopup = ref(false)
const loading = ref(false)
const illustrationImg = ref('')

onMounted(async () => {
  await loadLoginConfig()
  checkLogin()
})

/** 加载登录页配置（插画） */
const loadLoginConfig = async () => {
  try {
    const res: any = await get('/system/config')
    if (res?.loginPageIllustration) {
      illustrationImg.value = res.loginPageIllustration
    }
  } catch {}
}

const checkLogin = () => {
  if (userStore.isLoggedIn) {
    // 已登录用户直接进首页，不弹协议弹窗（后端已有协议记录）
    handleLoginSuccess()
    return
  }
  // 未登录用户检查是否已同意协议（uniStorage + 本地缓存兜底）
  const hasAgreed = uni.getStorageSync('hasAgreedProtocol') === true
  if (!hasAgreed && !secureStorage.isProtocolAgreed()) {
    showProtocol.value = true
  }
}

const handleAgree = () => {
  uni.setStorageSync('hasAgreedProtocol', true)
  secureStorage.setProtocolAgreed()
  showProtocol.value = false
  // 上报同意记录到后端
  post('/users/agreement', {
    agreementType: 'USER_AGREEMENT',
    version: '1.0',
    action: 'agree',
  }).catch((err: any) => {
    console.error('[agreement] 协议同意上报失败:', err?.message || err)
  })
}

const handleDisagree = () => {
  showProtocol.value = false
  uni.switchTab({ url: '/pages/index/index' })
}

const handleSkipAuth = () => {
  showProtocol.value = false
  showPhonePopup.value = false
  uni.switchTab({ url: '/pages/index/index' })
}

const openAgreement = () => {
  uni.navigateTo({ url: '/pages/agreement/index?type=user' })
}
const openPrivacy = () => {
  uni.navigateTo({ url: '/pages/agreement/index?type=privacy' })
}

const handlePhoneLogin = () => {
  if (!secureStorage.isProtocolAgreed()) {
    showProtocol.value = true
    return
  }
  showPhonePopup.value = true
}

const handlePhoneCodeLogin = () => {
  if (!secureStorage.isProtocolAgreed()) {
    showProtocol.value = true
    return
  }
  // 手机验证码登录：先获取微信授权码，再跳转验证码页面
  performWechatLogin()
}

const handlePhonePopupClose = () => {
  showPhonePopup.value = false
}

/** 采集设备信息，作为 UserAgent 记录（小程序请求不携带浏览器 UA） */
const getDeviceInfo = (): string => {
  try {
    const s = uni.getSystemInfoSync()
    const parts = [
      [s.brand, s.model].filter(Boolean).join(' '),
      s.system,
      s.version ? `WeChat/${s.version}` : '',
      s.SDKVersion ? `SDK/${s.SDKVersion}` : '',
    ].filter(Boolean)
    return parts.join('; ')
  } catch {
    return ''
  }
}

/** 微信授权 → 后端登录 */
const performWechatLogin = async () => {
  try {
    loading.value = true
    const loginRes = await new Promise<WechatLoginResult>((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginRes.code) throw new Error('微信登录失败')

    const result = await post<LoginResult>('/auth/wechat-login', { code: loginRes.code, deviceInfo: getDeviceInfo() })
    if (result?.user && result?.tokens) {
      const profileComplete = result.user.isProfileComplete !== false
      userStore.login(result.tokens.accessToken, result.user, profileComplete)
      if (result.tokens.refreshToken) secureStorage.setRefreshToken(result.tokens.refreshToken)
      showToast('登录成功', 'success')
      handleLoginSuccess()
    } else {
      throw new Error('登录响应数据异常')
    }
  } catch (error: any) {
    logger.error('微信登录失败:', error)
    showToast(error.message || '登录失败，请重试', 'none')
  } finally { loading.value = false }
}

/** 获取手机号回调 */
const onGetPhoneNumber = async (e: any) => {
  if (e.detail.errMsg !== 'getPhoneNumber:ok') {
    showToast('获取手机号失败', 'none')
    return
  }
  showPhonePopup.value = false
  loading.value = true
  try {
    const loginRes = await new Promise<WechatLoginResult>((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    const result = await post<LoginResult>('/auth/phone-login', {
      code: loginRes.code,
      encryptedData: e.detail.encryptedData,
      iv: e.detail.iv,
      deviceInfo: getDeviceInfo(),
    })
    if (result?.user && result?.tokens) {
      const profileComplete = result.user.isProfileComplete !== false
      userStore.login(result.tokens.accessToken, result.user, profileComplete)
      if (result.tokens.refreshToken) secureStorage.setRefreshToken(result.tokens.refreshToken)
      showToast('登录成功', 'success')
      handleLoginSuccess()
    }
  } catch (error: any) {
    logger.error('手机号登录失败:', error)
    showToast(error.message || '登录失败，请重试', 'none')
  } finally { loading.value = false }
}

const handleLoginSuccess = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  position: relative;
  display: flex; flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  /* 刘海屏 / 灵动岛安全区适配 */
  --safe-area-top: constant(safe-area-inset-top);
  --safe-area-top: env(safe-area-inset-top);
  --safe-area-bottom: constant(safe-area-inset-bottom);
  --safe-area-bottom: env(safe-area-inset-bottom);
  padding-top: var(--safe-area-top);
  padding-bottom: var(--safe-area-bottom);
  box-sizing: border-box;
}

// ===== 粉色渐变背景 =====
.bg-pink {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, #FFF0F5 0%, #FFF8FA 60%, #FFF8FA 100%);
  z-index: -1;
}

// ===== 情侣插画 =====
.illustration-area {
  width: 100%; display: flex; flex-direction: column; align-items: center;
  padding-top: 60rpx; margin-bottom: 30rpx;
}
.illustration-img { width: 480rpx; display: block; }
.illustration-shadow {
  width: 340rpx; height: 20rpx;
  background: radial-gradient(ellipse, rgba(255,107,138,0.15), transparent);
  border-radius: 50%; margin-top: -10rpx;
}

// ===== 协议弹窗 =====
.protocol-fullscreen {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000;
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 30vh;
}
.protocol-mask {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
}
.protocol-card {
  position: relative; z-index: 1;
  width: 620rpx;
  background: #fff; border-radius: 24rpx;
  padding: 40rpx 0 0;
  display: flex; flex-direction: column; align-items: center;
}
.protocol-title {
  font-size: 32rpx; font-weight: 700; color: #333333;
  text-align: center; margin-bottom: 24rpx;
}
.protocol-body {
  padding: 0 48rpx; margin-bottom: 40rpx;
}
.protocol-p {
  font-size: 26rpx; color: #666666; line-height: 1.8; text-align: center;
}
.link {
  color: #3B82F6;
}
.protocol-actions {
  width: 100%; display: flex; flex-direction: column; align-items: center;
  padding: 0 48rpx 40rpx; gap: 24rpx; box-sizing: border-box;
}
.btn-agree {
  width: 100%; height: 88rpx;
  background: #FF4D6A; border-radius: 48rpx;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 32rpx; color: #fff; font-weight: 600; }
  &:active { opacity: 0.85; }
}
.btn-disagree {
  font-size: 28rpx; color: #999; text-decoration: underline;
}

// ===== 登录区域 =====
.login-area {
  width: 85%; max-width: 640rpx;
  display: flex; flex-direction: column; align-items: center;
  padding-top: 20rpx;
}
.login-tip-line1 {
  font-size: 28rpx; color: #666; text-align: center; margin-bottom: 12rpx;
}
.login-tip-line2 {
  font-size: 24rpx; color: #999; text-align: center; margin-bottom: 56rpx;
}
.login-buttons {
  width: 100%; display: flex; flex-direction: column; gap: 24rpx;
  margin-bottom: 48rpx;
}
.btn-phone-quick {
  width: 100%; height: 96rpx;
  background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
  border-radius: 48rpx;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 32rpx; color: #fff; font-weight: 600; }
  &:active { opacity: 0.85; }
}
.btn-phone-code {
  width: 100%; height: 96rpx;
  background: #fff; border: 2rpx solid #FF6B8A;
  border-radius: 48rpx;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 30rpx; color: #FF6B8A; font-weight: 500; }
  &:active { background: #FFF0F5; }
}

// ===== 暂不授权 =====
.skip-auth {
  font-size: 26rpx; color: #999; text-decoration: underline;
  text-align: center;
}

// ===== 手机号弹窗 =====
.phone-popup {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1100;
  display: flex; align-items: center; justify-content: center;
}
.phone-mask {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
}
.phone-card {
  position: relative; width: 600rpx;
  background: #fff; border-radius: 24rpx;
  padding: 48rpx 40rpx;
  display: flex; flex-direction: column; align-items: center;
}
.phone-title {
  font-size: 34rpx; font-weight: 700; color: #1A1A1A; margin-bottom: 12rpx;
}
.phone-desc {
  font-size: 26rpx; color: #999; margin-bottom: 40rpx;
}
.get-phone-btn {
  width: 100%; height: 88rpx;
  background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
  border-radius: 44rpx; border: none;
  color: #fff; font-size: 32rpx; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  &::after { border: none; }
  &:active { opacity: 0.85; }
}
.phone-cancel {
  font-size: 28rpx; color: #999; margin-top: 28rpx; text-decoration: underline;
}

// ===== 加载遮罩 =====
.loading-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 2000;
  background: rgba(0,0,0,0.4);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.loading-spinner {
  width: 60rpx; height: 60rpx;
  border: 4rpx solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 28rpx; color: #fff; margin-top: 20rpx; }
</style>
