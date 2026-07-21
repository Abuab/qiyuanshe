<template>
  <view v-if="show" class="back-top-btn" @tap="handleTap">
    <image class="back-top-icon" src="/static/icons/rocket.png" mode="aspectFit" />
  </view>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'click'): void
}>()

defineProps<{
  show: boolean
}>()

const handleTap = () => {
  emit('click')
}
</script>

<style lang="scss" scoped>
.back-top-btn {
  position: fixed;
  right: 20rpx;
  bottom: 240rpx;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(180deg, #FFB3C6 0%, #FFD1DC 40%, #FFFFFF 100%);
  box-shadow: 0 4rpx 16rpx rgba(214, 51, 132, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 998;
}

.back-top-icon {
  width: 48rpx;
  height: 48rpx;
}
</style>
