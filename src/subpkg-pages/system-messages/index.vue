<template>
  <view class="sys-msg-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon iconfont icon-back"></text>
      </view>
      <view class="nav-title">系统消息</view>
      <view class="nav-right" />
    </view>

    <!-- 公众号关注横幅 -->
    <view v-if="systemStore.showOfficialAccountPrompt && !bannerClosed" class="oa-banner">
      <view class="oa-banner-left">
        <view class="ico ico-exclamation ico-sm oa-warn-icon"></view>
        <text class="oa-banner-text">关注服务号，接受消息提醒，不错过每次缘分！</text>
      </view>
      <view class="oa-banner-right">
        <view class="oa-follow-btn" @tap.stop="handleFollowOA">
          <text>立即关注</text>
        </view>
        <view class="oa-banner-close" @tap.stop="hideBanner">
          <text>✕</text>
        </view>
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view
      class="msg-scroll"
      scroll-y
      :scroll-top="scrollToVal"
      @scroll="onScroll"
      enable-flex
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      @refresherrefresh="onRefresh"
      :refresher-triggered="refreshing"
    >
      <view v-if="loading" class="loading-tip"><text>加载中...</text></view>

      <view v-if="!loading && list.length === 0" class="empty-tip">
        <text class="empty-text">暂时没有系统通知～</text>
      </view>

      <view v-if="showDeleteHint" class="delete-hint">
        <text>长按消息可删除</text>
      </view>

      <view
        v-for="item in list"
        :key="item.id"
        class="msg-item"
        :class="{ unread: item.isRead === 0, deleting: deletingId === item.id }"
        hover-class="msg-item-hover"
        @tap="markRead(item)"
        @longpress="onLongPress(item)"
      >
        <view class="msg-item-head">
          <view class="unread-dot" />
          <text class="msg-title">{{ item.title }}</text>
          <text class="msg-time">{{ formatTime(item.createdAt) }}</text>
        </view>
        <text class="msg-content">{{ item.content }}</text>
      </view>

      <view v-if="!loading && noMore && list.length > 0" class="no-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>
    <BackTop :show="showBackTop" @click="scrollToTop" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import { useSystemStore } from '@/store/system'
import { useUserStore } from '@/store/user'
import BackTop from '@/components/back-top/back-top.vue'
import { useBackTop } from '@/composables/useBackTop'
import { logger } from '@/utils/logger'

interface NotifyItem {
  id: number
  title: string
  content: string
  isRead: number
  createdAt: string
}

const systemStore = useSystemStore()
const userStore = useUserStore()
const statusBarHeight = ref(0)
const list = ref<NotifyItem[]>([])
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const page = ref(1)
const bannerClosed = ref(false)
const showDeleteHint = ref(false)
const deletingId = ref<number | null>(null)
const { showBackTop, onScroll, scrollToTop, scrollToVal } = useBackTop()

onMounted(() => {
  const sysInfo = uni.getWindowInfo()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  // 检查本地是否已关闭过横幅
  bannerClosed.value = uni.getStorageSync('oa_banner_closed') === true
  if (userStore.isLoggedIn) fetchList()
})

onShow(() => {
  if (userStore.isLoggedIn) fetchList(true)
})

const fetchList = async (isRefresh = false) => {
  if (loading.value) return
  if (isRefresh) {
    page.value = 1
    noMore.value = false
  }
  loading.value = true
  try {
    const res: any = await request({
      url: '/notifications',
      method: 'GET',
      data: { page: page.value, limit: 20 },
    })
    const data = res?.data || res || {}
    const items: NotifyItem[] = (data.list || []).map((n: any) => ({
      id: n.id,
      title: n.title || '系统通知',
      content: n.content || '',
      isRead: n.isRead,
      createdAt: n.createdAt,
    }))
    if (isRefresh) {
      list.value = items
      refreshing.value = false
    } else {
      list.value.push(...items)
    }
    maybeShowDeleteHint()
    if (items.length < 20) noMore.value = true
    page.value++
  } catch (e: any) {
    logger.error('fetch system messages error', e)
    refreshing.value = false
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (!loading.value && !noMore.value) fetchList()
}

const onRefresh = () => {
  refreshing.value = true
  fetchList(true)
}

const handleBack = () => {
  safeNavigateBack()
}

const markRead = async (item: NotifyItem) => {
  if (item.isRead === 1) return
  try {
    await request({
      url: `/notifications/${item.id}/read`,
      method: 'PUT',
    })
    item.isRead = 1
  } catch { /* silent */ }
}

const maybeShowDeleteHint = () => {
  if (list.value.length === 0) return
  if (uni.getStorageSync('hasShownDeleteHint') === true) return
  uni.setStorageSync('hasShownDeleteHint', true)
  showDeleteHint.value = true
  setTimeout(() => {
    showDeleteHint.value = false
  }, 2000)
}

const onLongPress = (item: NotifyItem) => {
  uni.showActionSheet({
    itemList: ['删除该消息'],
    itemColor: '#FF4D4F',
    success: (res) => {
      if (res.tapIndex === 0) confirmDelete(item)
    },
  })
}

const confirmDelete = (item: NotifyItem) => {
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复，是否确认删除这条消息？',
    confirmText: '删除',
    confirmColor: '#FF4D4F',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) deleteMessage(item)
    },
  })
}

const deleteMessage = async (item: NotifyItem) => {
  try {
    await request({
      url: `/notifications/${item.id}`,
      method: 'DELETE',
    })
    deletingId.value = item.id
    setTimeout(() => {
      const idx = list.value.findIndex(m => m.id === item.id)
      if (idx > -1) list.value.splice(idx, 1)
      deletingId.value = null
      uni.showToast({ title: '已删除', icon: 'success' })
    }, 200)
  } catch {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

const handleFollowOA = () => {
  // 跳转公众号关注引导（小程序需关联公众号后使用 official-account 组件）
  uni.showToast({ title: '请前往微信搜索并关注公众号', icon: 'none' })
}

const hideBanner = () => {
  bannerClosed.value = true
  uni.setStorageSync('oa_banner_closed', true)
}

const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const pad = (n: number) => (n < 10 ? '0' + n : String(n))
  const hhmm = `${pad(date.getHours())}:${pad(date.getMinutes())}`

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diffDays = Math.round((startOfToday - startOfTarget) / 86400000)

  if (diffDays === 0) return hhmm
  if (diffDays === 1) return `昨天 ${hhmm}`

  const md = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  if (date.getFullYear() < now.getFullYear()) {
    return `${date.getFullYear()}-${md} ${hhmm}`
  }
  return `${md} ${hhmm}`
}
</script>

<style lang="scss" scoped>
.sys-msg-page {
  width: 100vw; height: 100vh;
  display: flex; flex-direction: column;
  background: #FFF8FA;
}

// ==================== 导航栏 ====================
.nav-bar {
  flex-shrink: 0;
  display: flex; align-items: center;
  height: 88rpx; padding: 0 32rpx; box-sizing: content-box;
  background: #FFF8FA;
  z-index: 100;
}
.nav-left { width: 80rpx; flex-shrink: 0; }
.back-icon { font-size: 44rpx; color: #333; }
.nav-title {
  flex: 1; text-align: center;
  font-size: 34rpx; color: #333;
}
.nav-right { width: 80rpx; flex-shrink: 0; }

// ==================== 公众号关注横幅 ====================
.oa-banner {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  margin: 20rpx 24rpx;
  padding: 18rpx 24rpx;
  background: #FFF8E1;
  border-radius: 16rpx;
  border: 1rpx solid #FFE082;
}
.oa-banner-left {
  display: flex; align-items: center; flex: 1; min-width: 0;
}
.oa-warn-icon { display:flex;align-items:center; margin-right: 12rpx; flex-shrink: 0; }
.oa-banner-text {
  font-size: 24rpx; color: #F57F17; line-height: 1.4;
  flex: 1; min-width: 0;
}
.oa-banner-right {
  display: flex; align-items: center; flex-shrink: 0; margin-left: 16rpx;
}
.oa-follow-btn {
  border: 2rpx solid #FF6B8A;
  border-radius: 24rpx;
  padding: 8rpx 24rpx;
  text {
    font-size: 24rpx; color: #FF6B8A; font-weight: 500;
  }
}
.oa-banner-close {
  width: 44rpx; height: 44rpx;
  display: flex; align-items: center; justify-content: center;
  margin-left: 12rpx;
  text { font-size: 28rpx; color: #999; }
}

// ==================== 消息列表 ====================
.msg-scroll {
  flex: 1; min-height: 0;
}

.loading-tip, .empty-tip, .no-more {
  display: flex; justify-content: center; padding: 60rpx 0;
  text { font-size: 26rpx; color: #BDBDBD; }
}
.empty-tip { flex-direction: column; align-items: center; }
.empty-icon { margin-bottom: 20rpx; }

.delete-hint {
  width: calc(100% - 48rpx);
  margin: 0 auto 12rpx;
  padding: 12rpx 0;
  border-radius: 12rpx;
  background: rgba(0, 0, 0, 0.04);
  text-align: center;
  text { font-size: 22rpx; color: #999; }
}

.msg-item {
  width: calc(100% - 48rpx);
  margin: 0 auto 24rpx;
  background: #fff; border-radius: 16rpx;
  padding: 28rpx 32rpx;
  position: relative;
  &.unread { background: #FFF0F5; }
  &.deleting {
    opacity: 0;
    transition: opacity 0.2s ease;
  }
}
.msg-item-hover {
  opacity: 0.9;
}
.msg-item-head {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}
.unread-dot {
  width: 16rpx; height: 16rpx;
  border-radius: 50%;
  background: transparent;
  flex-shrink: 0;
  margin-right: 12rpx;
}
.msg-item.unread .unread-dot {
  background: #FF4D4F;
}
.msg-title {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 400;
  color: #1A1A1A;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.msg-item.unread .msg-title {
  font-weight: 600;
}
.msg-time {
  font-size: 24rpx; color: #999; flex-shrink: 0;
  margin-left: 16rpx;
}
.msg-content {
  margin-left: 28rpx;
  font-size: 26rpx; color: #666; line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.no-more { padding: 40rpx 0; }
</style>
