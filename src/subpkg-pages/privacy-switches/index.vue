<template>
  <view class="privacy-switches-page">
    <!-- 导航栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <text class="back-btn" @tap="handleBack">←</text>
        <text class="nav-title">隐私设置</text>
        <text class="nav-placeholder"></text>
      </view>
    </view>

    <scroll-view class="content-scroll" scroll-y :style="{ paddingTop: navTopPx + 'px' }">
      <!-- 设置卡片 -->
      <view class="settings-card">
        <!-- 第1项：显示基本资料 -->
        <view class="setting-item">
          <view class="setting-left">
            <text class="setting-title">显示基本资料</text>
            <text class="setting-desc">在平台显示基本资料（不包含任何联系方式）</text>
          </view>
          <view class="setting-right" @tap="onSwitchTap">
            <view class="custom-switch" :class="{ on: showBasicProfile }">
              <view class="switch-knob" />
            </view>
          </view>
        </view>

        <!-- 分割线 -->
        <view class="setting-divider" />

        <!-- 第2项：委托平台 -->
        <view class="setting-item">
          <view class="setting-left">
            <text class="setting-title">委托平台</text>
            <text class="setting-desc">平台工作人员在充分保护您的隐私情况下，帮您脱单！</text>
          </view>
          <view class="setting-right" @tap="onSwitchTap">
            <view class="custom-switch" :class="{ on: delegateToPlatform }">
              <view class="switch-knob" />
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-safe" />
    </scroll-view>

    <!-- 提示弹窗 -->
    <view v-if="showTipDialog" class="dialog-overlay" @tap="handleTipCancel">
      <view class="dialog-box" @tap.stop>
        <text class="dialog-title">提示</text>
        <text class="dialog-content">请联系红娘修改设置</text>
        <view class="dialog-buttons">
          <view class="dialog-btn cancel-btn" @tap="handleTipCancel">
            <text>下次再说</text>
          </view>
          <view class="dialog-btn confirm-btn" @tap="handleGoContact">
            <text>去联系</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 红娘联系方式弹窗 -->
    <matchmaker-popup
      :show="showMatchmakerPopup"
      :matchmaker="selectedMatchmaker || defaultMatchmaker"
      @update:show="showMatchmakerPopup = $event"
      @close="showMatchmakerPopup = false"
      @more="openMatchmakerList"
    />
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
import { get } from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import MatchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import MatchmakerListPopup from '@/components/matchmaker-list-popup/matchmaker-list-popup.vue'
import type { MatchmakerData } from '@/components/matchmaker-popup/matchmaker-popup.vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

const statusBarHeight = ref(20)
const navTopPx = ref(0)

const showBasicProfile = ref(true)
const delegateToPlatform = ref(false)

// 提示弹窗
const showTipDialog = ref(false)

// 红娘弹窗
const showMatchmakerPopup = ref(false)
const showMatchmakerList = ref(false)
const selectedMatchmaker = ref<MatchmakerData | null>(null)
const matchmakerList = ref<MatchmakerData[]>([])
const defaultMatchmaker: MatchmakerData = {
  id: 0,
  name: '红娘',
  avatar: '',
  title: '专属红娘',
  wechat: '',
  phone: '',
  qrCode: '',
}

onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navTopPx.value = (sysInfo.statusBarHeight || 20) + 44

  if (userStore.isLoggedIn) await loadSettings()
})

/** 加载当前隐私设置 */
const loadSettings = async () => {
  try {
    const res: any = await get('/auth/profile')
    if (res) {
      showBasicProfile.value = res.showBasicProfile ?? true
      delegateToPlatform.value = res.delegateToPlatform ?? false
    }
  } catch {
    // 使用默认值
  }
}

const handleBack = () => {
  uni.navigateBack()
}

/** 两个开关点击均弹窗提示 */
const onSwitchTap = () => {
  showTipDialog.value = true
}

/** 提示 - 下次再说 */
const handleTipCancel = () => {
  showTipDialog.value = false
}

/** 提示 - 去联系红娘 */
const handleGoContact = async () => {
  showTipDialog.value = false

  try {
    const res: any = await get('/matchmakers')
    const rawList = Array.isArray(res) ? res : (res?.data || res?.list || [])
    if (rawList.length === 0) {
      uni.showToast({ title: '暂无红娘信息', icon: 'none' })
      return
    }
    const item = rawList[0]
    selectedMatchmaker.value = {
      id: item.id || 0,
      name: item.name || '红娘',
      avatar: getFullImageUrl(item.avatar),
      title: item.title || '专属红娘',
      wechat: item.wechat || '',
      phone: item.phone || '',
      qrCode: getFullImageUrl(item.qrCode || item.qr_code || item.qrcode),
    }
    matchmakerList.value = rawList.map((m: any) => ({
      id: m.id || 0,
      name: m.name || '红娘',
      avatar: getFullImageUrl(m.avatar),
      title: m.title || '专属红娘',
      wechat: m.wechat || '',
      phone: m.phone || '',
      qrCode: getFullImageUrl(m.qrCode || m.qr_code || m.qrcode),
    }))
    showMatchmakerPopup.value = true
  } catch {
    uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' })
  }
}

const openMatchmakerList = () => {
  showMatchmakerPopup.value = false
  showMatchmakerList.value = true
}

const onSelectMatchmaker = (matchmaker: any) => {
  showMatchmakerList.value = false
  selectedMatchmaker.value = matchmaker
  showMatchmakerPopup.value = true
}
</script>

<style lang="scss" scoped>
.privacy-switches-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
}

.back-btn {
  font-size: 36rpx;
  color: #FF6B9D;
  font-weight: bold;
  width: 80rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.nav-placeholder {
  width: 80rpx;
}

.content-scroll {
  height: 100vh;
}

/* ===== 设置卡片 ===== */
.settings-card {
  background-color: #fff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 0 32rpx;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 0;
}

.setting-left {
  flex: 1;
  margin-right: 24rpx;
}

.setting-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.setting-desc {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
  line-height: 1.5;
}

.setting-right {
  flex-shrink: 0;
}

.setting-divider {
  height: 1rpx;
  background-color: #eeeeee;
}

/* ===== 自定义仿开关 ===== */
.custom-switch {
  width: 104rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background-color: #e5e5e5;
  position: relative;
  transition: background-color 0.2s ease;
}

.custom-switch.on {
  background-color: #ff6b6b;
}

.switch-knob {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.15);
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  transition: left 0.2s ease;
}

.custom-switch.on .switch-knob {
  left: 44rpx;
}

/* ===== 弹窗 ===== */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog-box {
  width: 75%;
  max-width: 560rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 48rpx 40rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.dialog-content {
  font-size: 28rpx;
  color: #666;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 40rpx;
}

.dialog-buttons {
  display: flex;
  width: 100%;
  gap: 20rpx;
}

.dialog-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;

  text {
    font-size: 30rpx;
  }
}

.cancel-btn {
  background: #f2f2f2;

  text {
    color: #333;
  }
}

.confirm-btn {
  background: #07c160;

  text {
    color: #fff;
    font-weight: bold;
  }
}

.bottom-safe {
  height: 60rpx;
}
</style>
