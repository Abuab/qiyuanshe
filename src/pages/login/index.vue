<template>
  <view class="login-page">
    <!-- 半透明遮罩 -->
    <view class="login-mask" />

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

    <!-- ===== 登录卡片（遮罩 + 居中白卡） ===== -->
    <view v-if="!showProtocol" class="login-content">
      <!-- 情侣插画：悬浮卡片顶部，上半露出卡片外 -->
      <image src="/static/login-couple.png" mode="widthFix" class="couple-img" />

      <!-- 白色圆角卡片 -->
      <view class="login-card">
        <!-- 右上角关闭按钮 -->
        <view class="close-btn" @tap="handleSkipAuth">
          <text>✕</text>
        </view>

        <!-- 手机插画 -->
        <image src="/static/login-phone.png" mode="widthFix" class="phone-img" />

        <!-- 标题 -->
        <text class="login-title">手机号码登录</text>

        <!-- 手机号输入框 -->
        <view class="input-box phone-box">
          <AppIcon name="icon-device-mobile-light" size="40" color="#FF8FA8" />
          <input
            v-model="smsPhone"
            class="input-field"
            type="number"
            maxlength="11"
            placeholder="请输入手机号"
          />
        </view>

        <!-- 验证码输入框 -->
        <view class="input-box code-box">
          <AppIcon name="icon-shield-check-thin" size="40" color="#FF8FA8" />
          <input
            v-model="smsCode"
            class="input-field code-field"
            type="number"
            maxlength="6"
            placeholder="请输入验证码"
          />
          <text class="sms-code-text" :class="{ disabled: smsCountdown > 0 }" @tap="sendSmsCode">
            {{ smsCountdown > 0 ? `${smsCountdown}秒后重发` : '获取验证码' }}
          </text>
        </view>

        <!-- 确定按钮 -->
        <view class="login-btn" @tap="submitSmsLogin">
          <text>确定</text>
        </view>

        <!-- 小程序：微信手机号快捷登录 -->
        <!-- #ifdef MP-WEIXIN -->
        <button
          class="wechat-quick"
          open-type="getPhoneNumber"
          @getphonenumber="onGetPhoneNumber"
          @tap="handlePhoneLogin"
        >
          微信手机号快捷登录
        </button>
        <!-- #endif -->
      </view>
    </view>

    <!-- 加载遮罩 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-spinner" />
      <text class="loading-text">登录中...</text>
    </view>

    <!-- 完善资料弹窗（新用户首次登录后，无法关闭） -->
    <profile-complete-popup
      :show="showProfilePopup"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { post } from '@/utils/request'
import { showToast } from '@/utils/common'
import { logger } from '@/utils/logger'
import { secureStorage } from '@/utils/crypto'
import { STORAGE_KEY } from '@/config/constants'
import ProfileCompletePopup from '@/components/profile-complete-popup/profile-complete-popup.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import { safeNavigateBack } from '@/utils/navigate'
interface LoginResult {
  user: any
  tokens: { accessToken: string; refreshToken: string; expiresIn: number }
}
interface WechatLoginResult { code: string; errMsg: string }

const userStore = useUserStore()
const systemStore = useSystemStore()
const appName = computed(() => systemStore.appName || '栖缘社')
const showProtocol = ref(false)
const showProfilePopup = ref(false)
const loading = ref(false)
// 协议弹窗被同意时置为 true，登录成功（已鉴权）后再补记同意，避免未登录上报 401
const pendingAgreementReport = ref(false)
// 预存 wx.login code，在 getPhoneNumber 之前获取，确保 session key 一致
const phoneLoginCode = ref('')
// 手机验证码登录
const smsPhone = ref('')
const smsCode = ref('')
const smsCountdown = ref(0)
let smsTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  checkLogin()
})

const checkLogin = () => {
  // 以 storage 中的 token 为准判断登录态：401 处理会先同步清空 storage，而内存 store 的
  // 清空是异步的，若只依赖内存 isLoggedIn 会在竞态窗口误判「已登录」导致闪跳登录页循环
  const hasToken = !!secureStorage.getToken()
  if (userStore.isLoggedIn && hasToken) {
    // 已登录用户直接进首页，不弹协议弹窗（后端已有协议记录）
    handleLoginSuccess()
    return
  }
  // storage 已无 token 但内存仍残留登录态（401 异步清理竞态/失败），同步清空内存态防止闪跳
  if (userStore.isLoggedIn && !hasToken) {
    userStore.clearLoginState()
  }
  // 未登录用户检查是否已同意协议（uniStorage + 本地缓存兜底）
  const hasAgreed = uni.getStorageSync(STORAGE_KEY.HAS_AGREED_PROTOCOL) === true
  if (!hasAgreed && !secureStorage.isProtocolAgreed()) {
    showProtocol.value = true
  }
}

const handleAgree = () => {
  uni.setStorageSync(STORAGE_KEY.HAS_AGREED_PROTOCOL, true)
  secureStorage.setProtocolAgreed()
  showProtocol.value = false
  // 此时尚未登录（无 token），标记待登录成功后再补记同意，避免 401
  pendingAgreementReport.value = true
}

/** 登录成功后补记协议同意（已鉴权），刷新后端同意时间与记录 */
const reportAgreementIfPending = () => {
  if (!pendingAgreementReport.value) return
  pendingAgreementReport.value = false
  post('/users/agreement', {
    agreementType: 'USER_AGREEMENT',
    version: '1.0',
    action: 'agree',
  }).catch((err: any) => {
    logger.error('[agreement] 协议同意上报失败:', err?.message || err)
  })
}

const handleDisagree = () => {
  showProtocol.value = false
  uni.switchTab({ url: '/pages/index/index' })
}

const handleSkipAuth = () => {
  showProtocol.value = false
  safeNavigateBack()
}

const openAgreement = () => {
  uni.navigateTo({ url: '/pages/agreement/index?type=user' })
}
const openPrivacy = () => {
  uni.navigateTo({ url: '/pages/agreement/index?type=privacy' })
}

// #ifdef MP-WEIXIN
const handlePhoneLogin = async () => {
  if (!secureStorage.isProtocolAgreed()) {
    showProtocol.value = true
    return
  }
  // 先调用 wx.login 获取 code，确保 session key 与后续 getPhoneNumber 一致
  try {
    const loginRes = await new Promise<WechatLoginResult>((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    phoneLoginCode.value = loginRes.code
  } catch {
    showToast('登录失败，请重试', 'none')
  }
}
// #endif

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

/** 发送短信验证码 */
const sendSmsCode = async () => {
  const phone = smsPhone.value.trim()
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    showToast('请输入正确的手机号', 'none')
    return
  }
  if (smsCountdown.value > 0) return

  try {
    await post('/auth/sms-code', { phone })
    showToast('验证码已发送', 'none')
    smsCountdown.value = 60
    smsTimer = setInterval(() => {
      smsCountdown.value -= 1
      if (smsCountdown.value <= 0 && smsTimer) {
        clearInterval(smsTimer)
        smsTimer = null
      }
    }, 1000)
  } catch (error: any) {
    const msg = error?.message || ''
    // 短信服务未配置 → 自动降级提示（小程序引导使用手机号快捷登录；H5 无微信环境，友好提示）
    if (msg.includes('短信服务暂未开通') || msg.includes('未配置')) {
      // #ifdef MP-WEIXIN
      showToast('短信登录暂不可用，请使用手机号快捷登录', 'none')
      // #endif
      // #ifndef MP-WEIXIN
      showToast('短信服务暂未开通，请稍后再试', 'none')
      // #endif
      return
    }
    logger.error('发送短信验证码失败:', error?.message || error)
    showToast(error?.message || '发送失败，请重试', 'none')
  }
}

/** 手机验证码登录 */
const submitSmsLogin = async () => {
  const phone = smsPhone.value.trim()
  const code = smsCode.value.trim()
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    showToast('请输入正确的手机号', 'none')
    return
  }
  if (!/^\d{6}$/.test(code)) {
    showToast('请输入6位验证码', 'none')
    return
  }

  loading.value = true
  try {
    // 微信登录 code：小程序端通过 uni.login 获取；H5 端无微信环境，code 置空走纯手机号登录
    let wxLoginCode = ''
    // #ifdef MP-WEIXIN
    const loginRes = await new Promise<WechatLoginResult>((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginRes.code) throw new Error('微信登录失败')
    wxLoginCode = loginRes.code
    // #endif

    const result = await post<LoginResult>('/auth/sms-login', {
      code: wxLoginCode,
      phone,
      smsCode: code,
      deviceInfo: getDeviceInfo(),
    })

    if (result?.user && result?.tokens) {
      const profileComplete = !result.user.isNewUser
      userStore.login(result.tokens.accessToken, result.user, profileComplete)
      if (result.tokens.refreshToken) secureStorage.setRefreshToken(result.tokens.refreshToken)
      reportAgreementIfPending()
      showToast('登录成功', 'success')
      handleLoginSuccess()
    } else {
      showToast('登录失败，请重试', 'none')
    }
  } catch (error: any) {
    logger.error('手机验证码登录失败:', error?.errMsg || error)
    showToast(error?.message || '登录失败，请重试', 'none')
  } finally {
    loading.value = false
  }
}

// #ifdef MP-WEIXIN
/** 获取手机号回调 */
const onGetPhoneNumber = async (e: any) => {
  if (e.detail.errMsg !== 'getPhoneNumber:ok') {
    showToast('获取手机号失败', 'none')
    return
  }
  loading.value = true

  const tryLogin = async (code: string): Promise<LoginResult | null> => {
    const result = await post<LoginResult>('/auth/phone-login', {
      code,
      encryptedData: e.detail.encryptedData,
      iv: e.detail.iv,
      deviceInfo: getDeviceInfo(),
    })
    return result || null
  }

  try {
    // 使用预存的 phoneLoginCode 或重新获取（避免 session 不匹配）
    let code = phoneLoginCode.value
    if (!code) {
      const loginRes = await new Promise<WechatLoginResult>((resolve, reject) => {
        uni.login({ provider: 'weixin', success: resolve, fail: reject })
      })
      code = loginRes.code
    }

    let result = await tryLogin(code)

    // 如果解密失败（session 不匹配），重新 wx.login 后重试一次
    if (!result && phoneLoginCode.value) {
      const loginRes = await new Promise<WechatLoginResult>((resolve, reject) => {
        uni.login({ provider: 'weixin', success: resolve, fail: reject })
      })
      result = await tryLogin(loginRes.code)
    }

    if (result?.user && result?.tokens) {
      const profileComplete = !result.user.isNewUser
      userStore.login(result.tokens.accessToken, result.user, profileComplete)
      if (result.tokens.refreshToken) secureStorage.setRefreshToken(result.tokens.refreshToken)
      reportAgreementIfPending()
      showToast('登录成功', 'success')
      handleLoginSuccess()
    } else {
      showToast('登录失败，请重试', 'none')
    }
  } catch (error: any) {
    logger.error('手机号登录失败:', error)
    showToast(error.message || '登录失败，请重试', 'none')
  } finally {
    loading.value = false
    phoneLoginCode.value = ''
  }
}
// #endif

const handleLoginSuccess = () => {
  // 新用户：跳转到"我的"页面，由"我的"页面 onShow 触发完善资料弹窗（带 nextStepUrl）
  if (userStore.userInfo && /^昵称/.test(userStore.userInfo.nickname || '') && !userStore.userInfo.avatar) {
    uni.switchTab({ url: '/pages/my/index' })
    return
  }
  safeNavigateBack()
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box;
}

// ===== 半透明遮罩 =====
.login-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 0;
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

// ===== 登录卡片 =====
.login-content {
  position: relative;
  z-index: 1;
  width: 85%;
  max-width: 620rpx;
  display: flex; flex-direction: column; align-items: center;
}

// 情侣插画：悬浮卡片顶部，上半露出卡片外，层级高于卡片
.couple-img {
  width: 420rpx;
  display: block;
  margin-bottom: -180rpx;
  position: relative;
  z-index: 2;
}

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  background: #fff;
  border-radius: 32rpx;
  padding: 56rpx 40rpx 48rpx;
  box-sizing: border-box;
  box-shadow: 0 16rpx 40rpx rgba(0,0,0,0.12);
  display: flex; flex-direction: column; align-items: center;
}

// 右上角关闭按钮
.close-btn {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  z-index: 3;
  width: 40rpx; height: 40rpx;
  display: flex; align-items: center; justify-content: center;
  text {
    font-size: 40rpx; color: #999; line-height: 1;
  }
}

// 手机插画
.phone-img {
  width: 220rpx;
  display: block;
}

// 标题
.login-title {
  font-size: 32rpx;
  color: #666;
  font-weight: 400;
  text-align: center;
  margin: 32rpx 0 40rpx;
}

// ===== 输入框 =====
.input-box {
  position: relative;
  width: 100%;
  height: 88rpx;
  background: #F5F5F5;
  border-radius: 16rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
  display: flex; align-items: center;
  gap: 16rpx;
}
.phone-box { margin-bottom: 24rpx; }
.code-box { margin-bottom: 40rpx; }

.input-field {
  flex: 1;
  height: 100%;
  font-size: 30rpx;
  color: #333;
}
.code-field {
  padding-right: 160rpx;
}

// 验证码倒计时（输入框内部右侧）
.sms-code-text {
  position: absolute;
  right: 28rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 26rpx;
  color: #FF6B8A;
  &.disabled {
    color: #999;
  }
}

// ===== 确定按钮 =====
.login-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #FF5A7A, #FF7096);
  border-radius: 48rpx;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 32rpx; color: #fff; font-weight: 600; }
  &:active { opacity: 0.85; }
}

// ===== 小程序：微信手机号快捷登录 =====
.wechat-quick {
  margin-top: 32rpx;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  line-height: 1.5;
  font-size: 26rpx;
  color: #FF6B8A;
  font-weight: normal;
  &::after { border: none; }
  &:active { background: transparent; opacity: 0.8; }
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
