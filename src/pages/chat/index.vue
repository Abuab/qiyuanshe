<template>
  <view class="chat-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">{{ nickname }}</view>
      <view class="nav-right" @tap="showMore">
        <text class="more-icon">...</text>
      </view>
    </view>

    <scroll-view
      class="message-list"
      scroll-y
      enable-flex
      :scroll-top="scrollTop"
      :scroll-into-view="scrollIntoView"
      @scrolltoupper="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="loadingMore"
      @refresherrefresh="onRefresh"
    >
      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>

      <view
        v-for="(msg, index) in messages"
        :key="msg.id"
        :id="`msg-${msg.id}`"
        class="message-wrapper"
      >
        <view v-if="showTimeDivider(index)" class="time-divider">
          <text>{{ formatDate(msg.createdAt) }}</text>
        </view>

        <view v-if="msg.type === 'system'" class="system-message">
          <text>{{ msg.content }}</text>
        </view>

        <view v-else :class="['chat-message', msg.isMine ? 'mine' : 'other']">
          <image
            v-if="!msg.isMine"
            class="avatar"
            :src="otherAvatar"
            mode="aspectFill"
            lazy-load
          />
          <view class="bubble" :class="msg.isMine ? 'mine' : 'other'">
            <image
              v-if="msg.type === 'image'"
              :src="msg.content"
              mode="widthFix"
              class="message-image"
              @tap="previewImage(msg.content)"
              lazy-load
            />
            <text v-else>{{ msg.content }}</text>
          </view>
          <image
            v-if="msg.isMine"
            class="avatar"
            :src="myDisplayAvatar"
            mode="aspectFill"
            lazy-load
          />
        </view>
      </view>

      <view v-if="!loading && noMore" class="no-more-tip">
        <text>没有更多消息了</text>
      </view>

      <view id="bottom" style="height: 1rpx;"></view>
    </scroll-view>

    <view v-if="showVipLimit" class="vip-limit-popup">
      <view class="vip-limit-content">
        <text class="vip-limit-title">今日消息已用完</text>
        <text class="vip-limit-desc">开通会员即可无限畅聊</text>
        <view class="vip-limit-btn" @tap="goToVip">
          <text>立即开通</text>
        </view>
        <view class="vip-limit-close" @tap="closeVipLimit">
          <text>稍后再说</text>
        </view>
      </view>
    </view>

    <view class="input-area" :style="{ paddingBottom: keyboardHeight + 'px' }">
      <view class="input-wrapper">
        <view class="input-box">
          <textarea
            v-model="inputContent"
            class="message-input"
            :placeholder="placeholder"
            :adjust-position="false"
            :show-confirm-bar="false"
            @focus="handleFocus"
            @blur="handleBlur"
            @input="handleInput"
          />
        </view>
        <view class="action-buttons">
          <view class="action-btn" @tap="chooseImage">
            <text>📷</text>
          </view>
          <view
            class="send-btn"
            :class="{ disabled: !canSend }"
            @tap="handleSend"
          >
            <text>发送</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import request from '@/utils/request'
import { uploadImage } from '@/utils/upload'
import { useUserStore } from '@/store/user'
import { safeNavigateBack } from '@/utils/navigate'
import { logger } from '@/utils/logger'
import { getFullImageUrl } from '@/utils/common'

interface ChatMessage {
  id: number
  fromUserId: number
  toUserId: number
  content: string
  type: string
  isRead: number
  createdAt: string
  isMine: boolean
}

const userStore = useUserStore()
const toUserId = ref(0)
const nickname = ref('')
const avatar = ref('')
const myAvatar = ref('')
const messages = ref<ChatMessage[]>([])
const inputContent = ref('')
const page = ref(1)
const limit = 20
const loading = ref(false)
const loadingMore = ref(false)
const noMore = ref(false)
const scrollTop = ref(0)
const scrollIntoView = ref('')
const keyboardHeight = ref(0)
const showVipLimit = ref(false)
const todayMessageCount = ref(0)
const maxDailyMessages = 3
let pollTimer: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL = 3000

const canSend = computed(() => {
  return inputContent.value.trim().length > 0
})

const otherAvatar = computed(() => getFullImageUrl(avatar.value) || '/static/default-avatar.png')
const myDisplayAvatar = computed(() => getFullImageUrl(myAvatar.value) || '/static/default-avatar.png')

const placeholder = computed(() => {
  if (!userStore.isVip && todayMessageCount.value >= maxDailyMessages) {
    return '今日消息已用完'
  }
  return '输入消息...'
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  toUserId.value = parseInt(options.userId) || 0
  nickname.value = decodeURIComponent(options.nickname || '聊天')
  avatar.value = decodeURIComponent(options.avatar || '')

  myAvatar.value = userStore.userInfo?.avatar || ''

  fetchMessages()
  markAsRead()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

const fetchMessages = async (isLoadMore = false) => {
  if (loading.value) return

  try {
    if (isLoadMore) {
      loadingMore.value = true
    } else {
      loading.value = true
    }

    const res = await request({
      url: '/chat/messages',
      method: 'GET',
      data: {
        userId: toUserId.value,
        page: page.value,
        limit,
      },
    })

    const list = res.list || []

    if (isLoadMore) {
      messages.value.unshift(...list.reverse())
    } else {
      messages.value = list.reverse()
    }

    if (list.length < limit) {
      noMore.value = true
    }

    page.value++

    nextTick(() => {
      scrollToBottom()
    })
  } catch (e) {
    logger.error('fetch messages error', e)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const loadMore = () => {
  if (!loadingMore.value && !noMore.value) {
    fetchMessages(true)
  }
}

const onRefresh = () => {
  fetchMessages(true)
}

const handleSend = async () => {
  if (!canSend.value) return

  if (!userStore.isVip && todayMessageCount.value >= maxDailyMessages) {
    showVipLimit.value = true
    return
  }

  const content = inputContent.value.trim()
  inputContent.value = ''

  try {
    await request({
      url: '/chat/messages',
      method: 'POST',
      data: {
        toUserId: toUserId.value,
        content,
        type: 'text',
      },
    })

    const newMessage: ChatMessage = {
      id: Date.now(),
      fromUserId: userStore.userInfo?.id || 0,
      toUserId: toUserId.value,
      content,
      type: 'text',
      isRead: 1,
      createdAt: new Date().toISOString(),
      isMine: true,
    }

    messages.value.push(newMessage)
    todayMessageCount.value++

    nextTick(() => {
      scrollToBottom()
    })
  } catch (e: any) {
    logger.error('send message error', e)
    inputContent.value = content

    if (e.statusCode === 403) {
      showVipLimit.value = true
    } else {
      uni.showToast({ title: '发送失败', icon: 'none' })
    }
  }
}

const chooseImage = async () => {
  if (!userStore.isVip && todayMessageCount.value >= maxDailyMessages) {
    showVipLimit.value = true
    return
  }

  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]

      try {
        uni.showLoading({ title: '上传中...' })

        const uploadRes = await uploadImage(tempFilePath)

        await request({
          url: '/chat/messages',
          method: 'POST',
          data: {
            toUserId: toUserId.value,
            content: uploadRes.url,
            type: 'image',
          },
        })

        const newMessage: ChatMessage = {
          id: Date.now(),
          fromUserId: userStore.userInfo?.id || 0,
          toUserId: toUserId.value,
          content: uploadRes.url,
          type: 'image',
          isRead: 1,
          createdAt: new Date().toISOString(),
          isMine: true,
        }

        messages.value.push(newMessage)
        todayMessageCount.value++

        nextTick(() => {
          scrollToBottom()
        })
      } catch (e) {
        logger.error('upload error', e)
        if (e.message !== 'Unauthorized') {
          uni.showToast({ title: '发送失败', icon: 'none' })
        }
      } finally {
        uni.hideLoading()
      }
    },
  })
}

const markAsRead = async () => {
  try {
    await request({
      url: `/chat/messages/${toUserId.value}/read`,
      method: 'PUT',
    })
  } catch (e) {
    logger.error('mark as read error', e)
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    scrollIntoView.value = 'bottom'
  })
}

const showTimeDivider = (index: number): boolean => {
  if (index === 0) return true

  const currentMsg = messages.value[index]
  const prevMsg = messages.value[index - 1]

  const currentDate = new Date(currentMsg.createdAt)
  const prevDate = new Date(prevMsg.createdAt)

  return currentDate.toDateString() !== prevDate.toDateString()
}

const formatDate = (timeStr: string): string => {
  const date = new Date(timeStr)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const previewImage = (url: string) => {
  uni.previewImage({
    urls: [url],
    current: url,
  })
}

const handleFocus = () => {
  nextTick(() => {
    scrollToBottom()
  })
}

const handleBlur = () => {
  keyboardHeight.value = 0
}

const handleInput = () => {
  if (inputContent.value.length > 500) {
    inputContent.value = inputContent.value.substring(0, 500)
    uni.showToast({ title: '消息不能超过500字', icon: 'none' })
  }
}

const showMore = () => {
  uni.showActionSheet({
    itemList: ['查看个人资料', '清空聊天记录', '举报'],
    success: (res) => {
      if (res.tapIndex === 0) {
        goToProfile()
      } else if (res.tapIndex === 1) {
        clearChat()
      }
    },
  })
}

const goToProfile = () => {
  uni.navigateTo({
    url: `/pages/user-detail/index?id=${toUserId.value}`,
  })
}

const clearChat = () => {
  uni.showModal({
    title: '提示',
    content: '确定清空聊天记录吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await request({
            url: `/chat/conversations/${toUserId.value}`,
            method: 'DELETE',
          })
          messages.value = []
          uni.showToast({ title: '已清空', icon: 'success' })
        } catch (e) {
          logger.error('clear chat error', e)
        }
      }
    },
  })
}

const goToVip = () => {
  showVipLimit.value = false
  uni.switchTab({
    url: '/pages/vip/index',
  })
}

const closeVipLimit = () => {
  showVipLimit.value = false
}

const startPolling = () => {
  stopPolling()
  let consecutiveErrors = 0
  pollTimer = setInterval(async () => {
    try {
      const res = await request({
        url: '/chat/messages/poll',
        method: 'GET',
        data: {
          userId: toUserId.value,
          afterId: messages.value.length > 0 ? messages.value[messages.value.length - 1].id : 0,
        },
        skipToast: true,
      })

      consecutiveErrors = 0
      const newMessages = res.list || []
      if (newMessages.length > 0) {
        const existingIds = new Set(messages.value.map(m => m.id))
        const uniqueNewMessages = newMessages.filter((m: ChatMessage) => !existingIds.has(m.id))
        if (uniqueNewMessages.length > 0) {
          messages.value.push(...uniqueNewMessages)
          nextTick(() => {
            scrollToBottom()
          })
        }
      }
    } catch (e: any) {
      consecutiveErrors++
      // 连续 3 次失败后停止轮询（后端暂未部署 polling 接口）
      if (consecutiveErrors >= 3) {
        stopPolling()
      }
    }
  }, POLL_INTERVAL)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const handleBack = () => {
  safeNavigateBack()
}
</script>

<style lang="scss" scoped>
.chat-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
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
  background-color: #fff;
  z-index: 100;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.nav-left,
.nav-right {
  width: 100rpx;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-icon {
  font-size: 40rpx;
  color: #333;
}

.message-list {
  flex: 1;
  padding: 108rpx 24rpx 160rpx;
  height: calc(100vh - 88rpx - 160rpx);
}

.loading-tip,
.no-more-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
  font-size: 24rpx;
  color: #999;
}

.message-wrapper {
  margin-bottom: 24rpx;
}

.time-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 24rpx 0;

  text {
    font-size: 22rpx;
    color: #999;
    background-color: #E0E0E0;
    padding: 8rpx 24rpx;
    border-radius: 32rpx;
  }
}

.system-message {
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 24rpx;
    color: #999;
  }
}

.chat-message {
  display: flex;
  align-items: flex-end;

  &.mine {
    flex-direction: row-reverse;
  }

  &.other {
    flex-direction: row;
  }
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.bubble {
  max-width: 70%;
  padding: 20rpx 24rpx;
  margin: 0 16rpx;
  border-radius: 16rpx;
  word-break: break-word;

  &.other {
    background-color: #fff;
    border-bottom-left-radius: 8rpx;

    text {
      font-size: 30rpx;
      color: #333;
    }
  }

  &.mine {
    background-color: #FF6B9D;
    border-bottom-right-radius: 8rpx;

    text {
      font-size: 30rpx;
      color: #fff;
    }
  }
}

.message-image {
  max-width: 400rpx;
  border-radius: 8rpx;
}

.input-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
}

.input-box {
  flex: 1;
  background-color: #f5f5f5;
  border-radius: 24rpx;
  padding: 16rpx 24rpx;
}

.message-input {
  width: 100%;
  min-height: 48rpx;
  max-height: 200rpx;
  font-size: 30rpx;
  color: #333;
  line-height: 1.5;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.action-btn {
  width: 72rpx;
  height: 72rpx;
  background-color: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 36rpx;
  }
}

.send-btn {
  height: 72rpx;
  padding: 0 32rpx;
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 28rpx;
    font-weight: bold;
    color: #fff;
  }

  &.disabled {
    background-color: #ccc;

    text {
      color: #fff;
    }
  }
}

.vip-limit-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.vip-limit-content {
  width: 600rpx;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vip-limit-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.vip-limit-desc {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 40rpx;
}

.vip-limit-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;

  text {
    font-size: 32rpx;
    font-weight: bold;
    color: #fff;
  }
}

.vip-limit-close {
  text-align: center;

  text {
    font-size: 28rpx;
    color: #999;
  }
}
</style>
