<template>
  <view v-if="visible" class="pcm-overlay" :class="{ 'pcm-overlay--in': animIn }" @touchmove.stop.prevent>
    <view class="pcm-box" :class="{ 'pcm-box--in': animIn }">
      <text class="pcm-title">完善全部资料即可获得脱单机会</text>
      <text class="pcm-subtitle">几秒时间，缘分就会开启！</text>
      <view class="pcm-btn" @tap="handleConfirm">
        <text>去完善资料</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ visible: boolean }>()

const animIn = ref(false)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      // 下一帧触发入场动画
      setTimeout(() => {
        animIn.value = true
      }, 20)
    } else {
      animIn.value = false
    }
  },
  { immediate: false }
)

const handleConfirm = () => {
  uni.navigateTo({ url: '/pages/basic-info/index' })
}
</script>

<style lang="scss" scoped>
.pcm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 30%;
  opacity: 0;
  transition: opacity 200ms ease-out;

  &--in {
    opacity: 1;
  }
}

.pcm-box {
  width: 560rpx;
  background: #ffffff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 48rpx;
  padding-bottom: 48rpx;
  transform: scale(0.95);
  opacity: 0;
  transition: all 200ms ease-out;

  &--in {
    transform: scale(1);
    opacity: 1;
  }
}

.pcm-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  text-align: center;
  line-height: 1.4;
}

.pcm-subtitle {
  font-size: 28rpx;
  color: #666666;
  text-align: center;
  margin-top: 16rpx;
  line-height: 1.4;
}

.pcm-btn {
  margin-top: 40rpx;
  width: 320rpx;
  height: 88rpx;
  background: #FF4D6A;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 30rpx;
    font-weight: bold;
    color: #ffffff;
  }

  &:active {
    opacity: 0.85;
  }
}
</style>
