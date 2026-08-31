<template>
  <view v-if="licenseStore.showGraceBanner" class="grace-banner">
    <text class="grace-text">{{ bannerText }}</text>
    <view class="grace-close" @tap="licenseStore.closeGraceBanner">
      <text class="grace-close-icon">×</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLicenseStore } from '@/store/license'

const licenseStore = useLicenseStore()

const bannerText = computed(() => {
  const days = licenseStore.graceDaysLeft
  return days > 0
    ? `系统授权即将过期（还剩 ${days} 天），部分功能可能受限`
    : '系统授权即将过期，部分功能可能受限'
})
</script>

<style lang="scss" scoped>
.grace-banner {
  display: flex;
  align-items: center;
  height: 60rpx;
  background-color: #fff3e0;
  padding: 0 24rpx;
}

.grace-text {
  flex: 1;
  font-size: 24rpx;
  color: #ff6b00;
  text-align: center;
}

.grace-close {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grace-close-icon {
  font-size: 36rpx;
  color: #ff6b00;
  line-height: 1;
}
</style>
