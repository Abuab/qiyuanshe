<template>
  <view class="filter-page">
    <filter-panel
      :show="true"
      @confirm="handleConfirm"
      @reset="handleReset"
    />
  </view>
</template>

<script setup lang="ts">
import FilterPanel from '@/components/filter-panel/filter-panel.vue'

const handleConfirm = (data: any) => {
  const pages = getCurrentPages()
  const prevPage = pages[pages.length - 2]
  if (prevPage) {
    const eventChannel = (prevPage as any).getOpenerEventChannel?.()
    if (eventChannel) {
      eventChannel.emit('filterConfirm', data)
    }
  }
  uni.navigateBack()
}

const handleReset = () => {
  const pages = getCurrentPages()
  const prevPage = pages[pages.length - 2]
  if (prevPage) {
    const eventChannel = (prevPage as any).getOpenerEventChannel?.()
    if (eventChannel) {
      eventChannel.emit('filterReset')
    }
  }
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.filter-page {
  min-height: 100vh;
}
</style>
