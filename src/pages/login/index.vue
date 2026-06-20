<template>
  <view class="login-page">
    <!-- 粉色渐变背景 -->
    <view class="bg-layer" />

    <view class="content-wrap">
      <!-- 插画区 -->
      <view class="illustration-area">
        <image
          v-if="loginIllustration"
          :src="loginIllustration"
          mode="aspectFit"
          class="login-illustration"
        />
        <view v-else class="default-illustration">
          <view class="couple-scene">
            <view class="heart-float heart-1">💕</view>
            <view class="heart-float heart-2">💗</view>
            <view class="heart-float heart-3">💖</view>
            <text class="couple-emoji">👫</text>
          </view>
          <view class="plant-deco plant-left">🌿</view>
          <view class="plant-deco plant-right">🌸</view>
        </view>
      </view>

      <!-- 提示文字 -->
      <view class="hint-area">
        <text class="hint-text">需要授权手机号，以便于您下次直接登录</text>
        <text class="hint-sub">请放心，我们将严格保护您的隐私</text>
      </view>

      <!-- 登录按钮 -->
      <view class="login-buttons">
        <button class="btn-phone-primary" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
          <text>手机号快捷登录</text>
        </button>
        <view class="btn-phone-secondary" @tap="showPhoneCode">
          <text>手机验证码登录</text>
        </view>
      </view>

      <!-- 底部 -->
      <view class="skip-area">
        <text class="skip-link" @tap="handleSkip">暂不授权</text>
      </view>
    </view>

    <!-- 协议弹窗 -->
    <protocol-popup
      :show="showProtocol"
      @update:show="showProtocol = $event"
      @agree="onProtocolAgree"
      @close="handleProtocolClose"
      @navigate="handleProtocolNavigate"
    />

    <!-- 验证码登录弹窗 -->
    <view v-if="showPhonePopup" class="phone-popup">
      <view class="phone-overlay" @tap="showPhonePopup = false" />
      <view class="phone-card">
        <text class="phone-title">手机验证码登录</text>
        <view class="phone-input-row">
          <input
            v-model="phoneNumber"
            class="phone-input"
            type="number"
            maxlength="11"
            placeholder="请输入手机号"
          />
        </view>
        <view class="code-row">
          <input
            v-model="phoneCode"
            class="code-input"
            type="number"
            maxlength="6"
            placeholder="验证码"
          />
          <view class="code-btn" :class="{ disabled: codeSending || countdown > 0 }" @tap="sendCode">
            <text v-if="countdown > 0">{{ countdown }}s</text>
            <text v-else>获取验证码</text>
          </view>
        </view>
        <button class="btn-code-login" :loading="codeLoading" @tap="handleCodeLogin">
          登录
        </button>
        <text class="code-cancel" @tap="showPhonePopup = false">取消</text>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-spinner" />
      <text class="loading-text">登录中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { post } from '@/utils/request'
import { logger } from '@/utils/logger'
import { secureStorage } from '@/utils/crypto'
import ProtocolPopup from '@/components/protocol-popup/protocol-popup.vue'

interface LoginResult {
  user: any
  tokens: { accessToken: string; refreshToken: string; expiresIn: number }
}

const userStore = useUserStore()
const systemStore = useSystemStore()
const showProtocol = ref(false)
const showPhonePopup = ref(false)
const loading = ref(false)
const phoneNumber = ref('')
const phoneCode = ref('')
const codeSending = ref(false)
const codeLoading = ref(false)
const countdown = ref(0)
const hasAgreed = ref(false)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const loginIllustration = ref('')

onMounted(() => {
  loginIllustration.value = systemStore.loginIllustration || ''
  // 检查是否已同意协议
  if (uni.getStorageSync('hasAgreedProtocol')) {
    hasAgreed.value = true
  } else {
    // 首次进入显示协议弹窗
    showProtocol.value = true
  }
})

const onProtocolAgree = () => {
  hasAgreed.value = true
  // 协议同意后显示登录按钮（通过 hasAgreed 控制）
}

const handleProtocolClose = () => {
  showProtocol.value = false
}

const handleProtocolNavigate = (url: string) => {
  uni.navigateTo({ url })
}

// ========== 手机号快捷登录 ==========
const onGetPhoneNumber = async (e: any) => {
  if (e.detail.errMsg !== 'getPhoneNumber:ok') {
    return
  }
  if (!hasAgreed.value) {
    showProtocol.value = true
    return
  }
  loading.value = true
  try {
    const loginRes = await new Promise<any>((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    const result = await post<LoginResult>('/auth/phone-login', {
      code: loginRes.code,
      encryptedData: e.detail.encryptedData,
      iv: e.detail.iv,
    })
    if (result?.user && result?.tokens) {
      userStore.login(result.tokens.accessToken, result.user)
      if (result.tokens.refreshToken) secureStorage.setRefreshToken(result.tokens.refreshToken)
      uni.showToast({ title: '登录成功', icon: 'success' })
      uni.navigateBack({ delta: 1 })
    }
  } catch (error: any) {
    logger.error('手机号登录失败:', error)
    uni.showToast({ title: error?.message || '登录失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// ========== 验证码登录 ==========
const showPhoneCode = () => {
  if (!hasAgreed.value) {
    showProtocol.value = true
    return
  }
  showPhonePopup.value = true
}

const sendCode = async () => {
  if (codeSending.value || countdown.value > 0) return
  if (!/^1\d{10}$/.test(phoneNumber.value)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  codeSending.value = true
  try {
    await post('/auth/send-code', { phone: phoneNumber.value })
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(countdownTimer!)
        countdownTimer = null
      }
    }, 1000)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
  } finally {
    codeSending.value = false
  }
}

const handleCodeLogin = async () => {
  if (!/^1\d{10}$/.test(phoneNumber.value)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (!phoneCode.value.trim()) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  codeLoading.value = true
  try {
    const loginRes = await new Promise<any>((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    const result = await post<LoginResult>('/auth/code-login', {
      code: loginRes.code,
      phone: phoneNumber.value,
      verifyCode: phoneCode.value,
    })
    if (result?.user && result?.tokens) {
      userStore.login(result.tokens.accessToken, result.user)
      if (result.tokens.refreshToken) secureStorage.setRefreshToken(result.tokens.refreshToken)
      uni.showToast({ title: '登录成功', icon: 'success' })
      uni.navigateBack({ delta: 1 })
    }
  } catch (error: any) {
    logger.error('验证码登录失败:', error)
    uni.showToast({ title: error?.message || '登录失败', icon: 'none' })
  } finally {
    codeLoading.value = false
  }
}

const handleSkip = () => {
  uni.navigateBack({ delta: 1 })
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh; position: relative;
  overflow: hidden;
}

.bg-layer {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, #FFF0F5 0%, #FFF8FA 60%, #FFF 100%);
  z-index: -1;
}

.content-wrap {
  display: flex; flex-direction: column; align-items: center;
  padding: 120rpx 48rpx 0;
}

// ========== 插画 ==========
.illustration-area {
  width: 520rpx; height: 460rpx;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 40rpx;
}
.login-illustration { width: 100%; height: 100%; }

.default-illustration {
  position: relative; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.couple-scene { position: relative; display: flex; align-items: center; justify-content: center; }
.couple-emoji { font-size: 160rpx; }

.heart-float { position: absolute; font-size: 48rpx; }
.heart-1 { top: -40rpx; left: -30rpx; animation: floatHeart 2.5s ease-in-out infinite; }
.heart-2 { top: 20rpx; right: -50rpx; animation: floatHeart 3s ease-in-out infinite 0.5s; }
.heart-3 { bottom: -20rpx; left: -20rpx; animation: floatHeart 2.8s ease-in-out infinite 1s; }
@keyframes floatHeart {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-16rpx) scale(1.1); }
}
.plant-deco { position: absolute; font-size: 60rpx; }
.plant-left { bottom: 20rpx; left: 40rpx; }
.plant-right { bottom: 10rpx; right: 40rpx; }

// ========== 提示文字 ==========
.hint-area {
  display: flex; flex-direction: column; align-items: center;
  margin-bottom: 48rpx;
}
.hint-text { font-size: 28rpx; color: #666; }
.hint-sub { font-size: 24rpx; color: #999; margin-top: 8rpx; }

// ========== 登录按钮 ==========
.login-buttons {
  width: 85vw; max-width: 600rpx;
  display: flex; flex-direction: column; align-items: center;
  gap: 24rpx;
}

.btn-phone-primary {
  width: 100%; height: 96rpx;
  background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
  border-radius: 999rpx; border: none;
  display: flex; align-items: center; justify-content: center;
  &::after { border: none; }
  text { font-size: 32rpx; color: #fff; font-weight: 600; }
}

.btn-phone-secondary {
  width: 100%; height: 96rpx;
  background: #fff; border-radius: 999rpx;
  border: 2rpx solid #FF6B8A;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 32rpx; color: #FF6B8A; font-weight: 600; }
}

// ========== 底部 ==========
.skip-area { margin-top: 48rpx; }
.skip-link { font-size: 26rpx; color: #999; text-decoration: underline; }

// ========== 验证码弹窗 ==========
.phone-popup {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.phone-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
}
.phone-card {
  position: relative; width: 85vw; max-width: 600rpx;
  background: #fff; border-radius: 24rpx;
  padding: 48rpx 40rpx 36rpx;
  display: flex; flex-direction: column; align-items: center;
}
.phone-title { font-size: 34rpx; font-weight: 700; color: #1A1A1A; margin-bottom: 32rpx; }
.phone-input-row { width: 100%; margin-bottom: 20rpx; }
.phone-input { width: 100%; height: 88rpx; background: #F5F5F5; border-radius: 16rpx; padding: 0 28rpx; font-size: 28rpx; box-sizing: border-box; }
.code-row { width: 100%; display: flex; gap: 16rpx; margin-bottom: 32rpx; }
.code-input { flex: 1; height: 88rpx; background: #F5F5F5; border-radius: 16rpx; padding: 0 28rpx; font-size: 28rpx; box-sizing: border-box; }
.code-btn {
  width: 200rpx; height: 88rpx; background: #FF6B8A; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  text { font-size: 24rpx; color: #fff; }
  &.disabled { background: #CCC; }
}
.btn-code-login {
  width: 100%; height: 88rpx; background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
  border-radius: 999rpx; border: none; margin-bottom: 20rpx;
  &::after { border: none; }
  color: #fff; font-size: 30rpx; font-weight: 600;
}
.code-cancel { font-size: 26rpx; color: #999; }

// ========== Loading ==========
.loading-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 2000;
  background: rgba(0,0,0,0.3);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.loading-spinner {
  width: 60rpx; height: 60rpx; border: 4rpx solid rgba(255,255,255,0.4);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { color: #fff; font-size: 28rpx; margin-top: 16rpx; }
</style>
