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

        <!-- ===== 小程序：微信快捷登录入口（默认） ===== -->
        <!-- #ifdef MP-WEIXIN -->
        <view v-if="loginMode === 'wechat'" class="wechat-entry">
          <text class="login-title">手机号登录</text>
          <button
            class="wechat-quick-btn"
            open-type="getPhoneNumber"
            @getphonenumber="onGetPhoneNumber"
            @tap="handlePhoneLogin"
          >
            微信手机号快捷登录
          </button>
          <text class="sms-entry-link" @tap="switchToSms">使用手机验证码登录</text>
        </view>
        <!-- #endif -->

        <!-- ===== 手机验证码登录表单（H5 默认 / 小程序选择后显示） ===== -->
        <view v-if="loginMode === 'sms'" class="sms-form-box">
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

          <!-- 图形验证码（风控触发时显示；小程序端为算术验证码兜底） -->
          <view v-if="needCaptcha" class="captcha-box">
            <input
              v-model="captchaInput"
              class="captcha-input"
              type="text"
              maxlength="5"
              :placeholder="captchaQuestion ? '请输入计算结果' : '请输入图形验证码'"
            />
            <image
              v-if="captchaImage"
              :src="captchaImage"
              class="captcha-img"
              mode="widthFix"
              @tap="loadCaptcha"
            />
            <view v-if="captchaQuestion" class="captcha-math" @tap="loadCaptcha">
              <text class="captcha-math-text">{{ captchaQuestion }}</text>
              <text class="captcha-math-refresh">点击刷新</text>
            </view>
          </view>

          <!-- 确定按钮 -->
          <view class="login-btn" @tap="submitSmsLogin">
            <text>确定</text>
          </view>

          <!-- 小程序：返回微信快捷登录 -->
          <!-- #ifdef MP-WEIXIN -->
          <text class="sms-entry-link" @tap="switchToWechat">使用微信快捷登录</text>
          <!-- #endif -->
        </view>
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
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { post, get } from '@/utils/request'
import { showToast } from '@/utils/common'
import { logger } from '@/utils/logger'
import { secureStorage } from '@/utils/crypto'
import { STORAGE_KEY } from '@/config/constants'
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
// 图形验证码（风控触发时显示）
const needCaptcha = ref(false)
const captchaId = ref('')
const captchaImage = ref('')
const captchaInput = ref('')
const captchaQuestion = ref('')
// 登录方式：小程序默认微信快捷登录，H5 默认手机验证码登录
const loginMode = ref<'wechat' | 'sms'>('sms')
// #ifdef MP-WEIXIN
loginMode.value = 'wechat'
// #endif

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
/** 切换到手机验证码登录，并重置图形验证码状态 */
const switchToSms = () => {
  loginMode.value = 'sms'
  needCaptcha.value = false
  captchaId.value = ''
  captchaImage.value = ''
  captchaQuestion.value = ''
  captchaInput.value = ''
}

/** 返回微信快捷登录 */
const switchToWechat = () => {
  loginMode.value = 'wechat'
}

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

/** 非加密字符串哈希（cyrb53），用于生成稳定设备指纹 */
const hashString = (str: string): string => {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

/** 生成一次性随机串（nonce） */
const genNonce = (): string => {
  const chars = 'abcdef0123456789'
  let out = ''
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

/** 设备指纹：仅采集非敏感信息（UA/品牌/机型/系统/屏幕/时区）并哈希，不含 IMEI/精确位置 */
const getDeviceFingerprint = (): string => {
  try {
    let raw = ''
    // #ifdef MP-WEIXIN
    const s = uni.getSystemInfoSync()
    raw = [s.brand, s.model, s.system, s.screenWidth, s.screenHeight, s.pixelRatio]
      .filter(Boolean)
      .join('|')
    // #endif
    // #ifndef MP-WEIXIN
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null
    let tz = ''
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch (_) { /* ignore */ }
    const sw = typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : ''
    raw = [nav?.userAgent || '', sw, tz].join('|')
    // #endif
    return raw ? hashString(raw) : ''
  } catch {
    return ''
  }
}

/** 加载图形验证码（H5：SVG 图片；小程序端 SVG 兼容性不确定，兜底用算术验证码） */
const loadCaptcha = async () => {
  try {
    captchaInput.value = ''
    // #ifdef MP-WEIXIN
    const mathRes = await get<{ captchaId: string; question: string }>('/auth/captcha', {
      mode: 'math',
    })
    captchaId.value = mathRes.captchaId
    captchaQuestion.value = mathRes.question || ''
    captchaImage.value = ''
    // #endif
    // #ifndef MP-WEIXIN
    const imgRes = await get<{ captchaId: string; imageBase64: string }>('/auth/captcha')
    captchaId.value = imgRes.captchaId
    captchaImage.value = `data:image/svg+xml;base64,${imgRes.imageBase64}`
    captchaQuestion.value = ''
    // #endif
  } catch (e: any) {
    logger.error('加载图形验证码失败:', e?.message || e)
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
    const deviceFingerprint = getDeviceFingerprint()

    // 1. 风控预判：命中规则需先完成图形验证码
    const risk = await get<{ needCaptcha: boolean }>('/auth/risk/check', {
      phone,
      deviceFingerprint,
    })

    let captchaToken = ''
    if (risk?.needCaptcha) {
      needCaptcha.value = true
      if (!captchaId.value) await loadCaptcha()
      if (!captchaInput.value.trim()) {
        showToast('请输入图形验证码', 'none')
        return
      }
      // 2. 校验图形验证码，换取一次性 token
      const verifyRes = await post<{ captchaToken: string }>('/auth/captcha/verify', {
        captchaId: captchaId.value,
        code: captchaInput.value.trim(),
        phone,
      })
      captchaToken = verifyRes?.captchaToken || ''
      if (!captchaToken) {
        await loadCaptcha()
        showToast('图形验证码校验失败，请重试', 'none')
        return
      }
      captchaInput.value = ''
    }

    // 3. 发送短信验证码（携带防重放参数）
    await post('/auth/sms-code', {
      phone,
      deviceFingerprint,
      captchaToken: captchaToken || undefined,
      timestamp: Date.now(),
      nonce: genNonce(),
    })

    // 发送成功：收起图形验证码，开始倒计时
    needCaptcha.value = false
    captchaId.value = ''
    captchaImage.value = ''
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
      deviceFingerprint: getDeviceFingerprint(),
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

// ===== 图形验证码（风控） =====
.captcha-box {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 32rpx;
}
.captcha-input {
  flex: 1;
  height: 80rpx;
  background: #F5F5F5;
  border-radius: 16rpx;
  padding: 0 28rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}
.captcha-img {
  width: 200rpx;
  height: 80rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}
.captcha-math {
  width: 200rpx;
  height: 80rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #FFE0E6, #FFD9E0);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &-text { font-size: 30rpx; color: #FF4D6D; font-weight: 700; }
  &-refresh { font-size: 20rpx; color: #FF8CA0; margin-top: 2rpx; }
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

// ===== 手机验证码登录表单容器 =====
.sms-form-box {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

// ===== 小程序：微信快捷登录入口 =====
.wechat-entry {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.wechat-quick-btn {
  width: 100%;
  height: 96rpx;
  background: #07C160;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: none;
  line-height: 96rpx;
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
  &::after { border: none; }
  &:active { opacity: 0.85; }
}
.sms-entry-link {
  margin-top: 32rpx;
  font-size: 26rpx;
  color: #FF6B8A;
  text-align: center;
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
