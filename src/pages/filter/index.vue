<template>
  <view class="filter-page">
    <filter-panel
      ref="panelRef"
      @confirm="handleConfirm"
      @reset="handleReset"
    />
  </view>
</template>

<script setup lang="ts">
import FilterPanel from '@/components/filter-panel/filter-panel.vue'
import { useFilterStore, FilterData } from '@/store/filter'
import { ref, onMounted } from 'vue'

const filterStore = useFilterStore()
const panelRef = ref<InstanceType<typeof FilterPanel>>()

onMounted(() => {
  // 确保面板显示（prop 同步在 uni-app 中可能不可靠，改用 open() 方法）
  // 过滤组件初始 visible=false，必须主动调 open()
  panelRef.value?.open()
})

const handleConfirm = (data: FilterData) => {
  // 双保险：store 存一份（无论首页如何打开都能读到）
  filterStore.setFilter(data)

  // EventChannel 作为主通道（直接 navigateTo 时可用）
  const pages = getCurrentPages()
  const prevPage = pages[pages.length - 2]
  if (prevPage) {
    const eventChannel = (prevPage as Record<string, unknown>).getOpenerEventChannel as
      | (() => { emit: (event: string, data: FilterData) => void })
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
  background-color: #f5f5f5;
}
</style>
