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
            <view class="message-preview system-preview">
              <text class="preview-body">{{ item.body || item.content }}</text>
            </view>
          </view>
          <view v-if="item.unreadCount > 0" class="unread-badge">
            <text>{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</text>
          </view>
        </view>

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
  body: string
  createdAt: string
  unreadCount: number
}

type MessageItem = SystemAggregate

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
let fetchLock = false // 防止 onMounted + onShow 并发导致重复请求

// ===== 回到顶部 =====
const { showBackTop, onScroll, scrollToTop, scrollToVal } = useBackTop()

onMounted(() => {
  const sysInfo = uni.getWindowInfo()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  fetchConversations()
})

onShow(() => {
  fetchConversations()
})

const buildSystemAggregate = (lastNotify: any, unreadCount: number): SystemAggregate => {
  const body = lastNotify?.content || ''
  return {
    id: -1,
    type: 'systemAggregate',
    content: body,
    body,
    createdAt: lastNotify?.createdAt || new Date().toISOString(),
    unreadCount,
  }
}

const fetchConversations = async () => {
  // 游客态：不发起认证请求，仅展示系统消息入口，避免「暂无消息」空态或 401 触发登录跳转
  if (!userStore.isLoggedIn) {
    messageList.value = [buildSystemAggregate(null, 0)]
    loading.value = false
    refreshing.value = false
    return
  }

  if (fetchLock) return
  fetchLock = true
  try {
    loading.value = true

    // 获取系统通知未读数
    const notifyRes = await request({
      url: '/notifications',
      method: 'GET',
      data: { page: 1, limit: 1 },
    }).catch(() => ({ data: { list: [], unreadCount: 0 } }))

    // 请求返回时已退出登录：丢弃结果，避免向全局未读数/列表写入脏数据
    if (!userStore.isLoggedIn) return

    const notifyData: any = (notifyRes as any)?.data || (notifyRes as any) || {}
    const notifyUnread = notifyData.unreadCount || 0
    const lastNotify = (notifyData.list && notifyData.list.length > 0) ? notifyData.list[0] : null

    // 更新未读数
    messageStore.setUnreadCount(notifyUnread)

    // 构建聚合的系统消息入口
    const systemAggregate = buildSystemAggregate(lastNotify, notifyUnread)
    messageList.value = [systemAggregate]

    refreshing.value = false
  } catch (e) {
    logger.error('fetch conversations error', e)
    refreshing.value = false
  } finally {
    loading.value = false
    fetchLock = false
  }
}

const onRefresh = () => {
  refreshing.value = true
  fetchConversations()
}

const handleBack = () => {
  safeNavigateBack()
}

const handleClick = (item: MessageItem) => {
  if (item.type === 'systemAggregate') {
    uni.navigateTo({ url: '/subpkg-pages/system-messages/index' })
  }
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

.system-message {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
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

.message-preview {
  display: block;
  font-size: 26rpx;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 系统消息聚合入口：预览内容
.system-preview {
  display: flex;
  align-items: baseline;

  .preview-body {
    color: #666666;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
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
