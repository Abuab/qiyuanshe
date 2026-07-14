<template>
  <view class="message-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: (44 + statusBarHeight) + 'px' }">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">消息列表</view>
      <view class="nav-right" />
    </view>

    <scroll-view
      class="message-list"
      :style="{ paddingTop: (44 + statusBarHeight) + 'px', height: 'calc(100vh - 120rpx - ' + (44 + statusBarHeight) + 'px)' }"
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
        <!-- 系统消息聚合入口 -->
        <view v-if="item.type === 'systemAggregate'" class="system-message aggregate">
          <view class="system-icon pink-heart-icon">
            <image v-if="systemNotifyIcon" :src="systemNotifyIcon" mode="aspectFit" class="system-icon-img" />
            <text v-else>💕</text>
          </view>
          <view class="message-content">
            <view class="message-header">
              <view class="title-row">
                <text class="message-title">系统消息</text>
                <view class="official-tag"><text>官方</text></view>
              </view>
              <text class="message-time">{{ formatTime(item.createdAt) }}</text>
            </view>
            <text class="message-preview">{{ item.content }}</text>
          </view>
          <view v-if="item.unreadCount > 0" class="unread-badge">
            <text>{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</text>
          </view>
        </view>

        <!-- 用户聊天项 -->
        <view v-else class="user-message" @tap.stop="goToChat(item)">
          <view class="delete-btn" @tap.stop="confirmDelete(item)">✕</view>
          <image
            class="user-avatar"
            :src="item.avatar || icons.common.defaultAvatar"
            mode="aspectFill"
            lazy-load
          />
          <view class="message-content">
            <view class="message-header">
              <text class="message-title">{{ item.displayName || item.nickname }}</text>
              <text class="message-time">{{ formatTime(item.createdAt) }}</text>
            </view>
            <text class="message-preview">{{ isImagePreview(item) ? '[图片]' : item.lastMessage }}</text>
          </view>
          <view v-if="item.unreadCount > 0" class="unread-badge">
            <text>{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</text>
          </view>
          <!-- 删除按钮 -->
          <view class="delete-btn" @tap.stop="confirmDelete(item)">
            <text>删除</text>
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
import { ref, onMounted, computed } from 'vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import { onShow } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { icons } from '@/config/icons'
import { logger } from '@/utils/logger'
import { useIcon } from '@/composables/useIcon'

const systemStore = useSystemStore()

interface SystemAggregate {
  id: number
  type: 'systemAggregate'
  content: string
  createdAt: string
  unreadCount: number
}

interface UserMessage {
  id: number
  type: 'user'
  userId: string      // 6位公开ID
  nickname: string
  displayName?: string
  avatar: string
  lastMessage: string
  messageType?: string
  createdAt: string
  unreadCount: number
}

type MessageItem = SystemAggregate | UserMessage

const userStore = useUserStore()
const { getPageIcon } = useIcon()
const statusBarHeight = ref(0)
const messageList = ref<MessageItem[]>([])
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const page = ref(1)
let fetchLock = false // 防止 onMounted + onShow 并发导致重复请求

// 系统通知图标（后台可配置）
const systemNotifyIcon = computed(() => {
  return getPageIcon('systemNotify') || ''
})

onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
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

    // 并行获取聊天会话 + 系统通知未读数
    const [chatRes, notifyRes] = await Promise.all([
      request({
        url: '/chat/conversations',
        method: 'GET',
        data: { page: page.value },
      }).catch(() => ({ list: [] })),
      request({
        url: '/notifications',
        method: 'GET',
        data: { page: 1, limit: 1 },
      }).catch(() => ({ data: { list: [], unreadCount: 0 } })),
    ])

    const chatList = ((chatRes as any).list || []).map((item: any) => ({
      ...item,
      type: 'user' as const,
    }))

    const notifyData: any = (notifyRes as any)?.data || (notifyRes as any) || {}
    const notifyUnread = notifyData.unreadCount || 0
    const lastNotify = (notifyData.list && notifyData.list.length > 0) ? notifyData.list[0] : null

    // 构建聚合的系统消息入口
    const systemAggregate: SystemAggregate | null = {
      id: -1,
      type: 'systemAggregate' as const,
      content: lastNotify
        ? `[${lastNotify.title || '系统消息'}] ${lastNotify.content || ''}`
        : '暂无系统消息',
      createdAt: lastNotify?.createdAt || new Date().toISOString(),
      unreadCount: notifyUnread,
    }

    // 更新未读数
    const totalUnread = chatList.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) + notifyUnread
    uni.setStorageSync('unreadMessageCount', totalUnread)

    // 合并：系统消息入口在前，聊天在后
    const mergedList: MessageItem[] = [systemAggregate, ...chatList]

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
  if (item.type === 'systemAggregate') {
    uni.navigateTo({ url: '/pages/system-messages/index' })
  }
}

const goToChat = (item: UserMessage) => {
  // 聊天功能关闭时，禁止进入聊天
  if (!systemStore.chatEnabled) {
    uni.showToast({ title: '聊天功能暂未开放', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/chat/index?userId=${item.userId}&nickname=${encodeURIComponent(item.displayName || item.nickname)}&displayName=${encodeURIComponent(item.displayName || item.nickname)}&avatar=${encodeURIComponent(item.avatar || '')}`,
  })
}

const confirmDelete = (item: UserMessage) => {
  uni.showModal({
    title: '删除会话',
    content: `确定要删除与 ${item.displayName || item.nickname} 的聊天记录吗？`,
    confirmText: '删除',
    confirmColor: '#FF6B9D',
    success: async (res) => {
      if (res.confirm) {
        await deleteConversation(item.id)
      }
    },
  })
}

const deleteConversation = async (targetUserId: number) => {
  try {
    await request({
      url: `/chat/conversations/${targetUserId}`,
      method: 'DELETE',
    })
    uni.showToast({ title: '已删除', icon: 'success' })
    // 从列表中移除
    messageList.value = messageList.value.filter(m => m.type !== 'user' || (m as UserMessage).id !== targetUserId)
  } catch {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
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
  background-color: #FFF8FA;
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
  font-weight: 400;
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

.user-message {
  position: relative;
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

  &.pink-heart-icon {
    background-color: #FFE4EC;
  }

  text {
    font-size: 48rpx;
  }
}

.system-icon-img {
  width: 48rpx;
  height: 48rpx;
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

.title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.official-tag {
  display: inline-flex;
  align-items: center;
  background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
  border-radius: 6rpx;
  padding: 3rpx 4rpx;

  text {
    font-size: 18rpx;
    color: #fff;
    font-weight: 500;
    line-height: 1;
  }
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

.delete-btn {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #CCC;
  z-index: 2;
}

.no-more-tip {
  padding: 32rpx 0;
  font-size: 24rpx;
  color: #999;
}
</style>
