<template>
  <view class="privacy-settings-page">
    <!-- 导航栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <text class="back-btn" @tap="handleBack">←</text>
        <text class="nav-title">隐私设置</text>
        <text class="nav-placeholder"></text>
      </view>
    </view>

    <scroll-view class="content-scroll" scroll-y :style="{ paddingTop: navTopPx + 'px' }">
      <!-- 功能栏 -->
      <view class="menu-group">
        <view class="menu-row" @tap="goToBlockList">
          <view class="menu-left">
            <AppIcon name="icon-prohibit" size="40" color="#333333" />
            <text class="menu-label">黑名单</text>
          </view>
          <text class="menu-arrow">></text>
        </view>

        <view class="menu-row" @tap="goToAgreement">
          <view class="menu-left">
            <AppIcon name="icon-shield-warning" size="40" color="#333333" />
            <text class="menu-label">隐私政策</text>
          </view>
          <text class="menu-arrow">></text>
        </view>

        <view class="menu-row" @tap="goToSelfDiscipline">
          <view class="menu-left">
            <AppIcon name="icon-scroll" size="40" color="#333333" />
            <text class="menu-label">平台自律声明</text>
          </view>
          <text class="menu-arrow">></text>
        </view>

        <view class="menu-row" @tap="goToPrivacySwitches">
          <view class="menu-left">
            <AppIcon name="icon-lock-key" size="40" color="#333333" />
            <text class="menu-label">隐私设置</text>
          </view>
          <text class="menu-arrow">></text>
        </view>

        <view class="menu-row" @tap="handleDeactivate">
          <view class="menu-left">
            <AppIcon name="icon-file-x" size="40" color="#333333" />
            <text class="menu-label">注销账号</text>
          </view>
          <view class="menu-right">
            <text class="menu-deactivate-hint">注销后无法恢复，请谨慎操作</text>
            <text class="menu-arrow">></text>
          </view>
        </view>
      </view>

      <!-- 注销账号下方灰色小字提示 -->
      <view class="deactivate-hint" @tap="showDeactivateDialog">
        <text class="hint-text">撤回同意协议</text>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>

    <!-- 注销确认弹窗 -->
    <view v-if="showDialog" class="dialog-overlay" @tap="closeDeactivateDialog">
      <view class="dialog-box" @tap.stop>
        <text class="dialog-title">提示</text>
        <text class="dialog-content">若点击确认撤回《隐私政策》的同意，将会无法正常使用小程序。</text>
        <view class="dialog-buttons">
          <view class="dialog-btn cancel-btn" @tap="closeDeactivateDialog">
            <text>取消</text>
          </view>
          <view class="dialog-btn confirm-btn" @tap="confirmDeactivate">
            <text>确定</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSystemStore } from '@/store/system'
import { put } from '@/utils/request'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

const systemStore = useSystemStore()
const statusBarHeight = ref(20)
const navTopPx = ref(0)
const showDialog = ref(false)

const pageIcons = computed(() => systemStore.icons?.page || {})

onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navTopPx.value = (sysInfo.statusBarHeight || 20) + 44
})

const handleBack = () => {
  uni.navigateBack()
}

const goToBlockList = () => {
  uni.navigateTo({ url: '/pages/block-list/index' })
}

const goToAgreement = () => {
  uni.navigateTo({ url: '/pages/agreement/index?type=privacy' })
}

const goToSelfDiscipline = () => {
  uni.navigateTo({ url: '/pages/agreement/index?type=selfDiscipline' })
}

const goToPrivacySwitches = () => {
  uni.navigateTo({ url: '/pages/privacy-switches/index' })
}

const showDeactivateDialog = () => {
  showDialog.value = true
}

const closeDeactivateDialog = () => {
  showDialog.value = false
}

const confirmDeactivate = async () => {
  try {
    await put('/users/deactivate')
    uni.showToast({ title: '已注销', icon: 'success' })
    showDialog.value = false
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' })
    }, 1500)
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const handleDeactivate = () => {
  uni.navigateTo({ url: '/pages/account-cancel/index' })
}
</script>

<style lang="scss" scoped>
.privacy-settings-page {
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

.menu-group {
  background-color: #fff;
  margin: 20rpx 0;
}

.menu-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.menu-label {
  font-size: 30rpx;
  color: #333;
}

.menu-arrow {
  font-size: 28rpx;
  color: #ccc;
}

.menu-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.menu-deactivate-hint {
  font-size: 22rpx;
  color: #FF1744;
}

.deactivate-hint {
  padding: 16rpx 32rpx;
  display: flex;
  justify-content: center;
}

.hint-text {
  font-size: 24rpx;
  color: #999;
}

// 弹窗样式
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
  z-index: 999;
}

.dialog-box {
  width: 560rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 48rpx 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dialog-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
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
  border-radius: 40rpx;
}

.cancel-btn {
  background: #f5f5f5;

  text {
    font-size: 30rpx;
    color: #666;
  }
}

.confirm-btn {
  background: #FF4081;

  text {
    font-size: 30rpx;
    color: #fff;
    font-weight: bold;
  }
}

.bottom-safe {
  height: 60rpx;
}
</style>
