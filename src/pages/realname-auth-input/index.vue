<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <text class="nav-back" @tap="handleBack">←</text>
        <text class="nav-title">实名认证</text>
        <text class="nav-placeholder"></text>
      </view>
    </view>

    <scroll-view
      class="page-content"
      scroll-y
      :style="{ paddingTop: navTopPx + 'px' }"
    >
      <!-- ========== 顶部横幅 ========== -->
      <view class="top-banner">
        <view class="banner-icon-wrap">
          <text class="banner-icon">🛡</text>
        </view>
        <text class="banner-text">公安网权威认证：验证真实身份，保护个人隐私</text>
      </view>

      <!-- ========== 标题区 ========== -->
      <view class="title-row">
        <text class="title-main">实名认证</text>
        <text class="title-sub">完善认证，点亮图标，真实可信</text>
      </view>

      <!-- ========== 输入表单区 ========== -->
      <view class="form-area">
        <!-- 真实姓名 -->
        <view class="form-item">
          <text class="form-label">真实姓名</text>
          <input
            class="form-input"
            v-model="realName"
            type="text"
            placeholder="请输入真实姓名"
            placeholder-style="color:#CCCCCC;font-size:28rpx;"
          />
        </view>

        <!-- 身份证号 -->
        <view class="form-item">
          <text class="form-label">身份证号</text>
          <input
            class="form-input form-input--idcard"
            v-model="idCard"
            type="idcard"
            maxlength="18"
            placeholder="请输入身份证号"
            placeholder-style="color:#CCCCCC;font-size:28rpx;"
          />
          <view class="ocr-btn" @tap="handleOCR">
            <text class="ocr-icon">📷</text>
            <text class="ocr-text">识别身份证</text>
          </view>
        </view>
      </view>

      <!-- ========== 开始认证按钮 ========== -->
      <view class="submit-btn-area">
        <view class="submit-btn" @tap="handleSubmit">
          <text>开始认证（免费）</text>
        </view>
      </view>

      <!-- ========== 协议勾选区 ========== -->
      <view class="agreement-row" @tap="agree = !agree">
        <view class="checkbox" :class="{ 'checkbox--checked': agree }">
          <text v-if="agree" class="checkbox-icon">✓</text>
        </view>
        <text class="agreement-text">
          同意<text class="agreement-link" @tap.stop="openAgreement('user')">《用户协议》</text>和<text class="agreement-link" @tap.stop="openAgreement('privacy')">《隐私政策》</text>
        </text>
      </view>

      <!-- ========== 联系客服 ========== -->
      <view class="contact-row" @tap="openContact">
        <text class="contact-icon">📞</text>
        <text class="contact-text">联系客服</text>
      </view>

      <!-- 底部安全区 -->
      <view class="safe-bottom" />
    </scroll-view>

    <!-- ========== 红娘联系弹窗（复用现有组件） ========== -->
    <matchmaker-popup
      :show="showMatchmaker"
      :matchmaker="selectedMatchmaker || {}"
      @close="showMatchmaker = false"
      @more="handleMoreMatchmakers"
    />

    <!-- ========== 红娘列表弹窗 ========== -->
    <matchmaker-list-popup
      :show="showMatchmakerList"
      :matchmakers="matchmakerList"
      @update:show="showMatchmakerList = $event"
      @close="showMatchmakerList = false"
      @contact="onSelectMatchmaker"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getFullImageUrl, showToast } from '@/utils/common'
import { get } from '@/utils/request'
import MatchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import MatchmakerListPopup from '@/components/matchmaker-list-popup/matchmaker-list-popup.vue'

// ========== 导航相关 ==========
const statusBarHeight = ref(20)
const navTopPx = ref(64)

onMounted(() => {
  const sysInfo = uni.getWindowInfo()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navTopPx.value = (sysInfo.statusBarHeight || 20) + 44
})

const handleBack = () => {
  uni.navigateBack()
}

// ========== 表单 ==========
const realName = ref('')
const idCard = ref('')
const agree = ref(false)

// ========== 身份证校验 ==========
const validateIdCard = (id: string): boolean => {
  if (!/^\d{17}[\dXx]$/.test(id)) return false
  const weight = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checkMap = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += parseInt(id[i]) * weight[i]
  }
  return checkMap[sum % 11] === id[17].toUpperCase()
}

// ========== OCR 识别（占位） ==========
const handleOCR = () => {
  showToast('OCR 识别功能开发中')
}

// ========== 提交 ==========
const handleSubmit = () => {
  if (!agree.value) {
    // 黑色 Toast（uni.showToast 不支持自定义样式，使用 showModal 模拟或用加长 duration）
    uni.showToast({ title: '请阅读并勾选协议', icon: 'none', duration: 2000 })
    return
  }
  if (!realName.value.trim()) {
    showToast('请填写真实姓名')
    return
  }
  if (!idCard.value.trim()) {
    showToast('请填写身份证号')
    return
  }
  if (!validateIdCard(idCard.value)) {
    showToast('身份证号格式不正确')
    return
  }
  uni.navigateTo({ url: '/pages/tencent-eid-auth/index' })
}

// ========== 协议链接 ==========
const openAgreement = (type: string) => {
  if (type === 'user') {
    uni.navigateTo({ url: '/pages/user-agreement/index' })
  } else {
    uni.navigateTo({ url: '/pages/privacy-policy/index' })
  }
}

// ========== 联系客服（复用红娘弹窗） ==========
const showMatchmaker = ref(false)
const showMatchmakerList = ref(false)
const selectedMatchmaker = ref<any>(null)
const matchmakerList = ref<any[]>([])

const fetchMatchmakerList = async () => {
  try {
    const res: any = await get('/matchmakers')
    const rawList = Array.isArray(res) ? res : (res?.data || res?.list || [])
    matchmakerList.value = rawList.map((item: any) => ({
      ...item,
      qrCode: getFullImageUrl(item.qrCode || item.qr_code || item.qrcode),
      avatar: getFullImageUrl(item.avatar),
    }))
  } catch {
    matchmakerList.value = []
  }
}

const openContact = async () => {
  if (matchmakerList.value.length === 0) {
    await fetchMatchmakerList()
  }
  if (matchmakerList.value.length === 0) {
    uni.showToast({ title: '暂无客服信息', icon: 'none' })
    return
  }
  selectedMatchmaker.value = matchmakerList.value[0]
  showMatchmaker.value = true
}

const handleMoreMatchmakers = () => {
  showMatchmakerList.value = true
}

const onSelectMatchmaker = (maker: any) => {
  selectedMatchmaker.value = maker
  showMatchmakerList.value = false
  showMatchmaker.value = true
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

// ========== 导航栏 ==========
.nav-wrap {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 100; background: #ffffff;
}
.nav-bar {
  height: 88rpx; display: flex; align-items: center;
  justify-content: space-between; padding: 0 32rpx;
}
.nav-back { font-size: 36rpx; color: #333; width: 80rpx; }
.nav-title { font-size: 34rpx; font-weight: bold; color: #333; }
.nav-placeholder { width: 80rpx; }

.page-content { flex: 1; height: 100vh; box-sizing: border-box; }

// ========== 顶部横幅 ==========
.top-banner {
  display: flex; align-items: center;
  height: 120rpx; padding: 0 32rpx;
  background: linear-gradient(135deg, #FFF5F7 0%, #FFE8EC 100%);
}
.banner-icon-wrap {
  width: 64rpx; height: 64rpx; margin-right: 20rpx;
  display: flex; align-items: center; justify-content: center;
}
.banner-icon { font-size: 48rpx; }
.banner-text { font-size: 28rpx; color: #333333; flex: 1; line-height: 1.4; }

// ========== 标题区 ==========
.title-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 40rpx 32rpx 0;
}
.title-main { font-size: 40rpx; font-weight: bold; color: #333333; }
.title-sub { font-size: 24rpx; color: #999999; }

// ========== 表单输入区 ==========
.form-area { padding: 32rpx 32rpx 0; display: flex; flex-direction: column; gap: 20rpx; }
.form-item {
  display: flex; align-items: center;
  background: #F8F8F8; border-radius: 16rpx;
  height: 100rpx; padding: 0 28rpx;
}
.form-label { font-size: 30rpx; font-weight: bold; color: #333333; width: 160rpx; flex-shrink: 0; }
.form-input {
  flex: 1; height: 100%; font-size: 28rpx; color: #333333;
  background: transparent; text-align: left;
}
.form-input--idcard { flex: 1; margin-right: 16rpx; }

// OCR 识别按钮
.ocr-btn {
  display: flex; flex-direction: column; align-items: center;
  flex-shrink: 0; padding: 0 8rpx;
}
.ocr-icon { font-size: 40rpx; }
.ocr-text { font-size: 20rpx; color: #FF4D6A; }

// ========== 按钮 ==========
.submit-btn-area { padding: 48rpx 60rpx 0; }
.submit-btn {
  height: 96rpx; background: #FF4D6A; border-radius: 48rpx;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 32rpx; font-weight: bold; color: #ffffff; }
  &:active { opacity: 0.85; }
}

// ========== 协议勾选 ==========
.agreement-row {
  display: flex; align-items: center; justify-content: center;
  padding: 32rpx 60rpx 0;
}
.checkbox {
  width: 32rpx; height: 32rpx;
  border: 2rpx solid #CCCCCC; border-radius: 50%;
  margin-right: 12rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.checkbox--checked {
  background: #FF4D6A; border-color: #FF4D6A;
}
.checkbox-icon { font-size: 20rpx; color: #ffffff; font-weight: bold; }
.agreement-text { font-size: 24rpx; color: #666666; }
.agreement-link { color: #3366CC; }

// ========== 联系客服 ==========
.contact-row {
  display: flex; align-items: center; justify-content: center;
  padding: 60rpx 0 0; gap: 8rpx;
}
.contact-icon { font-size: 32rpx; }
.contact-text { font-size: 28rpx; color: #999999; }

// 安全区
.safe-bottom {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  min-height: 40rpx;
}
</style>
