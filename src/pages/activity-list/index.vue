<template>
  <view class="activity-list-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <text class="nav-back-icon">&#xe679;</text>
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
            <view v-if="activity.status !== 1" class="status-tag">
              {{ getStatusText(activity.status) }}
            </view>
          </view>

          <!-- 标题 -->
          <text class="activity-title">{{ activity.title }}</text>

          <!-- 时间 -->
          <text class="activity-time">
            {{ formatDate(activity.startTime) }} - {{ formatDate(activity.endTime) }}
          </text>
        </view>

        <!-- 空状态 -->
        <view v-if="activityList.length === 0 && !loading" class="empty-state">
          <text class="empty-icon">&#xe6a8;</text>
          <text class="empty-text">暂无活动</text>
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

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
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
  if (!noMoreData.value && !loadingMore.value) {
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
  height: 88rpx;
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

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;

  .empty-icon {
    font-size: 120rpx;
    color: #ccc;
    margin-bottom: 24rpx;
  }

  .empty-text {
    font-size: 28rpx;
    color: #999;
  }
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
