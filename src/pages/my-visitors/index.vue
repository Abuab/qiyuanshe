<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">{{ appName }}</text>
        <view class="nav-right"></view>
      </view>
      <!-- 两个分区标签 -->
      <view class="tab-row">
        <view class="tab-item" :class="{ active: activeTab === 'visitors' }" @tap="switchTab('visitors')">
          <text>谁看过我</text>
        </view>
        <view class="tab-item" :class="{ active: activeTab === 'views' }" @tap="switchTab('views')">
          <text>我看过谁</text>
        </view>
      </view>
    </view>

    <scroll-view
      class="content"
      scroll-y
      :style="{ paddingTop: (statusBarHeight + navBarHeightPx + tabRowHeightPx) + 'px' }"
      @scrolltolower="loadMore"
    >
      <!-- 加载中 -->
      <view v-if="loading" class="loading">加载中...</view>

      <!-- 我看过谁 -->
      <template v-if="!loading && activeTab === 'views'">
        <view v-if="viewList.length === 0" class="empty-block">
          <text class="empty-text">还没有浏览过任何用户</text>
        </view>
        <view v-else>
          <view v-for="item in viewList" :key="item.id" class="follow-card" @tap="goToUser(item.id)">
            <image class="avatar" :src="resolveAvatar(item.avatar)" mode="aspectFill" />
            <view class="info">
              <view class="name-row">
                <text class="name">{{ item.displayName || item.nickname || '用户' }}</text>
                <text v-if="item.isRealName" class="realname-tag">已实名</text>
              </view>
              <text class="meta-line">{{ formatMeta(item) }}</text>
              <view class="view-count-inline">
                <text>第<text class="count-num">{{ item.viewCount || 1 }}</text>次查看TA的资料</text>
              </view>
            </view>
            <text class="time-text">{{ formatTime(item.lastViewedAt) }}</text>
          </view>
          <view v-if="viewNoMore" class="no-more">— 没有更多了 —</view>
        </view>
      </template>

      <!-- 谁看过我 -->
      <template v-if="!loading && activeTab === 'visitors'">
        <view v-if="visitorList.length === 0" class="empty-block">
          <text class="empty-text">还没有人看过您</text>
        </view>
        <view v-else>
          <view v-for="item in visitorList" :key="item.id" class="follow-card" @tap="goToUser(item.id)">
            <image class="avatar" :src="resolveAvatar(item.avatar)" mode="aspectFill" />
            <view class="info">
              <view class="name-row">
                <text class="name">{{ item.displayName || item.nickname || '用户' }}</text>
                <text v-if="item.isRealName" class="realname-tag">已实名</text>
              </view>
              <text class="meta-line">{{ formatMeta(item) }}</text>
              <view class="view-count-inline">
                <text>第<text class="count-num">{{ item.viewCount || 1 }}</text>次查看您的资料</text>
              </view>
            </view>
            <text class="time-text">{{ formatTime(item.lastVisitedAt) }}</text>
          </view>
          <view v-if="visitorNoMore" class="no-more">— 没有更多了 —</view>
        </view>
      </template>

      <view class="bottom-safe"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { get } from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import { getFullImageUrl } from '@/utils/common'
import { icons } from '@/config/icons'
import { useSystemStore } from '@/store/system'
import { storeToRefs } from 'pinia'

const systemStore = useSystemStore()
const { appName } = storeToRefs(systemStore)

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const tabRowHeightPx = ref(40)
const activeTab = ref<'views' | 'visitors'>('views')
const loading = ref(true)

const viewList = ref<any[]>([])
const visitorList = ref<any[]>([])
const viewPage = ref(1)
const visitorPage = ref(1)
const viewNoMore = ref(false)
const visitorNoMore = ref(false)

onLoad((options: any) => {
  if (options?.tab === 'visitors') {
    activeTab.value = 'visitors'
  }
})

onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  tabRowHeightPx.value = Math.round(80 * (sysInfo.windowWidth || 375) / 750)
  await fetchList()
})

function formatMeta(item: any) {
  const parts: string[] = []
  if (item.age) parts.push(item.age + '岁')
  if (item.occupation) parts.push(item.occupation)
  if (item.housingStatus) parts.push(item.housingStatus)
  return parts.join(' | ') || '暂无信息'
}

function formatTime(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function switchTab(tab: 'views' | 'visitors') {
  if (activeTab.value === tab) return
  activeTab.value = tab
  fetchList()
}

async function fetchList() {
  loading.value = true
  try {
    if (activeTab.value === 'views') {
      viewPage.value = 1
      const res = await get<any>('/users/my-views?page=1&limit=20')
      const items = res?.list || []
      viewList.value = items
      viewNoMore.value = items.length < 20
    } else {
      visitorPage.value = 1
      const res = await get<any>('/users/visitors?page=1&limit=20')
      const items = res?.list || []
      visitorList.value = items
      visitorNoMore.value = items.length < 20
    }
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

function loadMore() {
  if (activeTab.value === 'views') {
    if (viewNoMore.value) return
    viewPage.value++
    fetchMoreViews()
  } else {
    if (visitorNoMore.value) return
    visitorPage.value++
    fetchMoreVisitors()
  }
}

async function fetchMoreViews() {
  try {
    const res = await get<any>(`/users/my-views?page=${viewPage.value}&limit=20`)
    const items = res?.list || []
    viewList.value = viewList.value.concat(items)
    viewNoMore.value = items.length < 20
  } catch (e) { console.error(e) }
}

async function fetchMoreVisitors() {
  try {
    const res = await get<any>(`/users/visitors?page=${visitorPage.value}&limit=20`)
    const items = res?.list || []
    visitorList.value = visitorList.value.concat(items)
    visitorNoMore.value = items.length < 20
  } catch (e) { console.error(e) }
}

function handleBack() { safeNavigateBack() }
function goToUser(id: number) { uni.navigateTo({ url: `/pages/user-detail/index?id=${id}` }) }
function resolveAvatar(avatar: string) {
  if (!avatar) return icons.common.defaultAvatar
  if (avatar.startsWith('http') || avatar.startsWith('/static/')) return avatar
  return getFullImageUrl(avatar)
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }

.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
}

.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }

.tab-row {
  display: flex;
  height: 80rpx;
  border-bottom: 1rpx solid #eee;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #666;
  position: relative;
}

.tab-item.active {
  color: #666;
  font-weight: bold;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background: #ff6b9d;
  border-radius: 2rpx;
}

.content {
  height: 100vh;
  padding: 0 24rpx;
  box-sizing: border-box;
}

.follow-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 12rpx;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  flex-shrink: 0;
  align-self: flex-start;
}

.info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
  align-self: flex-start;
}

.name-row {
  display: flex;
  align-items: center;
}

.name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.realname-tag {
  margin-left: 12rpx;
  display: flex;
  align-items: center;
  padding: 2rpx 12rpx;
  background-color: #E8F4FD;
  border-radius: 8rpx;
  font-size: 20rpx;
  color: #409EFF;
}

.meta-line {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 2rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.view-count-inline {
  font-size: 22rpx;
  color: #999;
}

.count-num {
  color: #FF4444;
  font-weight: 700;
  font-size: 26rpx;
}

.time-text {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #999;
  align-self: flex-start;
  margin-top: 6rpx;
}

.loading { text-align: center; padding: 100rpx 0; color: #999; }
.no-more { text-align: center; padding: 24rpx 0; color: #ccc; font-size: 24rpx; }

.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.bottom-safe { height: 60rpx; }
</style>
