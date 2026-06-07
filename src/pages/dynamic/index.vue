<template>
  <view class="dynamic-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: (44 + statusBarHeight) + 'px' }">
      <view class="nav-left">
        <text class="back-icon" @tap="handleBack">←</text>
      </view>
      <text class="nav-title">动态</text>
      <view class="nav-right"><text class="pub-text" @tap="goToPublish">+ 发布</text></view>
    </view>

    <scroll-view
      class="content-scroll"
      scroll-y
      enable-flex
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
      :style="{ paddingTop: (44 + statusBarHeight) + 'px' }"
    >
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无动态，快去发布第一条吧</text>
      </view>

      <view
        v-for="item in list"
        :key="item.id"
        class="dynamic-card"
      >
        <!-- 顶部：头像 + 昵称 + 时间 -->
        <view class="card-header">
          <image
            class="author-avatar"
            :src="item.avatar || icons.common.defaultAvatar"
            mode="aspectFill"
            @error="handleImageError"
            @tap="goToUserDetail(item.userId)"
          />
          <view class="author-info">
            <text class="author-name">{{ item.nickname }}</text>
            <text class="publish-time">{{ formatTime(item.createdAt) }}</text>
          </view>
        </view>

        <!-- 文字内容 -->
        <view v-if="item.content" class="card-content">
          <text class="content-text">{{ item.content }}</text>
        </view>

        <!-- 图片网格 -->
        <view v-if="item.images && item.images.length > 0" class="image-grid" :class="gridClass(item.images.length)">
          <image
            v-for="(img, idx) in item.images"
            :key="idx"
            class="grid-image"
            :src="img"
            mode="aspectFill"
            @error="handleImageError"
            @tap="previewImages(item.images, idx)"
          />
        </view>

        <!-- 操作栏 -->
        <view class="action-bar">
          <view class="action-item" @tap="toggleLike(item)">
            <text class="action-icon" :class="{ liked: item.isLiked }">{{ item.isLiked ? '❤️' : '🤍' }}</text>
            <text class="action-count" v-if="item.likeCount > 0">{{ item.likeCount }}</text>
          </view>
          <view class="action-item" @tap="goComment(item)">
            <text class="action-icon">💬</text>
            <text class="action-count" v-if="item.commentCount > 0">{{ item.commentCount }}</text>
          </view>
          <view class="action-item" @tap="shareDynamic(item)">
            <text class="action-icon">↗</text>
            <text class="action-count">分享</text>
          </view>
        </view>

        <!-- 点赞用户列表 -->
        <view v-if="item.likeUsers && item.likeUsers.length > 0" class="like-users">
          <text class="like-icon">❤️</text>
          <text
            v-for="(u, idx) in item.likeUsers"
            :key="u.id"
            class="like-user-name"
            @tap="goToUserDetail(u.id)"
          >
            {{ u.nickname }}<text v-if="idx < item.likeUsers.length - 1">、</text>
          </text>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <text>加载中...</text>
      </view>

      <view v-if="noMore && list.length > 0" class="no-more">
        <text>没有更多了</text>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>

    <!-- 悬浮发布按钮（移到 scroll-view 外，不受滚动影响） -->
    <view class="fab-publish" @tap="goToPublish">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { icons } from '@/config/icons'
import { safeNavigateBack } from '@/utils/navigate'
import { useUserStore } from '@/store/user'
import { useImageFallback } from '@/composables/useImageFallback'
const { handleImageError } = useImageFallback()

interface LikeUser {
  id: number
  nickname: string
}

interface DynamicItem {
  id: number
  userId: number
  nickname: string
  avatar: string
  content: string
  images: string[]
  createdAt: string
  likeCount: number
  commentCount: number
  isLiked: boolean
  likeUsers: LikeUser[]
}

const list = ref<DynamicItem[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const isRefreshing = ref(false)
const noMore = ref(false)
const page = ref(1)
const pageSize = 10
const statusBarHeight = ref(0)
const userStore = useUserStore()

const formatTime = (dateStr: string): string => {
  if (!dateStr) return ''
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}小时前`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day}天前`
  const d = new Date(date)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const gridClass = (count: number): string => {
  if (count === 1) return 'grid-1'
  if (count === 2) return 'grid-2'
  return 'grid-3'
}

const fetchList = async (reset = false) => {
  if (reset) {
    page.value = 1
    noMore.value = false
  }
  if (noMore.value || loadingMore.value) return

  loadingMore.value = true
  try {
    const res = await request<{ list: DynamicItem[] }>({
      url: '/dynamics',
      method: 'GET',
      data: { page: page.value, limit: pageSize } as Record<string, unknown>,
    })

    const data = res as unknown as { list: DynamicItem[]; total?: number } | DynamicItem[]
    const items = Array.isArray(data) ? data : data.list || []

    // 补全图片 URL
    const processed = items.map((item: DynamicItem) => ({
      ...item,
      avatar: item.avatar ? getFullImageUrl(item.avatar) : icons.common.defaultAvatar,
      images: (item.images || []).map((img: string) =>
        img.startsWith('http') ? img : getFullImageUrl(img),
      ),
    }))

    if (reset) {
      list.value = processed
    } else {
      list.value = [...list.value, ...processed]
    }

    if (items.length < pageSize) {
      noMore.value = true
    } else {
      page.value++
    }
  } catch (e) {
    console.error('fetch dynamics error', e)
  } finally {
    loading.value = false
    loadingMore.value = false
    isRefreshing.value = false
  }
}

const onRefresh = () => {
  isRefreshing.value = true
  fetchList(true)
}

const onLoadMore = () => {
  fetchList(false)
}

const toggleLike = async (item: DynamicItem & { likeLoading?: boolean }) => {
  // 不能给自己的动态点赞
  const myId = userStore.userInfo?.id
  if (myId && item.userId === myId) {
    uni.showToast({ title: '不能给自己的动态点赞', icon: 'none' })
    return
  }
  // 已经点过赞了
  if (item.isLiked) {
    uni.showToast({ title: '已经点过赞了', icon: 'none' })
    return
  }
  if (item.likeLoading) return
  item.likeLoading = true

  try {
    await request({
      url: `/dynamics/${item.id}/like`,
      method: 'POST',
    } as Record<string, unknown>)
    item.isLiked = true
    item.likeCount++

    // 刷新该动态的点赞列表
    await refreshLikeUsers(item)
  } catch (e) {
    uni.showToast({ title: '点赞失败', icon: 'none' })
  } finally {
    item.likeLoading = false
  }
}

const refreshLikeUsers = async (item: DynamicItem) => {
  try {
    const res = await request<{ likeUsers: LikeUser[] }>({
      url: `/dynamics/${item.id}/like-users`,
      method: 'GET',
    })
    const data = res as unknown as { likeUsers: LikeUser[] }
    if (data.likeUsers) {
      item.likeUsers = data.likeUsers
    }
  } catch (e) {
    // 静默
  }
}

const previewImages = (images: string[], current: number) => {
  uni.previewImage({
    urls: images,
    current,
  })
}

const goToUserDetail = (userId: number) => {
  uni.navigateTo({
    url: `/pages/user-detail/index?id=${userId}`,
  })
}

const goToPublish = () => {
  uni.navigateTo({
    url: '/pages/dynamic-publish/index',
  })
}

const shareDynamic = (item: DynamicItem) => {
  uni.showToast({ title: '请点击右上角分享', icon: 'none' })
}

const goComment = (item: DynamicItem) => {
  uni.navigateTo({ url: `/pages/dynamic-detail/index?id=${item.id}` })
}

const handleBack = () => {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  fetchList(true)
})
</script>

<style lang="scss" scoped>
.dynamic-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background-color: #fff;
  z-index: 100;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.nav-left,
.nav-right {
  width: 120rpx;
}

.back-icon {
  font-size: 36rpx;
  color: #FF6B9D;
  font-weight: bold;
}

.pub-text {
  font-size: 28rpx;
  color: #FF6B9D;
  font-weight: 500;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.content-scroll {
  height: 100vh;
  padding-bottom: 160rpx;
}

.empty-state {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.dynamic-card {
  margin: 20rpx 24rpx;
  padding: 28rpx 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.author-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

.author-info {
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
}

.author-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.publish-time {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.card-content {
  margin-bottom: 20rpx;
  padding: 0 4rpx;
}

.content-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.7;
  word-break: break-all;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 20rpx;
  padding: 0 4rpx;

  &.grid-1 .grid-image {
    width: 400rpx;
    height: 400rpx;
    border-radius: 12rpx;
    background-color: #f5f5f5;
  }

  &.grid-2 .grid-image {
    width: calc(50% - 4rpx);
    height: 340rpx;
    border-radius: 12rpx;
    background-color: #f5f5f5;
  }

  &.grid-3 .grid-image {
    width: calc(33.33% - 6rpx);
    height: 220rpx;
    border-radius: 12rpx;
    background-color: #f5f5f5;
  }
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 48rpx;
  padding: 16rpx 4rpx 12rpx;
  border-top: 1rpx solid #f0f0f0;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.action-icon {
  font-size: 28rpx;

  &.liked {
    color: #FF6B9D;
  }
}

.action-count {
  font-size: 24rpx;
  color: #999;
}

.like-users {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 12rpx 4rpx 0;
}

.like-icon {
  font-size: 22rpx;
  margin-right: 6rpx;
}

.like-user-name {
  font-size: 22rpx;
  color: #FF6B9D;
}

.loading-more,
.no-more {
  text-align: center;
  padding: 32rpx 0;
  font-size: 24rpx;
  color: #999;
}

.bottom-safe {
  height: 40rpx;
}

.fab-publish {
  position: fixed;
  right: 40rpx;
  bottom: calc(140rpx + env(safe-area-inset-bottom));
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(255, 107, 157, 0.4);
  z-index: 100;

  .fab-icon {
    font-size: 48rpx;
    color: #fff;
    font-weight: bold;
    line-height: 1;
  }

  &:active {
    transform: scale(0.95);
  }
}
</style>
