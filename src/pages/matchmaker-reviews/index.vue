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
      <view v-else-if="comments.length === 0" class="empty">暂无评语</view>
      <view v-for="item in comments" :key="item.id" class="comment-card" @tap="goToUser(item.userId)">
        <image class="avatar" :src="resolveAvatar(item.matchmaker?.avatar || '')" mode="aspectFill" />
        <view class="body">
          <view class="header">
            <text class="name">{{ item.matchmaker?.name || '红娘' }}</text>
            <view class="stars">
              <text v-for="i in 5" :key="i" :class="i <= item.rating ? 'star on' : 'star'">★</text>
            </view>
          </view>
          <text class="text">{{ item.content }}</text>
          <text class="time">{{ item.createdAt?.slice(0, 10) }}</text>
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
import { icons } from '@/config/icons'
import { getFullImageUrl } from '@/utils/common'
import { useSystemStore } from '@/store/system'

const systemStore = useSystemStore()
const entryName = computed(() => systemStore.quickEntryNames?.[0] || '红娘评语')

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const loading = ref(true)
const comments = ref<any[]>([])

onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  try {
    const res = await get<any>('/matchmaker-comments')
    comments.value = res || []
  } catch (e) { console.error(e) }
  loading.value = false
})

function handleBack() { safeNavigateBack() }
function goToUser(userId: number) { uni.navigateTo({ url: `/pages/user-detail/index?id=${userId}` }) }
function resolveAvatar(avatar: string) { return getFullImageUrl(avatar) || icons.common.defaultAvatar }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.content { height: 100vh; padding: 32rpx; box-sizing: border-box; }
.comment-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; display: flex; align-items: flex-start; }
.avatar { width: 80rpx; height: 80rpx; border-radius: 50%; flex-shrink: 0; }
.body { flex: 1; margin-left: 20rpx; }
.header { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 30rpx; font-weight: bold; color: #333; }
.stars { display: flex; }
.star { font-size: 28rpx; color: #ddd; &.on { color: #f5a623; } }
.text { font-size: 28rpx; color: #666; margin-top: 12rpx; line-height: 1.6; }
.time { font-size: 24rpx; color: #999; margin-top: 8rpx; }
.loading, .empty { text-align: center; padding: 100rpx 0; color: #999; font-size: 28rpx; }
.bottom-safe { height: 60rpx; }
</style>
