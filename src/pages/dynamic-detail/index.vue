<template>
  <view class="detail-page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: (44 + statusBarHeight) + 'px' }">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <text class="nav-title">动态详情</text>
      <view class="nav-right"></view>
    </view>

    <scroll-view
      class="content-scroll"
      scroll-y
      enable-flex
      :style="{ paddingTop: (44 + statusBarHeight) + 'px' }"
    >
      <!-- 动态内容 -->
      <view v-if="detail" class="dynamic-card">
        <view class="card-header">
          <image
            class="author-avatar"
            :src="detail.avatar || icons.common.defaultAvatar"
            mode="aspectFill"
            @error="handleImageError"
          />
          <view class="author-info">
            <text class="author-name">{{ detail.nickname }}</text>
            <text class="publish-time">{{ formatTime(detail.createdAt) }}</text>
          </view>
        </view>

        <view v-if="detail.content" class="card-content">
          <text class="content-text">{{ detail.content }}</text>
        </view>

        <view v-if="detail.images && detail.images.length > 0" class="image-grid" :class="gridClass(detail.images.length)">
          <image
            v-for="(img, idx) in detail.images"
            :key="idx"
            class="grid-image"
            :src="img"
            mode="aspectFill"
            @error="handleImageError"
            @tap="previewImages(detail.images, idx)"
          />
        </view>

        <view class="action-bar">
          <view class="action-item" @tap="toggleLike">
            <text class="action-icon" :class="{ liked: detail.isLiked }">{{ detail.isLiked ? '❤️' : '🤍' }}</text>
            <text class="action-count" v-if="detail.likeCount > 0">{{ detail.likeCount }}</text>
          </view>
          <view class="action-item">
            <text class="action-icon">💬</text>
            <text class="action-count" v-if="comments.length > 0">{{ comments.length }}</text>
          </view>
        </view>
      </view>

      <!-- 评论标题 -->
      <view class="comment-header">
        <text class="comment-title">评论 ({{ comments.length }})</text>
      </view>

      <!-- 评论列表 -->
      <view v-if="comments.length === 0 && !loadingComments" class="empty-comments">
        <text class="empty-text">暂无评论，快来抢沙发吧</text>
      </view>

      <view v-for="c in comments" :key="c.id" class="comment-item">
        <image class="comment-avatar" :src="c.avatar || icons.common.defaultAvatar" mode="aspectFill" @error="handleImageError" />
        <view class="comment-body">
          <view class="comment-top">
            <text class="comment-name">{{ c.nickname }}</text>
            <text class="comment-time">{{ formatTime(c.createdAt) }}</text>
          </view>
          <text class="comment-content">{{ c.content }}</text>
        </view>
      </view>

      <view v-if="loadingComments" class="loading-more">
        <text>加载中...</text>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>

    <!-- 底部评论输入栏 -->
    <view class="comment-bar">
      <input
        class="comment-input"
        v-model="commentText"
        placeholder="写评论..."
        confirm-type="send"
        @confirm="submitComment"
      />
      <text class="send-btn" :class="{ active: commentText.trim() }" @tap="submitComment">发送</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { icons } from '@/config/icons'
import { useUserStore } from '@/store/user'
import { useImageFallback } from '@/composables/useImageFallback'
const { handleImageError } = useImageFallback()

interface DynamicDetail {
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
}

interface CommentItem {
  id: number
  userId: number
  nickname: string
  avatar: string
  content: string
  createdAt: string
}

const userStore = useUserStore()
const dynamicId = ref(0)
const detail = ref<DynamicDetail | null>(null)
const comments = ref<CommentItem[]>([])
const statusBarHeight = ref(0)
const commentText = ref('')
const loadingComments = ref(false)
let hasMounted = false

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

const fetchDetail = async () => {
  try {
    const res: any = await request({
      url: `/dynamics/${dynamicId.value}`,
      method: 'GET',
      skipToast: true,
    })
    const data = res.detail || res
    if (data) {
      detail.value = {
        ...data,
        avatar: data.avatar ? getFullImageUrl(data.avatar) : icons.common.defaultAvatar,
        images: (data.images || []).map((img: string) =>
          img.startsWith('http') ? img : getFullImageUrl(img),
        ),
      }
    }
  } catch (e: any) {
    console.error('获取动态详情失败:', e?.message || e)
  }
}

const fetchComments = async () => {
  loadingComments.value = true
  try {
    const res: any = await request({
      url: `/dynamics/${dynamicId.value}/comments`,
      method: 'GET',
      skipToast: true,
    })
    const list = res.list || res || []
    comments.value = (Array.isArray(list) ? list : []).map((c: any) => ({
      ...c,
      avatar: c.avatar ? getFullImageUrl(c.avatar) : icons.common.defaultAvatar,
    }))
  } catch (e) {
    // 后端评论接口暂未部署，静默处理
    console.log('[动态评论]接口未开通', (e as any)?.message || e)
  } finally {
    loadingComments.value = false
  }
}

const submitComment = async () => {
  const text = commentText.value.trim()
  if (!text) return

  try {
    await request({
      url: `/dynamics/${dynamicId.value}/comments`,
      method: 'POST',
      data: { content: text } as Record<string, unknown>,
      skipToast: true,
    })
    commentText.value = ''
    fetchComments()
    uni.showToast({ title: '评论成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '评论失败，请重试', icon: 'none' })
  }
}

const toggleLike = async () => {
  if (!detail.value) return
  const myId = userStore.userInfo?.id
  if (myId && detail.value.userId === myId) {
    uni.showToast({ title: '不能给自己的动态点赞', icon: 'none' })
    return
  }
  if (detail.value.isLiked) {
    uni.showToast({ title: '已经点过赞了', icon: 'none' })
    return
  }

  try {
    await request({
      url: `/dynamics/${dynamicId.value}/like`,
      method: 'POST',
      skipToast: true,
    } as Record<string, unknown>)
    detail.value.isLiked = true
    detail.value.likeCount++
  } catch (e) {
    uni.showToast({ title: '点赞失败', icon: 'none' })
  }
}

const previewImages = (images: string[], current: number) => {
  uni.previewImage({ urls: images, current })
}

const handleBack = () => {
  uni.navigateBack({ delta: 1 })
}

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20

  if (hasMounted) return
  hasMounted = true

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}
  dynamicId.value = parseInt(options.id) || 0
  if (dynamicId.value) {
    fetchDetail()
    fetchComments()
  }
})
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 100rpx;
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

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.content-scroll {
  height: 100vh;
}

.dynamic-card {
  margin: 16rpx 24rpx;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
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
  margin-bottom: 16rpx;
}

.content-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
  word-break: break-all;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;

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
  padding: 12rpx 0;
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

.comment-header {
  padding: 24rpx 32rpx 16rpx;
}

.comment-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.empty-comments {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
}

.empty-text {
  font-size: 26rpx;
  color: #999;
}

.comment-item {
  display: flex;
  padding: 20rpx 32rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #f5f5f5;
}

.comment-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: #f5f5f5;
}

.comment-body {
  flex: 1;
  margin-left: 16rpx;
}

.comment-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comment-name {
  font-size: 26rpx;
  color: #FF6B9D;
  font-weight: 500;
}

.comment-time {
  font-size: 22rpx;
  color: #ccc;
}

.comment-content {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
  margin-top: 6rpx;
}

.loading-more {
  text-align: center;
  padding: 24rpx 0;
  font-size: 24rpx;
  color: #999;
}

.bottom-safe {
  height: 40rpx;
}

.comment-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  border-top: 1rpx solid #eee;
  z-index: 100;
}

.comment-input {
  flex: 1;
  height: 64rpx;
  background-color: #f5f5f5;
  border-radius: 32rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
}

.send-btn {
  margin-left: 16rpx;
  font-size: 28rpx;
  color: #ccc;
  font-weight: 500;

  &.active {
    color: #FF6B9D;
  }
}
</style>
