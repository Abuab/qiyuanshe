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
  bottom: 200rpx;
  z-index: 998;
}

.back-top-icon {
  width: 72rpx;
  height: 72rpx;
}
</style>
