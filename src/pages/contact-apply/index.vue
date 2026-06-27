<template>
  <view class="contact-apply-page">
    <!-- ===== 顶部导航 ===== -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @tap="handleBack">
          <text class="back-arrow">←</text>
        </view>
        <text class="nav-title">想认识Ta</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view class="page-body" scroll-y :enhanced="true" :show-scrollbar="false"
      :style="{ paddingTop: navBarHeight + 'px' }">

      <!-- ===== 目标用户信息卡片 ===== -->
      <view class="target-card">
        <view class="target-row" @tap="goToUserDetail">
          <image class="target-avatar" :src="targetAvatar" mode="aspectFill" />
          <view class="target-info">
            <view class="target-name-row">
              <text class="target-nickname">{{ targetNickname }}</text>
              <view v-if="targetIsRealName" class="real-name-tag">
                <text>已实名</text>
              </view>
            </view>
            <text v-if="briefInfo" class="target-brief">{{ briefInfo }}</text>
          </view>
          <text class="target-arrow">›</text>
        </view>
      </view>

      <!-- ===== 提示文案 ===== -->
      <view class="prompt-section">
        <text class="prompt-text">
          你正在申请使用<text class="prompt-highlight">{{ systemStore.redLineTerm }}</text>权益与
          <text class="prompt-nickname">{{ targetNickname }}</text>
          交换联系方式，继续操作将消耗一根<text class="prompt-highlight">{{ systemStore.redLineTerm }}</text>，是否确认？
        </text>
      </view>

      <!-- ===== 确认按钮 ===== -->
      <view class="confirm-section">
        <view class="confirm-btn" :class="{ disabled: applying }" @tap="handleConfirm">
          <text>{{ applying ? '处理中...' : '确认想认识Ta' }}</text>
        </view>
      </view>

      <!-- ===== 红线不足提示区 ===== -->
      <view v-if="showInsufficient" class="insufficient-section">
        <view class="insufficient-line1">
          <text class="heart-icon">❤️</text>
          <text class="insufficient-text">
            你的{{ systemStore.redLineTerm }}不足，无法与 {{ targetNickname }} 交换联系方式，你可以联系红娘进行牵线
          </text>
        </view>
        <view class="insufficient-line2">
          <text class="preset-text">{{ presetMatchmakerText }}</text>
        </view>
        <view class="insufficient-btns">
          <view class="ins-btn copy-btn" @tap="handleCopyAndContact">
            <text>复制以上信息并联系专属红娘</text>
          </view>
          <view class="ins-btn vip-btn" @tap="handleGoVip">
            <text>去开通会员</text>
          </view>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- ===== 订阅弹窗 ===== -->
    <view v-if="showSubscribeDialog" class="dialog-overlay" @tap="closeSubscribeDialog">
      <view class="dialog-card" @tap.stop>
        <text class="dialog-title">总是保持订阅，不错过重要信息</text>
        <view class="dialog-buttons">
          <view class="dialog-btn cancel-btn" @tap="closeSubscribeDialog">
            <text>取消</text>
          </view>
          <view class="dialog-btn allow-btn" @tap="handleSubscribeAllow">
            <text>允许</text>
          </view>
        </view>
        <label class="dialog-check-label">
          <checkbox :checked="alwaysSubscribe" @tap="alwaysSubscribe = !alwaysSubscribe" style="transform:scale(0.7)" />
          <text>总是保持以上选择，不再询问</text>
        </label>
      </view>
    </view>

    <!-- ===== 红娘弹窗 ===== -->
    <matchmaker-popup
      :show="showMatchmaker"
      :matchmaker="selectedMatchmaker"
      @update:show="showMatchmaker = $event"
      @close="showMatchmaker = false"
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
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { useSystemStore } from '@/store/system'
import { useUserStore } from '@/store/user'
import matchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import matchmakerListPopup from '@/components/matchmaker-list-popup/matchmaker-list-popup.vue'

const systemStore = useSystemStore()
const userStore = useUserStore()

// ===== 查询参数 =====
const targetUserId = ref(0)
const targetNickname = ref('')
const targetAvatar = ref('')
const targetIsRealName = ref(false)
const targetAge = ref('')
const targetHeight = ref('')
const targetWeight = ref('')
const targetEducation = ref('')
const targetOccupation = ref('')

onLoad((options: any) => {
  targetUserId.value = parseInt(options.userId) || 0
  targetNickname.value = decodeURIComponent(options.nickname || '')
  targetAvatar.value = decodeURIComponent(options.avatar || '') || '/static/default-avatar.png'
  targetIsRealName.value = options.isRealName === '1'
  targetAge.value = options.age || ''
  targetHeight.value = options.height || ''
  targetWeight.value = options.weight || ''
  targetEducation.value = decodeURIComponent(options.education || '')
  targetOccupation.value = decodeURIComponent(options.occupation || '')
})

// ===== 简要信息行 =====
const briefInfo = computed(() => {
  const parts: string[] = []
  if (targetAge.value) parts.push(`${targetAge.value}岁`)
  if (targetHeight.value) parts.push(`${targetHeight.value}cm`)
  if (targetWeight.value) parts.push(`${targetWeight.value}kg`)
  if (targetEducation.value) parts.push(targetEducation.value)
  if (targetOccupation.value) parts.push(targetOccupation.value)
  return parts.join(' · ')
})

// ===== 状态栏/导航栏高度 =====
const statusBarHeight = (() => {
  try { return uni.getSystemInfoSync().statusBarHeight || 44 } catch { return 44 }
})()
const navBarHeight = computed(() => {
  const sys = uni.getSystemInfoSync()
  const rpxRatio = (sys.screenWidth || 390) / 750
  return (statusBarHeight || 44) + 88 * rpxRatio
})

// ===== 申请处理 =====
const applying = ref(false)
const showInsufficient = ref(false)
const redLineRemaining = ref(0)

// ===== 预设牵线文案 =====
const presetMatchmakerText = computed(() => {
  return `我想认识 "${targetNickname.value}"，ID：${targetUserId.value}，请帮我牵线。`
})

// ===== 订阅弹窗 =====
const showSubscribeDialog = ref(false)
const alwaysSubscribe = ref(false)

const closeSubscribeDialog = () => {
  showSubscribeDialog.value = false
}

const handleSubscribeAllow = () => {
  showSubscribeDialog.value = false
  if (alwaysSubscribe.value) {
    uni.setStorageSync('subscribe_always_allow', true)
  }
  // 订阅确认后执行红线扣除
  doUseRedLine()
}

// ===== 红线扣除 =====
const doUseRedLine = async () => {
  applying.value = true
  try {
    const res: any = await request({
      url: '/vip/red-line/use',
      method: 'POST',
      data: { targetUserId: targetUserId.value },
    })
    if (res.success || res.code === 0) {
      const already = res.data?.alreadyUnlocked || res.alreadyUnlocked
      uni.showToast({
        title: already ? '已解锁过该用户' : '交换成功，已消耗一根红线',
        icon: 'success',
        duration: 2000,
      })
      // 成功后延迟返回上一页
      setTimeout(() => {
        uni.navigateBack()
      }, 2000)
    } else {
      uni.showToast({ title: res.message || '操作失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败，请稍后重试', icon: 'none' })
  } finally {
    applying.value = false
  }
}

// ===== 确认申请 =====
const handleConfirm = async () => {
  if (applying.value) return
  applying.value = true
  showInsufficient.value = false

  try {
    // 1. 查询红线状态
    const statusRes: any = await request({
      url: '/vip/red-line/status',
      method: 'GET',
    })
    redLineRemaining.value = statusRes?.data?.remaining ?? statusRes?.remaining ?? 0

    if (redLineRemaining.value > 0) {
      // 红线充足：弹出订阅弹窗
      const neverAsk = uni.getStorageSync('subscribe_always_allow')
      if (neverAsk) {
        // 已勾选"不再询问"，直接扣除
        await doUseRedLine()
      } else {
        showSubscribeDialog.value = true
      }
    } else {
      // 红线不足：展开提示区
      showInsufficient.value = true
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '网络异常，请稍后重试', icon: 'none' })
  } finally {
    applying.value = false
  }
}

// ===== 复制并联系红娘 =====
const matchmakerList = ref<any[]>([])
const showMatchmaker = ref(false)
const showMatchmakerList = ref(false)
const selectedMatchmaker = ref<any>(null)

const fetchMatchmakerList = async () => {
  try {
    const res: any = await request({ url: '/matchmakers', method: 'GET', timeout: 15000 })
    const rawList = Array.isArray(res) ? res : (res?.list || res?.data?.list || [])
    matchmakerList.value = rawList.map((item: any) => ({
      ...item,
      avatar: getFullImageUrl(item.avatar || item.avatarUrl),
      qrCode: getFullImageUrl(item.qrCode || item.qr_code || item.qrcode),
    }))
    if (matchmakerList.value.length > 0) {
      selectedMatchmaker.value = matchmakerList.value[0]
    }
  } catch {
    matchmakerList.value = [
      { id: 1, name: '小红娘', avatar: '/static/default-avatar.png', title: '资深红娘', wechat: 'hongniang001', phone: '15703592518', qrCode: '/static/matchmaker.png' },
    ]
    selectedMatchmaker.value = matchmakerList.value[0]
  }
}

const handleCopyAndContact = async () => {
  try {
    await uni.setClipboardData({
      data: presetMatchmakerText.value,
    })
    uni.showToast({ title: '内容已复制', icon: 'success', duration: 1500 })
  } catch { /* ignore */ }

  // 确保红娘列表已加载
  if (matchmakerList.value.length === 0) {
    await fetchMatchmakerList()
  }
  // 弹出红娘联系方式弹窗
  setTimeout(() => {
    showMatchmaker.value = true
  }, 1500)
}

const openMatchmakerList = () => {
  showMatchmaker.value = false
  showMatchmakerList.value = true
}

const onSelectMatchmaker = (m: any) => {
  showMatchmakerList.value = false
  selectedMatchmaker.value = m
  setTimeout(() => { showMatchmaker.value = true }, 300)
}

// ===== 跳转会员页 =====
const handleGoVip = () => {
  uni.switchTab({ url: '/pages/vip/index' })
}

// ===== 跳转用户详情 =====
const goToUserDetail = () => {
  uni.navigateTo({ url: `/pages/user-detail/index?id=${targetUserId.value}` })
}

// ===== 返回 =====
const handleBack = () => {
  uni.navigateBack()
}

onMounted(() => {
  fetchMatchmakerList()
})
</script>

<style lang="scss" scoped>
.contact-apply-page {
  min-height: 100vh;
  background-color: #f8f8f8;
  display: flex;
  flex-direction: column;
}

// ===== 导航栏 =====
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #fff;
}

.nav-inner {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 32rpx;
}

.nav-back {
  width: 80rpx;
  display: flex;
  align-items: center;
}

.back-arrow {
  font-size: 36rpx;
  color: #333;
  font-weight: bold;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

.nav-placeholder {
  width: 80rpx;
}

// ===== 页面主体 =====
.page-body {
  flex: 1;
}

// ===== 目标用户卡片 =====
.target-card {
  margin: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
}

.target-row {
  display: flex;
  align-items: center;
}

.target-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.target-info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
}

.target-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.target-nickname {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.real-name-tag {
  padding: 2rpx 12rpx;
  background: linear-gradient(135deg, #67C23A, #85CE61);
  border-radius: 6rpx;

  text {
    font-size: 20rpx;
    color: #fff;
  }
}

.target-brief {
  font-size: 24rpx;
  color: #999;
  line-height: 1.4;
}

.target-arrow {
  font-size: 40rpx;
  color: #ccc;
  flex-shrink: 0;
  margin-left: 12rpx;
}

// ===== 提示文案 =====
.prompt-section {
  margin: 0 24rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx 24rpx;
}

.prompt-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
}

.prompt-highlight {
  color: #FF6B9D;
  font-weight: 600;
}

.prompt-nickname {
  color: #FF6B9D;
  font-weight: 600;
}

// ===== 确认按钮 =====
.confirm-section {
  padding: 40rpx 24rpx;
  display: flex;
  justify-content: center;
}

.confirm-btn {
  width: 100%;
  max-width: 600rpx;
  height: 96rpx;
  background: linear-gradient(135deg, #FF6B9D, #FF8E8E);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 32rpx;
    font-weight: 600;
    color: #fff;
  }

  &.disabled {
    opacity: 0.6;
  }
}

// ===== 红线不足提示区 =====
.insufficient-section {
  margin: 0 24rpx 40rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx 24rpx;
}

.insufficient-line1 {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.heart-icon {
  font-size: 36rpx;
  flex-shrink: 0;
}

.insufficient-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
  flex: 1;
}

.insufficient-line2 {
  background: #FFF5F7;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 28rpx;
}

.preset-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  word-break: break-all;
}

.insufficient-btns {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.ins-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 30rpx;
    font-weight: 600;
  }
}

.copy-btn {
  background: linear-gradient(135deg, #FF6B9D, #FF8E8E);

  text {
    color: #fff;
  }
}

.vip-btn {
  background: #fff;
  border: 2rpx solid #FF6B9D;

  text {
    color: #FF6B9D;
  }
}

.bottom-spacer {
  height: 80rpx;
}

// ===== 弹窗（复用 user-detail 样式） =====
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-card {
  width: 580rpx;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 32rpx;
}

.dialog-buttons {
  display: flex;
  width: 100%;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.dialog-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 28rpx;
    font-weight: 500;
  }
}

.cancel-btn {
  background-color: #f5f5f5;

  text {
    color: #666;
  }
}

.allow-btn {
  background-color: #67C23A;

  text {
    color: #fff;
  }
}

.dialog-check-label {
  display: flex;
  align-items: center;
  gap: 12rpx;

  text {
    font-size: 24rpx;
    color: #999;
  }
}
</style>
