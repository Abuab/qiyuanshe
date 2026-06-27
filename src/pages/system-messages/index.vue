<template>
  <view class="sys-msg-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">系统消息</view>
      <view class="nav-right" />
    </view>

    <!-- 公众号关注横幅 -->
    <view v-if="systemStore.showOfficialAccountPrompt && !bannerClosed" class="oa-banner">
      <view class="oa-banner-left">
        <text class="oa-warn-icon">❗</text>
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
      enable-flex
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      @refresherrefresh="onRefresh"
      :refresher-triggered="refreshing"
    >
      <view v-if="loading" class="loading-tip"><text>加载中...</text></view>

      <view v-if="!loading && list.length === 0" class="empty-tip">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无系统消息</text>
      </view>

      <view
        v-for="item in list"
        :key="item.id"
        class="msg-item"
        :class="{ unread: item.isRead === 0 }"
        @tap="markRead(item)"
      >
        <view class="msg-item-head">
          <text class="msg-title">{{ item.title }}</text>
          <text class="msg-time">{{ formatTime(item.createdAt) }}</text>
          <view class="delete-btn" @tap.stop="confirmDelete(item)">✕</view>
        </view>
        <text class="msg-content">{{ item.content }}</text>
        <view v-if="item.isRead === 0" class="unread-dot" />
      </view>

      <view v-if="!loading && noMore && list.length > 0" class="no-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import { useSystemStore } from '@/store/system'
import { logger } from '@/utils/logger'

interface NotifyItem {
  id: number
  title: string
  content: string
  isRead: number
  createdAt: string
}

const systemStore = useSystemStore()
const statusBarHeight = ref(0)
const list = ref<NotifyItem[]>([])
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const page = ref(1)
const bannerClosed = ref(false)

onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  // 检查本地是否已关闭过横幅
  bannerClosed.value = uni.getStorageSync('oa_banner_closed') === true
  fetchList()
})

onShow(() => {
  fetchList(true)
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

const confirmDelete = (item: NotifyItem) => {
  uni.showModal({
    title: '删除消息',
    content: '确定要删除这条系统消息吗？',
    confirmText: '删除',
    confirmColor: '#FF6B9D',
    success: async (res) => {
      if (res.confirm) {
        try {
          await request({
            url: `/notifications/${item.id}`,
            method: 'DELETE',
          })
          list.value = list.value.filter(m => m.id !== item.id)
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
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
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`
}
</script>

<style lang="scss" scoped>
.sys-msg-page {
  width: 100vw; height: 100vh;
  display: flex; flex-direction: column;
  background: #F5F5F5;
}

// ==================== 导航栏 ====================
.nav-bar {
  flex-shrink: 0;
  display: flex; align-items: center;
  height: 88rpx; padding: 0 32rpx; box-sizing: content-box;
  background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
  z-index: 100;
}
.nav-left { width: 80rpx; flex-shrink: 0; }
.back-icon { font-size: 44rpx; color: #fff; font-weight: bold; }
.nav-title {
  flex: 1; text-align: center;
  font-size: 34rpx; font-weight: 600; color: #fff;
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
.oa-warn-icon { font-size: 32rpx; margin-right: 12rpx; flex-shrink: 0; }
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
  padding: 0 24rpx;
}

.loading-tip, .empty-tip, .no-more {
  display: flex; justify-content: center; padding: 60rpx 0;
  text { font-size: 26rpx; color: #BDBDBD; }
}
.empty-tip { flex-direction: column; align-items: center; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }

.msg-item {
  background: #fff; border-radius: 16rpx;
  padding: 24rpx 28rpx; margin-bottom: 12rpx;
  position: relative;
  &.unread { background: #FFF0F5; }
}
.msg-item-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12rpx;
}
.msg-title {
  font-size: 30rpx; font-weight: 600; color: #1A1A1A;
}
.msg-time {
  font-size: 22rpx; color: #999; flex-shrink: 0; margin-left: 16rpx;
}
.msg-content {
  font-size: 26rpx; color: #666; line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.unread-dot {
  position: absolute; top: 28rpx; left: 12rpx;
  width: 12rpx; height: 12rpx; border-radius: 50%; background: #FF4D4F;
}
.delete-btn {
  font-size: 28rpx; color: #CCC;
  padding: 0 8rpx;
  flex-shrink: 0;
}
.no-more { padding: 40rpx 0; }
</style>
