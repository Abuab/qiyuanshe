<template>
  <view class="page">
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">{{ circleName }}</text>
        <view class="nav-right" @tap="goToPublish"><text class="publish-btn">发帖</text></view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }" @scrolltolower="loadMore">
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="posts.length === 0" class="empty">暂无帖子，快来发布第一个吧</view>
      <view v-for="p in posts" :key="p.id" class="post-card">
        <text class="post-content">{{ p.content }}</text>
        <view v-if="p.images?.length" class="post-images">
          <image v-for="(img, idx) in p.images" :key="idx" :src="img" mode="widthFix" class="post-img" />
        </view>
        <view class="post-footer">
          <text class="post-time">{{ p.createdAt?.slice(0, 16) }}</text>
          <view class="post-actions">
            <text class="action">❤ {{ p.likes || 0 }}</text>
            <text class="action">💬 {{ p.comments || 0 }}</text>
          </view>
        </view>
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
const posts = ref<any[]>([])
const page = ref(1)
const noMore = ref(false)
const circleId = ref(0)
const circleName = ref('')

onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  const pages = getCurrentPages()
  const opts = (pages[pages.length - 1] as any).options || {}
  circleId.value = +opts.id
  circleName.value = decodeURIComponent(opts.name || '帖子列表')
  await fetchPosts()
})

async function fetchPosts() {
  try {
    const res = await get<any>(`/circles/${circleId.value}/posts?page=${page.value}&limit=10`)
    const list = res?.list || []
    if (page.value === 1) posts.value = list
    else posts.value = posts.value.concat(list)
    noMore.value = list.length < 10
  } catch (e) { console.error(e) }
  loading.value = false
}

function loadMore() {
  if (noMore.value) return
  page.value++
  fetchPosts()
}

function handleBack() { safeNavigateBack() }
function goToPublish() {
  uni.navigateTo({ url: `/pages/circle-publish/index?id=${circleId.value}&name=${encodeURIComponent(circleName.value)}` })
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 120rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.publish-btn { font-size: 28rpx; color: #e7412b; }
.content { height: 100vh; padding: 32rpx; box-sizing: border-box; }
.post-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.post-content { font-size: 28rpx; color: #333; line-height: 1.6; }
.post-images { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.post-img { width: calc(33.33% - 8rpx); margin: 4rpx; border-radius: 8rpx; }
.post-footer { display: flex; justify-content: space-between; margin-top: 16rpx; }
.post-time { font-size: 24rpx; color: #999; }
.post-actions { display: flex; gap: 24rpx; }
.action { font-size: 24rpx; color: #999; }
.loading, .empty, .no-more { text-align: center; padding: 40rpx 0; color: #999; font-size: 26rpx; }
.bottom-safe { height: 60rpx; }
</style>
