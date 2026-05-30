<template>
  <view class="matchmaker-btn" @tap="handleClick" @touchstart="onTouchStart" @touchend="onTouchEnd">
    <image v-if="iconSrc" class="btn-icon" :src="iconSrc" mode="aspectFit" />
    <view v-else class="btn-text">
      <text class="hi-text">Hi</text>
      <text class="label-text">红娘</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  iconSrc?: string
}

withDefaults(defineProps<Props>(), {
  iconSrc: '/static/matchmaker.png',
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const isPressed = ref(false)

const handleClick = () => {
  emit('click')
}

const onTouchStart = () => {
  isPressed.value = true
}

const onTouchEnd = () => {
  isPressed.value = false
}
</script>

<style lang="scss" scoped>
.matchmaker-btn {
  position: fixed;
  right: 20rpx;
  bottom: 180rpx;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B9D, #FF8FB0);
  box-shadow: 0 4rpx 20rpx rgba(255, 107, 157, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.95);
  }
}

.btn-icon {
  width: 80rpx;
  height: 80rpx;
}

.btn-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hi-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #fff;
  line-height: 1.2;
}

.label-text {
  font-size: 20rpx;
  color: #fff;
  line-height: 1.2;
}
</style>
