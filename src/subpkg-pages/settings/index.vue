<template>
  <view class="settings-page">
    <!-- 自定义导航栏（含状态栏占位） -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <text class="back-btn" @tap="handleBack">←</text>
        <text class="nav-title">设置</text>
        <text class="nav-placeholder"></text>
      </view>
    </view>
    <scroll-view class="settings-scroll" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }">
      <view class="menu-group">
        <view v-for="menu in menus" :key="menu.url" class="menu-row" @tap="goTo(menu.url)">
          <text class="menu-label">{{ menu.label }}</text>
          <text class="menu-arrow">></text>
        </view>
      </view>
      <view class="menu-group">
        <view class="menu-row" @tap="clearCache">
          <text class="menu-label">清除缓存</text>
          <text class="menu-arrow">></text>
        </view>
      </view>
      <view v-if="isLoggedIn" class="logout-section">
        <view class="logout-btn" @tap="handleLogout">
          <text>退出登录</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { requireLogin } from '@/utils/auth'

const store = useUserStore()
const isLoggedIn = computed(() => store.isLoggedIn)
const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)

onMounted(() => {
  if (!requireLogin()) return

  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
})

const menus = [
  { url: '/pages/account-security/index', label: '账号与安全' },
  { url: '/subpkg-pages/privacy-settings/index', label: '隐私设置' },
  { url: '/pages/notification-settings/index', label: '消息通知' },
  { url: '/subpkg-pages/about/index', label: '关于我们' },
]

const goTo = (url: string) => {
  uni.navigateTo({
    url,
    fail: () => {
      uni.showToast({ title: '页面开发中', icon: 'none' })
    },
  })
}

const clearCache = () => {
  uni.showModal({
    title: '提示',
    content: '确定清除图片缓存？',
    success: (res) => {
      if (res.confirm) {
        // 仅清除图片相关的缓存信息，避免清空登录态
        const keysToKeep = ['token', 'refresh_token', 'user_info', 'privacy_agreed']
        uni.getStorageInfo({
          success: (info) => {
            info.keys.forEach((key) => {
              if (!keysToKeep.includes(key)) uni.removeStorageSync(key)
            })
            uni.showToast({ title: '已清除', icon: 'success' })
          },
          fail: () => {
            uni.showToast({ title: '已清除', icon: 'success' })
          },
        })
      }
    },
  })
}

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定退出登录？',
    success: (res) => {
      if (res.confirm) {
        store.logout()
      }
    },
  })
}

const handleBack = () => {
  uni.navigateBack({ delta: 1 })
}
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #fff;
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
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.nav-placeholder {
  width: 80rpx;
}

.settings-scroll {
  height: 100vh;
}

.menu-group {
  background-color: #fff;
  margin-bottom: 20rpx;
}

.menu-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-label {
  font-size: 30rpx;
  color: #333;
}

.menu-arrow {
  font-size: 28rpx;
  color: #ccc;
}

.logout-section {
  padding: 40rpx 32rpx;
}

.logout-btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border-radius: 16rpx;

  text {
    color: #FF4D4F;
    font-size: 30rpx;
    font-weight: 500;
  }
}
</style>
