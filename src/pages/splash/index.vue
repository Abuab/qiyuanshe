<template>
  <view class="splash-page">
    <view class="background"></view>

    <view class="main-content">
      <view class="heart-container">
        <image class="heart-icon" src="/static/icons/loveheart.png" mode="aspectFit"></image>
      </view>

      <text class="splash-text">{{ splashText }}</text>

      <view class="loading-dots">
        <view class="dot"></view>
        <view class="dot"></view>
        <view class="dot"></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSystemStore } from '@/store/system'

const systemStore = useSystemStore()

const splashText = ref('正在为您寻找心仪的对象...')
let navigationTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  await systemStore.loadSystemConfig()
  splashText.value = systemStore.splashText || '正在为您寻找心仪的对象...'

  // 无论是否登录，直接进入首页（首次用户可预览，无需同意协议）
  startMainNavigation()
})

onUnmounted(() => {
  if (navigationTimer) {
    clearTimeout(navigationTimer)
    navigationTimer = null
  }
})

const startMainNavigation = () => {
  navigationTimer = setTimeout(() => {
    uni.switchTab({
      url: '/pages/index/index',
    })
  }, 500)
}
</script>

<style lang="scss" scoped>
.splash-page {
  min-height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #FFF5F7 0%, #FFE4ED 100%);
  z-index: -1;
}

.main-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.heart-container {
  width: 260rpx;
  height: 260rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 60rpx;
}

.heart-icon {
  width: 220rpx;
  height: 220rpx;
  animation: heartbeat 2s ease-in-out infinite;
}

@keyframes heartbeat {
  0% {
    transform: scale(0.4);
    opacity: 1;
  }
  40% {
    transform: scale(1.3);
    opacity: 0.2;
  }
  60% {
    transform: scale(1.05);
    opacity: 0.45;
  }
  80% {
    transform: scale(1.2);
    opacity: 0.25;
  }
  100% {
    transform: scale(0.4);
    opacity: 1;
  }
}

.splash-text {
  font-size: 28rpx;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 40rpx;
  padding: 0 40rpx;
}

.loading-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background-color: var(--primary);
  animation: dotPulse 1.4s ease-in-out infinite;

  &:nth-child(1) {
    animation-delay: 0s;
  }

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.4s;
  }
}

@keyframes dotPulse {
  0% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
}
</style>
