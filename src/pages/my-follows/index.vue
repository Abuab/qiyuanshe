<template>
  <view class="page">
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">我的关注</text>
        <view class="nav-right"></view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }" @scrolltolower="loadMore">
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="follows.length === 0" class="empty">暂无关注</view>
      <view v-for="f in follows" :key="f.id" class="follow-card" @tap="goToUser(f.id)">
        <image class="avatar" :src="f.avatar || '/static/default-avatar.png'" mode="aspectFill" />
        <view class="info">
          <text class="name">{{ f.nickname || '用户' }}</text>
        </view>
        <view class="unfollow-btn" @tap.stop="handleUnfollow(f.id)"><text>取消关注</text></view>
      </view>
      <view v-if="noMore" class="no-more">— 没有更多了 —</view>
      <view class="bottom-safe"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get, del } from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const loading = ref(true)
const follows = ref<any[]>([])
const page = ref(1)
const noMore = ref(false)

onMounted(async () => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  await fetchFollows()
})

async function fetchFollows() {
  try {
    const res = await get<any>(`/users/follows?page=${page.value}&limit=20`)
    const items = res?.list || []
    if (page.value === 1) follows.value = items
    else follows.value = follows.value.concat(items)
    noMore.value = items.length < 20
  } catch (e) { console.error(e) }
  loading.value = false
}

function loadMore() {
  if (noMore.value) return
  page.value++
  fetchFollows()
}

async function handleUnfollow(userId: number) {
  try {
    await del(`/users/${userId}/follow`)
    follows.value = follows.value.filter(f => f.targetUserId !== userId)
    uni.showToast({ title: '已取消关注', icon: 'none' })
  } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }) }
}

function handleBack() { safeNavigateBack() }
function goToUser(id: number) { uni.navigateTo({ url: `/pages/user-detail/index?id=${id}` }) }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.content { height: 100vh; padding: 32rpx; box-sizing: border-box; }
.follow-card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.avatar { width: 88rpx; height: 88rpx; border-radius: 50%; }
.info { flex: 1; margin-left: 20rpx; }
.name { font-size: 30rpx; color: #333; }
.unfollow-btn { padding: 12rpx 24rpx; border: 1rpx solid #e7412b; border-radius: 30rpx; }
.unfollow-btn text { font-size: 24rpx; color: #e7412b; }
.loading, .empty, .no-more { text-align: center; padding: 100rpx 0; color: #999; font-size: 28rpx; }
.bottom-safe { height: 60rpx; }
</style>
