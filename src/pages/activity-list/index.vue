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
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view class="activity-list">
        <view
          v-for="activity in activityList"
          :key="activity.id"
          class="activity-card"
          @tap="goToDetail(activity.id)"
        >
          <!-- 封面图 -->
          <view class="cover-wrapper">
            <image
              class="cover-image"
              :src="activity.coverImage"
              mode="aspectFill"
            />
            <view v-if="effectiveStatus(activity) !== 1" class="status-tag">
              {{ getStatusText(effectiveStatus(activity)) }}
            </view>
          </view>

          <!-- 标题 -->
          <text class="activity-title">{{ activity.title }}</text>

          <!-- 时间 -->
          <text class="activity-time">
            活动时间: {{ formatDate(activity.startTime) }}-{{ formatDate(activity.endTime) }}
          </text>
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
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'

interface Activity {
  id: number
  title: string
  coverImage: string
  startTime: string
  endTime: string
  status: number
  activityType: string
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

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
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
    console.error('获取活动列表失败:', error)
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
    url: `/pages/activity-detail/index?id=${id}`,
  })
}

function goBack() {
  safeNavigateBack()
}

onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
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

/* 活动列表 */
.activity-scroll {
  height: calc(100vh - 176rpx);
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
</style>
