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
        <view class="banner-shield">
          <view class="shield-halo"></view>
          <view class="shield-icon"></view>
        </view>
        <text class="banner-text">公安网权威认证：验证真实身份，保护个人隐私</text>
      </view>

      <!-- ========== 白色卡片 ========== -->
      <view class="card">
        <!-- 标题区 -->
        <view class="title-row">
          <text class="title-main">实名认证</text>
          <text class="title-sub">完善认证，点亮图标，真实可信</text>
        </view>

        <!-- 输入表单区 -->
        <view class="form-area">
          <!-- 真实姓名 -->
          <view class="form-item">
            <text class="form-label">真实姓名</text>
            <input
              class="form-input"
              v-model="realName"
              type="text"
              placeholder="请输入真实姓名"
              placeholder-style="color:#BBBBBB;font-size:28rpx;"
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
              placeholder-style="color:#BBBBBB;font-size:28rpx;"
            />
            <view class="ocr-btn" @tap="handleOCR">
              <view class="ocr-icon"></view>
              <text class="ocr-text">识别身份证</text>
            </view>
          </view>
        </view>

        <!-- 开始认证按钮 -->
        <view class="submit-btn-area">
          <view class="submit-btn" @tap="handleSubmit">
            <text>开始认证（免费）</text>
          </view>
        </view>

        <!-- 协议勾选区 + 未勾选提示 -->
        <view class="agreement-wrap">
          <view v-if="showAgreeTip" class="agree-tip">
            <text class="agree-tip-text">请阅读并勾选协议</text>
            <view class="agree-tip-arrow"></view>
          </view>
          <view class="agreement-row" @tap="toggleAgree">
            <view class="checkbox" :class="{ 'checkbox--checked': agree }">
              <text v-if="agree" class="checkbox-icon">✓</text>
            </view>
            <text class="agreement-text">
              同意<text class="agreement-link" @tap.stop="openAgreement('user')">《用户协议》</text>和<text class="agreement-link" @tap.stop="openAgreement('privacy')">《隐私政策》</text>
            </text>
          </view>
        </view>
      </view>

      <!-- ========== 联系客服 ========== -->
      <view class="contact-row" @tap="openContact">
        <view class="contact-icon"></view>
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

// ========== 未勾选协议提示气泡 ==========
const showAgreeTip = ref(false)
let agreeTipTimer: ReturnType<typeof setTimeout> | null = null

const toggleAgree = () => {
  agree.value = !agree.value
  if (agree.value && showAgreeTip.value) {
    showAgreeTip.value = false
    if (agreeTipTimer) { clearTimeout(agreeTipTimer); agreeTipTimer = null }
  }
}

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
    // 未勾选协议 → 勾选框上方弹出黑色气泡提示，2 秒后自动消失
    showAgreeTip.value = true
    if (agreeTipTimer) clearTimeout(agreeTipTimer)
    agreeTipTimer = setTimeout(() => { showAgreeTip.value = false; agreeTipTimer = null }, 2000)
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
  background: linear-gradient(180deg, #FFF0F3 0%, #FFF6F8 40%, #FFF8F9 100%);
  display: flex;
  flex-direction: column;
}

// ========== 导航栏 ==========
.nav-wrap {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 100; background: #FFF0F3;
}
.nav-bar {
  height: 88rpx; display: flex; align-items: center;
  justify-content: space-between; padding: 0 32rpx;
}
.nav-back { font-size: 36rpx; color: #333; width: 80rpx; }
.nav-title { font-size: 34rpx; font-weight: bold; color: #333; }
.nav-placeholder { width: 80rpx; }

.page-content { flex: 1; height: 100vh; box-sizing: border-box; background: transparent; }

// ========== 顶部横幅 ==========
.top-banner {
  display: flex; align-items: center;
  padding: 24rpx 32rpx 12rpx;
  background: transparent;
}
.banner-shield {
  position: relative;
  width: 76rpx; height: 76rpx;
  margin-right: 20rpx; flex-shrink: 0;
}
.shield-halo {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 50%;
  background: radial-gradient(circle, #FFE1E8 0%, #FFEAEF 70%, rgba(255,234,239,0) 100%);
}
.shield-icon {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 46rpx; height: 46rpx;
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%3E%3Cpath%20d='M12%202%20L20%205%20L20%2011%20C20%2016%2016%2020%2012%2022%20C8%2020%204%2016%204%2011%20L4%205%20Z'%20fill='%23FF6B8A'/%3E%3Cpath%20d='M8.3%2012.2%20L10.8%2014.7%20L15.5%209.8'%20fill='none'%20stroke='%23ffffff'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'/%3E%3C/svg%3E");
  background-size: contain; background-repeat: no-repeat; background-position: center;
}
.banner-text { font-size: 26rpx; color: #666666; flex: 1; line-height: 1.4; }

// ========== 白色卡片 ==========
.card {
  margin: 16rpx 32rpx 0;
  background: #ffffff;
  border-radius: 28rpx;
  padding: 8rpx 32rpx 40rpx;
  box-shadow: 0 6rpx 28rpx rgba(255, 107, 138, 0.08);
}

// ========== 标题区 ==========
.title-row {
  display: flex; align-items: baseline; justify-content: space-between;
  padding: 32rpx 0 8rpx;
}
.title-main { font-size: 40rpx; font-weight: bold; color: #222222; }
.title-sub { font-size: 24rpx; color: #B0B0B0; }

// ========== 表单输入区 ==========
.form-area { padding: 24rpx 0 0; display: flex; flex-direction: column; gap: 20rpx; }
.form-item {
  display: flex; align-items: center;
  background: #F7F8FA; border-radius: 20rpx;
  height: 96rpx; padding: 0 26rpx;
}
.form-label { font-size: 30rpx; font-weight: 500; color: #333333; width: 150rpx; flex-shrink: 0; }
.form-input {
  flex: 1; height: 100%; font-size: 28rpx; color: #333333;
  background: transparent; text-align: left;
}
.form-input--idcard { flex: 1; margin-right: 12rpx; }

// OCR 识别按钮（粉色描边相机）
.ocr-btn {
  display: flex; flex-direction: column; align-items: center;
  flex-shrink: 0; padding: 0 4rpx;
}
.ocr-icon {
  width: 40rpx; height: 40rpx; margin-bottom: 4rpx;
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%23FF5B84'%20stroke-width='1.8'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='M4%208%20L6.5%208%20L8%206%20L16%206%20L17.5%208%20L20%208%20C20.6%208%2021%208.4%2021%209%20L21%2018%20C21%2018.6%2020.6%2019%2020%2019%20L4%2019%20C3.4%2019%203%2018.6%203%2018%20L3%209%20C3%208.4%203.4%208%204%208%20Z'/%3E%3Ccircle%20cx='12'%20cy='13.2'%20r='3.3'/%3E%3C/svg%3E");
  background-size: contain; background-repeat: no-repeat; background-position: center;
}
.ocr-text { font-size: 20rpx; color: #FF5B84; }

// ========== 按钮（粉色渐变胶囊） ==========
.submit-btn-area { padding: 44rpx 0 0; }
.submit-btn {
  height: 92rpx;
  background: linear-gradient(90deg, #FFA0B9 0%, #FF5B84 100%);
  border-radius: 46rpx;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(255, 91, 132, 0.28);
  text { font-size: 32rpx; font-weight: bold; color: #ffffff; }
  &:active { opacity: 0.9; }
}

// ========== 协议勾选 + 提示气泡 ==========
.agreement-wrap { position: relative; margin-top: 28rpx; }
.agreement-row {
  display: flex; align-items: center; justify-content: center;
}
.checkbox {
  width: 32rpx; height: 32rpx;
  border: 2rpx solid #CCCCCC; border-radius: 50%;
  margin-right: 12rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  box-sizing: border-box;
}
.checkbox--checked {
  background: #FF5B84; border-color: #FF5B84;
}
.checkbox-icon { font-size: 20rpx; color: #ffffff; font-weight: bold; line-height: 1; }
.agreement-text { font-size: 24rpx; color: #666666; }
.agreement-link { color: #3A72E8; }

.agree-tip {
  position: absolute; bottom: 100%; left: 50%;
  transform: translateX(-50%);
  margin-bottom: 16rpx;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12rpx;
  padding: 14rpx 26rpx;
  white-space: nowrap;
}
.agree-tip-text { font-size: 24rpx; color: #ffffff; }
.agree-tip-arrow {
  position: absolute; top: 100%; left: 50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 12rpx solid transparent;
  border-right: 12rpx solid transparent;
  border-top: 12rpx solid rgba(0, 0, 0, 0.8);
}

// ========== 联系客服（灰色描边耳机图标） ==========
.contact-row {
  display: flex; align-items: center; justify-content: center;
  padding: 56rpx 0 20rpx; gap: 10rpx;
}
.contact-icon {
  width: 34rpx; height: 34rpx;
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%23999999'%20stroke-width='1.8'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='M4%2013%20L4%2012%20C4%207.6%207.6%204%2012%204%20C16.4%204%2020%207.6%2020%2012%20L20%2013'/%3E%3Crect%20x='3'%20y='13'%20width='3.6'%20height='6'%20rx='1.6'/%3E%3Crect%20x='17.4'%20y='13'%20width='3.6'%20height='6'%20rx='1.6'/%3E%3C/svg%3E");
  background-size: contain; background-repeat: no-repeat; background-position: center;
}
.contact-text { font-size: 26rpx; color: #999999; }

// 安全区
.safe-bottom {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  min-height: 40rpx;
}
</style>
