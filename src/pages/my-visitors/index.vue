<template>
  <view class="page">
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">谁看过我</text>
        <view class="nav-right"></view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }">
      <!-- 非VIP提示 -->
      <view v-if="!isVip" class="vip-tip">
        <text class="vip-tip-title">开通会员查看完整访客列表</text>
        <text class="vip-tip-desc">升级VIP，查看谁在关注你</text>
        <button class="vip-btn" @tap="goToVip">立即开通</button>
      </view>
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="visitors.length === 0" class="empty">暂无访客</view>
      <view v-for="v in visitors" :key="v.id" class="visitor-card" @tap="goToUser(v.visitorUserId)">
        <image class="avatar" :src="v.visitorUser?.avatar || '/static/default-avatar.png'" mode="aspectFill" />
        <text class="name">{{ v.visitorUser?.nickname || '神秘访客' }}</text>
        <text class="time">{{ v.createdAt?.slice(0, 16) }}</text>
      </view>
      <view class="bottom-safe"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'
import { useUserStore } from '@/store/user'
import { safeNavigateBack } from '@/utils/navigate'

const userStore = useUserStore()
const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const loading = ref(true)
const visitors = ref<any[]>([])
const isVip = ref(false)

onMounted(async () => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  isVip.value = !!(userStore.userInfo as any)?.vipExpireAt && new Date((userStore.userInfo as any).vipExpireAt) > new Date()
  try {
    const res = await get<any>('/users/visitors?limit=10')
    visitors.value = res?.list || []
  } catch (e) { console.error(e) }
  loading.value = false
})

function handleBack() { safeNavigateBack() }
function goToUser(id: number) { uni.navigateTo({ url: `/pages/user-detail/index?id=${id}` }) }
function goToVip() { uni.navigateTo({ url: '/pages/vip/index' }) }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.content { height: 100vh; padding: 32rpx; box-sizing: border-box; }
.vip-tip { background: linear-gradient(135deg, #fce4c8, #fdd9a6); border-radius: 16rpx; padding: 40rpx; text-align: center; margin-bottom: 24rpx; }
.vip-tip-title { display: block; font-size: 30rpx; color: #333; font-weight: bold; }
.vip-tip-desc { display: block; font-size: 26rpx; color: #666; margin-top: 8rpx; }
.vip-btn { margin-top: 24rpx; background: linear-gradient(135deg, #d4a574, #c9965a); color: #fff; border-radius: 40rpx; height: 72rpx; line-height: 72rpx; font-size: 28rpx; width: 300rpx; }
.visitor-card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.avatar { width: 80rpx; height: 80rpx; border-radius: 50%; }
.name { flex: 1; margin-left: 20rpx; font-size: 28rpx; color: #333; }
.time { font-size: 24rpx; color: #999; }
.loading, .empty { text-align: center; padding: 100rpx 0; color: #999; font-size: 28rpx; }
.bottom-safe { height: 60rpx; }
</style>
