<template>
  <view class="page">
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">{{ entryName }}</text>
        <view class="nav-right"></view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }">
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else class="grid">
        <view v-for="c in circles" :key="c.id" class="circle-card" @tap="goToPosts(c.id, c.name)">
          <image class="circle-icon" :src="c.icon || '/static/default-avatar.png'" mode="aspectFill" />
          <text class="circle-name">{{ c.name }}</text>
        </view>
      </view>
      <view class="bottom-safe"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { get } from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import { useSystemStore } from '@/store/system'

const systemStore = useSystemStore()
const entryName = computed(() => systemStore.quickEntryNames?.[2] || '相亲圈子')

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const loading = ref(true)
const circles = ref<any[]>([])

onMounted(async () => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  try {
    const res = await get<any>('/circles')
    circles.value = Array.isArray(res) ? res : (res?.list || [])
  } catch (e) { console.error(e) }
  loading.value = false
})

function handleBack() { safeNavigateBack() }
function goToPosts(id: number, name: string) {
  uni.navigateTo({ url: `/pages/circle-posts/index?id=${id}&name=${encodeURIComponent(name)}` })
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.content { height: 100vh; padding: 32rpx; box-sizing: border-box; }
.grid { display: flex; flex-wrap: wrap; }
.circle-card { width: calc(33.33% - 20rpx); margin: 10rpx; padding: 24rpx; background: #fff; border-radius: 16rpx; display: flex; flex-direction: column; align-items: center; }
.circle-icon { width: 100rpx; height: 100rpx; border-radius: 50%; }
.circle-name { font-size: 26rpx; color: #333; margin-top: 12rpx; }
.loading { text-align: center; padding: 100rpx 0; color: #999; font-size: 28rpx; }
.bottom-safe { height: 60rpx; }
</style>
