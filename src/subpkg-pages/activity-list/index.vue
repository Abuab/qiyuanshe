<template>
  <view class="activity-list-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: (44 + statusBarHeight) + 'px' }">
      <view class="nav-back" @tap="goBack">
        <text class="nav-back-icon">←</text>
      </view>
      <text class="nav-title">活动</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- Tab 切换区 -->
    <view class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentTab === tab.value }"
        @tap="switchTab(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <view v-if="currentTab === tab.value" class="tab-underline"></view>
      </view>
    </view>

    <!-- 活动列表 -->
    <scroll-view
      class="activity-scroll"
      scroll-y
      enable-flex
      :scroll-top="scrollToVal"
      @scroll="onScroll"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
      :style="{ height: 'calc(100vh - ' + (88 + statusBarHeight) + 'px)' }"
    >
      <view class="activity-list">
        <view
          v-for="activity in activityList"
          :key="activity.id"
          class="activity-card"
          :class="{ 'activity-card--info': activity.headerType === 'info' }"
          @tap="goToDetail(activity.id)"
        >
          <!-- info 卡片模式 -->
          <template v-if="activity.headerType === 'info'">
            <view class="info-card-row" :style="{ background: activity.headerConfig?.bgColor || '' }">
              <image
                v-if="activity.coverImage"
                class="info-card-cover"
                :src="getFullImageUrl(activity.compressedCover || activity.coverImage)"
                mode="aspectFill"
              />
              <view class="info-card-body">
                <text class="info-card-title">{{ activity.title }}</text>
                <view v-if="showInfoTag(activity, 'time')" class="info-card-item">
                  <text class="info-card-label">活动时间</text>
                  <text class="info-card-value">{{ formatDate(activity.startTime, 'MM.DD HH:mm') }}-{{ formatDate(activity.endTime, 'MM.DD HH:mm') }}</text>
                </view>
                <view v-if="showInfoTag(activity, 'location')" class="info-card-item">
                  <text class="info-card-label">活动地址</text>
                  <text class="info-card-value">{{ activity.location || '待定' }}</text>
                </view>
              </view>
              <view v-if="effectiveStatus(activity) !== 1" class="info-card-status" :style="{ color: activity.headerConfig?.tagColor || '#FF6B9D', background: (activity.headerConfig?.tagColor || '#FF6B9D') + '1A' }">
                {{ getStatusText(effectiveStatus(activity)) }}
              </view>
            </view>
          </template>

          <!-- poster 卡片模式 -->
          <template v-else>
            <view class="cover-wrapper">
              <image
                class="cover-image"
                :src="getFullImageUrl(activity.compressedCover || activity.coverImage)"
                mode="aspectFill"
              />
              <view v-if="effectiveStatus(activity) !== 1" class="status-tag">
                {{ getStatusText(effectiveStatus(activity)) }}
              </view>
            </view>
            <text class="activity-title">{{ activity.title }}</text>
            <text class="activity-time">
              活动时间: {{ formatDate(activity.startTime, 'YYYY.MM.DD HH:mm') }}-{{ formatDate(activity.endTime, 'YYYY.MM.DD HH:mm') }}
            </text>
          </template>
        </view>

        <!-- 空状态：活动筹备中占位 -->
        <view v-if="activityList.length === 0 && !loading" class="prep-placeholder">
          <view class="prep-blob prep-blob-1"></view>
          <view class="prep-blob prep-blob-2"></view>
          <view class="prep-blob prep-blob-3"></view>
          <view class="prep-content">
            <text class="prep-text">活动筹备中...</text>
            <view class="prep-line"></view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="loadingMore" class="loading-more">
          <text class="loading-text">加载中...</text>
        </view>

        <view v-if="noMoreData && activityList.length > 0" class="no-more">
          <text class="no-more-text">没有更多了</text>
        </view>
      </view>

      <view class="bottom-safe-area"></view>
    </scroll-view>

    <BackTop :show="showBackTop" @click="scrollToTop" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import BackTop from '@/components/back-top/back-top.vue'
import { useBackTop } from '@/composables/useBackTop'
import { safeNavigateBack } from '@/utils/navigate'
import { logger } from '@/utils/logger'
import { formatDate, getFullImageUrl } from '@/utils/common'

interface Activity {
  id: number
  title: string
  coverImage: string
  compressedCover?: string
  startTime: string
  endTime: string
  status: number
  activityType: string
  headerType?: string
  headerConfig?: Record<string, any>
  location?: string
  signUpEndTime?: string
  maxParticipants?: number
  currentParticipants?: number
}

const tabs = [
  { label: '最新活动', value: 'latest' },
  { label: '线上互选', value: 'online' },
  { label: '一周CP', value: 'cp' },
]

const currentTab = ref('latest')
const activityList = ref<Activity[]>([])
const isRefreshing = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const noMoreData = ref(false)
const currentPage = ref(1)
const statusBarHeight = ref(0)
const pageSize = 10

// ===== 回到顶部 =====
const { showBackTop, onScroll, scrollToTop, scrollToVal } = useBackTop()

const defaultShowTags = ['time', 'location']

function showInfoTag(activity: Activity, tag: string): boolean {
  const tags = activity.headerConfig?.showTags
  if (!tags || tags.length === 0) return defaultShowTags.includes(tag)
  return tags.includes(tag)
}

function getStatusText(status: number) {
  const map: Record<number, string> = {
    0: '草稿',
    1: '进行中',
    2: '已结束',
    3: '已取消',
  }
  return map[status] || ''
}

/** 有效状态：进行中(1) 但已过截止时间时，自动视为「已结束」(2) */
function effectiveStatus(activity: Activity) {
  if (activity.status === 1 && activity.endTime && new Date(activity.endTime).getTime() < Date.now()) {
    return 2
  }
  return activity.status
}

async function fetchActivities(reset = false) {
  if (reset) {
    currentPage.value = 1
    noMoreData.value = false
  }

  if (noMoreData.value || loadingMore.value) return

  loading.value = true
  loadingMore.value = !reset

  try {
    const result = await request({
      url: '/activities',
      method: 'GET',
      data: {
        type: currentTab.value,
        page: currentPage.value,
        limit: pageSize,
      },
    })

    const res = result as any
    if (res && res.list) {
      const list = res.list || []
      if (reset) {
        activityList.value = list
      } else {
        activityList.value = [...activityList.value, ...list]
      }

      if (list.length < pageSize) {
        noMoreData.value = true
      } else {
        currentPage.value++
      }
    }
  } catch (error) {
    logger.error('获取活动列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function switchTab(value: string) {
  if (currentTab.value === value) return
  currentTab.value = value
  fetchActivities(true)
}

function onRefresh() {
  isRefreshing.value = true
  fetchActivities(true).then(() => {
    isRefreshing.value = false
  })
}

function onLoadMore() {
  if (!noMoreData.value && !loadingMore.value && !loading.value) {
    fetchActivities()
  }
}

function goToDetail(id: number) {
  uni.navigateTo({
    url: `/subpkg-pages/activity-detail/index?id=${id}`,
  })
}

function goBack() {
  safeNavigateBack()
}

onMounted(() => {
  const sysInfo = uni.getWindowInfo()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  fetchActivities(true)
})
</script>

<style lang="scss" scoped>
.activity-list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 顶部导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;

  .nav-back {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    .nav-back-icon {
      font-size: 36rpx;
      color: #333;
    }
  }

  .nav-title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
  }

  .nav-placeholder {
    width: 60rpx;
  }
}

/* Tab 切换区 */
.tab-bar {
  display: flex;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;

  .tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24rpx 0;
    position: relative;

    .tab-text {
      font-size: 32rpx;
      color: #666;
      transition: all 0.3s;
    }

    .tab-underline {
      position: absolute;
      bottom: 0;
      width: 60rpx;
      height: 4rpx;
      background-color: #ff6b9d;
      border-radius: 2rpx;
    }

    &.active {
      .tab-text {
        font-size: 36rpx;
        font-weight: bold;
        color: #ff6b9d;
      }
    }
  }
}

.activity-list {
  padding: 24rpx;
}

.activity-card {
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;

  .cover-wrapper {
    position: relative;
    width: 100%;
    height: 360rpx;

    .cover-image {
      width: 100%;
      height: 100%;
    }

    .status-tag {
      position: absolute;
      top: 0;
      left: 0;
      background-color: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 24rpx;
      padding: 8rpx 16rpx;
      border-bottom-right-radius: 8rpx;
    }
  }

  .activity-title {
    display: block;
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
    padding: 24rpx 24rpx 0;
  }

  .activity-time {
    display: block;
    font-size: 28rpx;
    color: #999;
    padding: 8rpx 24rpx 24rpx;
  }
}

/* 空状态：活动筹备中占位 */
.prep-placeholder {
  position: relative;
  width: 100%;
  height: 300rpx;
  margin-top: 24rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: linear-gradient(135deg, #F8F8F8 0%, #F0F0F0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.prep-blob {
  position: absolute;
  width: 400rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  filter: blur(40rpx);
}

.prep-blob-1 {
  top: -60rpx;
  left: -80rpx;
}

.prep-blob-2 {
  bottom: -60rpx;
  right: -80rpx;
}

.prep-blob-3 {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.prep-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.prep-text {
  font-family: 'PingFang SC';
  font-size: 36rpx;
  font-weight: 300;
  color: #CCCCCC;
}

.prep-line {
  width: 60rpx;
  height: 1rpx;
  margin-top: 16rpx;
  background-color: #E0E0E0;
}

/* 加载更多 */
.loading-more,
.no-more {
  text-align: center;
  padding: 24rpx 0;

  .loading-text,
  .no-more-text {
    font-size: 24rpx;
    color: #999;
  }
}

.bottom-safe-area {
  height: 40rpx;
}

/* ===== info 卡片模式 ===== */
.activity-card--info {
  padding: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.info-card-row {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, #FFF5F5 0%, #FFF0F5 100%);
  position: relative;

  .info-card-cover {
    width: 120rpx;
    height: 120rpx;
    border-radius: 12rpx;
    flex-shrink: 0;
  }

  .info-card-body {
    flex: 1;
    margin-left: 24rpx;
    overflow: hidden;

    .info-card-title {
      display: block;
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 12rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .info-card-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 6rpx;

      .info-card-label {
        font-size: 24rpx;
        color: #999;
        flex-shrink: 0;
        margin-right: 12rpx;
      }

      .info-card-value {
        font-size: 24rpx;
        color: #666;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .info-card-status {
    position: absolute;
    top: 16rpx;
    right: 16rpx;
    font-size: 22rpx;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    color: #FF6B9D;
    background: rgba(255, 107, 157, 0.1);
  }
}
</style>
