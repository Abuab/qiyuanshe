<template>
  <view class="page">
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">我们脱单了</text>
        <view class="nav-right"></view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }" @scrolltolower="loadMore">
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="list.length === 0" class="empty">暂无案例</view>
      <view v-for="item in list" :key="item.id" class="case-card" @tap="goToDetail(item.id)">
        <image class="cover" :src="item.cover" mode="aspectFill" />
        <text class="title">{{ item.title }}</text>
      </view>
      <view v-if="noMore" class="no-more">— 没有更多了 —</view>
      <view class="bottom-safe"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const loading = ref(true)
const list = ref<any[]>([])
const page = ref(1)
const noMore = ref(false)

onMounted(async () => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  await fetchList()
})

async function fetchList() {
  try {
    const res = await get<any>(`/success-cases?page=${page.value}&limit=10`)
    const items = res?.list || []
    if (page.value === 1) list.value = items
    else list.value = list.value.concat(items)
    noMore.value = items.length < 10
  } catch (e) { console.error(e) }
  loading.value = false
}

function loadMore() {
  if (noMore.value) return
  page.value++
  fetchList()
}

function handleBack() { safeNavigateBack() }
function goToDetail(id: number) { uni.navigateTo({ url: `/pages/success-case-detail/index?id=${id}` }) }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.content { height: 100vh; padding: 32rpx; box-sizing: border-box; }
.case-card { background: #fff; border-radius: 16rpx; overflow: hidden; margin-bottom: 24rpx; }
.cover { width: 100%; height: 360rpx; }
.title { display: block; font-size: 30rpx; font-weight: bold; color: #333; padding: 20rpx 24rpx; }
.loading, .empty, .no-more { text-align: center; padding: 100rpx 0; color: #999; font-size: 28rpx; }
.bottom-safe { height: 60rpx; }
</style>
