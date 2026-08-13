<template>
  <view class="message-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: (44 + statusBarHeight) + 'px' }">
      <view class="nav-left" @tap="handleBack">
        <AppIcon name="icon-home" size="44" color="#333333" />
      </view>
      <view class="nav-title">消息列表</view>
      <view class="nav-right" />
    </view>

    <scroll-view
      class="message-list"
      :style="{ paddingTop: (44 + statusBarHeight) + 'px', height: 'calc(100vh - 120rpx - ' + (44 + statusBarHeight) + 'px)' }"
      scroll-y
      enable-flex
      :scroll-top="scrollToVal"
      @scroll="onScroll"
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      @refresherrefresh="onRefresh"
      :refresher-triggered="refreshing"
    >
      <!-- 关注公众号提示栏 -->
      <view class="oa-tip-bar">
        <view class="oa-tip-icon">
          <text class="oa-tip-exclaim">!</text>
        </view>
        <text class="oa-tip-text">关注服务号，接受消息提醒，不错过每次缘分！</text>
        <view class="oa-tip-btn" @tap="handleOfficialAccount">
          <text>立即关注</text>
        </view>
      </view>

      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>

      <view v-if="!loading && messageList.length === 0" class="empty-tip">
        <view class="ico ico-mailbox ico-xl empty-icon"></view>
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
            <image src="/static/chat-heart.png" mode="aspectFit" class="system-icon-img" />
          </view>
          <view class="message-content">
            <view class="message-header">
              <view class="title-row">
                <text class="message-title">系统消息</text>
                <view class="official-tag"><text>官方</text></view>
              </view>
            </view>
            <text class="message-preview">{{ item.content }}</text>
          </view>
          <view v-if="item.unreadCount > 0" class="unread-badge">
            <text>{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</text>
          </view>
        </view>

        <!-- 用户聊天项 -->
        <view v-else class="user-message" @tap.stop="goToChat(item)">
          <image
            class="user-avatar"
            :src="getFullImageUrl(item.avatar) || icons.common.defaultAvatar"
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
        <view class="no-more-line"></view>
        <text>仅展示最近2个月的消息</text>
        <view class="no-more-line"></view>
      </view>
    </scroll-view>

    <BackTop :show="showBackTop" @click="scrollToTop" />
  </view>

  <tab-bar />

  <OfficialAccountPopup
    :show="showOaPopup"
    :qrcode-url="oaQrcodeUrl"
    @update:show="showOaPopup = $event"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import { onShow } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { useMessageStore } from '@/store/message'
import { icons } from '@/config/icons'
import { getFullImageUrl } from '@/utils/common'
import { logger } from '@/utils/logger'
import BackTop from '@/components/back-top/back-top.vue'
import { useBackTop } from '@/composables/useBackTop'
import OfficialAccountPopup from '@/components/OfficialAccountPopup/OfficialAccountPopup.vue'

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
const messageStore = useMessageStore()
const statusBarHeight = ref(0)

// ===== 关注公众号弹窗 =====
const showOaPopup = ref(false)
const oaQrcodeUrl = computed(() => getFullImageUrl(systemStore.officialAccountQrcode))

const handleOfficialAccount = async () => {
  showOaPopup.value = true
  await systemStore.loadSystemConfig()
}
const messageList = ref<MessageItem[]>([])
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const page = ref(1)
let fetchLock = false // 防止 onMounted + onShow 并发导致重复请求

// ===== 回到顶部 =====
const { showBackTop, onScroll, scrollToTop, scrollToVal } = useBackTop()

onMounted(() => {
  const sysInfo = uni.getWindowInfo()
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
        : '',
      createdAt: lastNotify?.createdAt || new Date().toISOString(),
      unreadCount: notifyUnread,
    }

    // 更新未读数
    const totalUnread = chatList.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) + notifyUnread
    messageStore.setUnreadCount(totalUnread)

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
    uni.navigateTo({ url: '/subpkg-pages/system-messages/index' })
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
.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.message-item {
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
  background-color: #fff;
}

.system-icon {
  width: 96rpx;
  height: 96rpx;
  background-color: #fff;
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

.system-icon-img {
  width: 60rpx;
  height: 60rpx;
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
  background: #FF6B8A;
  border-radius: 8rpx;
  padding: 2rpx 6rpx;

  text {
    font-size: 20rpx;
    color: #fff;
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
  display: block;
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
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
  font-size: 20rpx;
  color: #BBBBBB;
}

.no-more-line {
  width: 140rpx;
  height: 2rpx;
  background: #E0E0E0;
  margin: 0 28rpx;
}

// ===== 关注公众号提示栏 =====
.oa-tip-bar {
  display: flex;
  align-items: center;
  height: 88rpx;
  margin: 20rpx 24rpx;
  padding: 0 24rpx;
  background: #FFF;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.oa-tip-icon {
  width: 24rpx;
  height: 24rpx;
  background-color: #FF6B9D;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.oa-tip-exclaim {
  color: #fff;
  font-size: 18rpx;
  font-weight: bold;
  line-height: 1;
}

.oa-tip-text {
  flex: 1;
  min-width: 0;
  margin-left: 12rpx;
  margin-right: 16rpx;
  font-size: 22rpx;
  font-weight: 500;
  color: #333333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.oa-tip-btn {
  flex-shrink: 0;
  border: 2rpx solid #FF6B9D;
  border-radius: 24rpx;
  padding: 8rpx 20rpx;
  line-height: 1;

  text {
    font-size: 24rpx;
    color: #FF6B9D;
  }
}
</style>
