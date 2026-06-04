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
import { useFilterStore } from '@/store/filter'

const filterStore = useFilterStore()

const handleConfirm = (data: Record<string, unknown>) => {
  // 双保险：store 存一份（无论首页如何打开都能读到）
  filterStore.setFilter(data)

  // EventChannel 作为主通道（直接 navigateTo 时可用）
  const pages = getCurrentPages()
  const prevPage = pages[pages.length - 2]
  if (prevPage) {
    const eventChannel = (prevPage as Record<string, unknown>).getOpenerEventChannel as
      | (() => { emit: (event: string, data: Record<string, unknown>) => void })
      | undefined
    const channel = eventChannel?.()
    if (channel) {
      channel.emit('filterConfirm', data)
    }
  }
  uni.navigateBack()
}

const handleReset = () => {
  filterStore.clearFilter()
  const pages = getCurrentPages()
  const prevPage = pages[pages.length - 2]
  if (prevPage) {
    const eventChannel = (prevPage as Record<string, unknown>).getOpenerEventChannel as
      | (() => { emit: (event: string, ...args: unknown[]) => void })
      | undefined
    const channel = eventChannel?.()
    if (channel) {
      channel.emit('filterReset')
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
