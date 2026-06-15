<template>
  <view class="message-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">消息</view>
      <view class="nav-right" />
    </view>

    <scroll-view
      class="message-list"
      scroll-y
      enable-flex
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      @refresherrefresh="onRefresh"
      :refresher-triggered="refreshing"
    >
      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>

      <view v-if="!loading && messageList.length === 0" class="empty-tip">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无消息</text>
      </view>

      <view
        v-for="item in messageList"
        :key="item.id"
        class="message-item"
        @tap="handleClick(item)"
      >
        <view v-if="item.type === 'system'" class="system-message">
          <view class="system-icon">
            <text>🔔</text>
          </view>
          <view class="message-content">
            <view class="message-header">
              <text class="message-title">系统通知</text>
              <text class="message-time">{{ formatTime(item.createdAt) }}</text>
            </view>
            <text class="message-preview">{{ item.content }}</text>
          </view>
          <view v-if="item.unreadCount > 0" class="unread-badge">
            <text>{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</text>
          </view>
        </view>

        <view v-else class="user-message" @tap.stop="goToChat(item)">
          <image
            class="user-avatar"
            :src="item.avatar || icons.common.defaultAvatar"
            mode="aspectFill"
            lazy-load
          />
          <view class="message-content">
            <view class="message-header">
              <text class="message-title">{{ item.nickname }}</text>
              <text class="message-time">{{ formatTime(item.createdAt) }}</text>
            </view>
            <text class="message-preview">{{ isImagePreview(item) ? '[图片]' : item.lastMessage }}</text>
          </view>
          <view v-if="item.unreadCount > 0" class="unread-badge">
            <text>{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</text>
          </view>
        </view>
      </view>

      <view v-if="!loading && noMore && messageList.length > 0" class="no-more-tip">
        <text>没有更多了</text>
      </view>
    </scroll-view>
  </view>

  <tab-bar />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import { onShow } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import { useUserStore } from '@/store/user'
import { icons } from '@/config/icons'
import { logger } from '@/utils/logger'

interface SystemMessage {
  id: number
  type: 'system'
  content: string
  createdAt: string
  unreadCount: number
}

interface UserMessage {
  id: number
  type: 'user'
  userId: number
  nickname: string
  avatar: string
  lastMessage: string
  messageType?: string
  createdAt: string
  unreadCount: number
}

type MessageItem = SystemMessage | UserMessage

const userStore = useUserStore()
const messageList = ref<MessageItem[]>([])
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const page = ref(1)
let fetchLock = false // 防止 onMounted + onShow 并发导致重复请求

onMounted(() => {
  if (userStore.isLoggedIn) {
    fetchConversations()
  }
})

onShow(() => {
  if (userStore.isLoggedIn) {
    fetchConversations(true)
  }
})

const fetchConversations = async (isRefresh = false) => {
  if (fetchLock) return
  fetchLock = true
  try {
    if (isRefresh) {
      page.value = 1
      noMore.value = false
    }

    loading.value = true

    // 并行获取聊天会话 + 系统通知
    const [chatRes, notifyRes] = await Promise.all([
      request({
        url: '/chat/conversations',
        method: 'GET',
        data: { page: page.value },
      }).catch(() => ({ list: [] })),
      request({
        url: '/notifications',
        method: 'GET',
        data: { page: 1, limit: 99 },
      }).catch(() => ({ data: { list: [], unreadCount: 0 } })),
    ])

    const chatList = (chatRes.list || []).map((item: any) => ({
      ...item,
      type: 'user',
    }))

    const notifyData = notifyRes?.data || notifyRes || {}
    const notifyList: SystemMessage[] = ((notifyData.list || []) as any[]).map((n: any) => ({
      id: n.id,
      type: 'system' as const,
      content: `[${n.title || '系统通知'}] ${n.content}`,
      createdAt: n.createdAt,
      unreadCount: n.isRead === 0 ? 1 : 0,
    }))

    // 更新未读数
    const totalUnread = chatList.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0)
      + (notifyData.unreadCount || 0)
    uni.setStorageSync('unreadMessageCount', totalUnread)

    // 合并：通知在前，聊天在后
    const mergedList = [...notifyList, ...chatList]

    if (isRefresh) {
      messageList.value = mergedList
      refreshing.value = false
    } else {
      if (page.value === 1) {
        messageList.value = mergedList
      } else {
        messageList.value.push(...chatList)
      }
    }

    if (chatList.length < 20) {
      noMore.value = true
    }

    page.value++
  } catch (e) {
    logger.error('fetch conversations error', e)
    refreshing.value = false
  } finally {
    loading.value = false
    fetchLock = false
  }
}

const loadMore = () => {
  if (!loading.value && !noMore.value) {
    fetchConversations()
  }
}

const onRefresh = () => {
  refreshing.value = true
  fetchConversations(true)
}

const handleBack = () => {
  safeNavigateBack()
}

const handleClick = (item: MessageItem) => {
  if (item.type === 'system') {
    showSystemDetail(item)
  }
}

const showSystemDetail = (item: SystemMessage) => {
  uni.showModal({
    title: '系统通知',
    content: item.content,
    showCancel: false,
    success: async () => {
      // 标记已读
      try {
        await request({
          url: `/notifications/${item.id}/read`,
          method: 'PUT',
        })
        // 从列表中移除该条目的未读数
        const idx = messageList.value.findIndex((m) => m.id === item.id)
        if (idx !== -1) {
          messageList.value[idx] = { ...messageList.value[idx], unreadCount: 0 }
        }
        // 重新计算并保存未读总数
        const totalUnread = messageList.value.reduce((sum: number, m: MessageItem) => sum + m.unreadCount, 0)
        uni.setStorageSync('unreadMessageCount', totalUnread)
      } catch {
        // 静默
      }
    },
  })
}

const goToChat = (item: UserMessage) => {
  uni.navigateTo({
    url: `/pages/chat/index?userId=${item.userId}&nickname=${encodeURIComponent(item.nickname)}&avatar=${encodeURIComponent(item.avatar || '')}`,
  })
}

const formatTime = (timeStr: string) => {
  if (!timeStr) return ''

  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return `${date.getMonth() + 1}-${date.getDate()}`
}

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i

function isImagePreview(item: UserMessage): boolean {
  if (item.messageType === 'image') return true
  return IMAGE_EXT_RE.test(item.lastMessage || '')
}
</script>

<style lang="scss" scoped>
.message-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF0F3 0%, #FFF5F5 25%, #FFFFFF 50%, #f5f5f5 100%);
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background-color: transparent;
  z-index: 100;
  box-shadow: none;
}

.nav-left,
.nav-right {
  width: 100rpx;
}

.nav-left {
  display: flex;
  align-items: center;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.message-list {
  height: calc(100vh - 88rpx);
  padding-top: 88rpx;
  padding-bottom: 120rpx;
}

.loading-tip,
.empty-tip,
.no-more-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.message-item {
  background-color: #fff;
  margin-bottom: 2rpx;
}

.system-message,
.user-message {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
}

.system-icon {
  width: 96rpx;
  height: 96rpx;
  background-color: #E3F2FD;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;

  text {
    font-size: 48rpx;
  }
}

.user-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.message-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.message-time {
  font-size: 24rpx;
  color: #999;
}

.message-preview {
  font-size: 26rpx;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-badge {
  min-width: 36rpx;
  height: 36rpx;
  background-color: #FF6B9D;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10rpx;
  margin-left: 16rpx;
  flex-shrink: 0;

  text {
    font-size: 22rpx;
    color: #fff;
  }
}

.no-more-tip {
  padding: 32rpx 0;
  font-size: 24rpx;
  color: #999;
}
</style>
