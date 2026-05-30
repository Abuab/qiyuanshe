<template>
  <view class="splash-page">
    <view class="background"></view>

    <view class="main-content">
      <view class="heart-container">
        <image class="heart-icon" src="/static/heart.png" mode="aspectFit"></image>
      </view>

      <text class="splash-text">{{ splashText }}</text>

      <view class="loading-dots">
        <view class="dot"></view>
        <view class="dot"></view>
        <view class="dot"></view>
      </view>
    </view>

    <protocol-popup
      :show="showProtocol"
      @update:show="showProtocol = $event"
      @agree="handleProtocolAgree"
      @close="handleProtocolClose"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSystemStore } from '@/store/system'
import { useUserStore } from '@/store/user'
import ProtocolPopup from '@/components/protocol-popup/protocol-popup.vue'

const systemStore = useSystemStore()
const userStore = useUserStore()

const splashText = ref('正在为您寻找心仪的对象...')
const showProtocol = ref(false)

onMounted(async () => {
  await systemStore.loadSystemConfig()
  splashText.value = systemStore.splashText || '正在为您寻找心仪的对象...'

  if (!userStore.isLoggedIn) {
    showProtocol.value = true
  } else {
    startMainNavigation()
  }
})

const handleProtocolAgree = () => {
  showProtocol.value = false
  startMainNavigation()
}

const handleProtocolClose = () => {
  showProtocol.value = false
  startMainNavigation()
}

const startMainNavigation = () => {
  setTimeout(() => {
    const isLoggedIn = userStore.isLoggedIn

    if (isLoggedIn) {
      uni.switchTab({
        url: '/pages/index/index',
      })
    } else {
      uni.reLaunch({
        url: '/pages/login/index',
      })
    }
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
  width: 160rpx;
  height: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 60rpx;
}

.heart-icon {
  width: 120rpx;
  height: 120rpx;
  animation: heartbeat 2s ease-in-out infinite;
}

@keyframes heartbeat {
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.6;
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
