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
        <view class="tab-item" :class="{ active: activeTab === 'followers' }" @tap="switchTab('followers')">
          <text>关注我的</text>
        </view>
        <view class="tab-item" :class="{ active: activeTab === 'following' }" @tap="switchTab('following')">
          <text>我关注的</text>
        </view>
      </view>
    </view>

    <scroll-view
      class="content"
      scroll-y
      :style="{ paddingTop: (statusBarHeight + navBarHeightPx + 80) + 'px' }"
      @scrolltolower="loadMore"
    >
      <!-- 加载中 -->
      <view v-if="loading" class="loading">加载中...</view>

      <!-- 我关注的 - 空状态 -->
      <view v-else-if="activeTab === 'following' && followingList.length === 0 && !loading" class="empty-block">
        <image v-if="followEmptyIcon" :src="followEmptyIcon" mode="aspectFit" class="empty-icon" />
        <text class="empty-text">{{ followEmptyText }}</text>
      </view>

      <!-- 关注我的 - 空状态 -->
      <view v-else-if="activeTab === 'followers' && followerList.length === 0 && !loading" class="empty-block">
        <image v-if="followEmptyIcon" :src="followEmptyIcon" mode="aspectFit" class="empty-icon" />
        <text class="empty-text">{{ followerEmptyText }}</text>
      </view>

      <!-- 我关注的列表 -->
      <view v-for="item in followingList" :key="item.id" class="follow-card" @tap="goToUser(item.id)">
        <image class="avatar" :src="item.avatar || '/static/default-avatar.png'" mode="aspectFill" />
        <view class="info">
          <text class="name">{{ item.nickname || '用户' }}</text>
          <text v-if="item.followedAt" class="follow-time">{{ formatTime(item.followedAt) }}</text>
        </view>
        <view class="unfollow-btn" @tap.stop="handleUnfollow(item.id)"><text>取消</text></view>
      </view>

      <!-- 关注我的列表 -->
      <view v-for="item in followerList" :key="item.id" class="follow-card" @tap="goToUser(item.id)">
        <image class="avatar" :src="item.avatar || '/static/default-avatar.png'" mode="aspectFill" />
        <view class="info">
          <text class="name">{{ item.nickname || '用户' }}</text>
          <text v-if="item.followedAt" class="follow-time">{{ formatTime(item.followedAt) }}</text>
        </view>
      </view>

      <view v-if="noMore && currentList.length > 0" class="no-more">— 没有更多了 —</view>
      <view class="bottom-safe"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { get, del } from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import { useSystemStore } from '@/store/system'
import { storeToRefs } from 'pinia'

const systemStore = useSystemStore()
const { appName, followEmptyText, followerEmptyText, icons } = storeToRefs(systemStore)

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const activeTab = ref<'following' | 'followers'>('following')
const loading = ref(true)

const followingList = ref<any[]>([])
const followerList = ref<any[]>([])
const followingPage = ref(1)
const followerPage = ref(1)
const followingNoMore = ref(false)
const followerNoMore = ref(false)

const followEmptyIcon = computed(() => icons.value?.page?.followEmptyIcon || '')

const noMore = computed(() => (activeTab.value === 'following' ? followingNoMore.value : followerNoMore.value))
const currentList = computed(() => (activeTab.value === 'following' ? followingList.value : followerList.value))

onLoad((options) => {
  const tab = (options as any)?.tab
  if (tab === 'followers') {
    activeTab.value = 'followers'
  }
})

onMounted(async () => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  await fetchList()
})

function formatTime(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min} 关注`
}

function switchTab(tab: 'following' | 'followers') {
  if (activeTab.value === tab) return
  activeTab.value = tab
  fetchList()
}

async function fetchList() {
  loading.value = true
  try {
    if (activeTab.value === 'following') {
      const res = await get<any>(`/users/follows?page=${followingPage.value}&limit=20`)
      const items = res?.list || []
      followingList.value = items
      followingNoMore.value = items.length < 20
    } else {
      const res = await get<any>(`/users/followers?page=${followerPage.value}&limit=20`)
      const items = res?.list || []
      followerList.value = items
      followerNoMore.value = items.length < 20
    }
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

function loadMore() {
  if (noMore.value) return
  if (activeTab.value === 'following') {
    followingPage.value++
    fetchMoreFollowing()
  } else {
    followerPage.value++
    fetchMoreFollowers()
  }
}

async function fetchMoreFollowing() {
  try {
    const res = await get<any>(`/users/follows?page=${followingPage.value}&limit=20`)
    const items = res?.list || []
    followingList.value = followingList.value.concat(items)
    followingNoMore.value = items.length < 20
  } catch (e) { console.error(e) }
}

async function fetchMoreFollowers() {
  try {
    const res = await get<any>(`/users/followers?page=${followerPage.value}&limit=20`)
    const items = res?.list || []
    followerList.value = followerList.value.concat(items)
    followerNoMore.value = items.length < 20
  } catch (e) { console.error(e) }
}

async function handleUnfollow(userId: number) {
  try {
    await del(`/users/${userId}/follow`)
    followingList.value = followingList.value.filter(f => f.id !== userId)
    uni.showToast({ title: '已取消关注', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function handleBack() { safeNavigateBack() }
function goToUser(id: number) { uni.navigateTo({ url: `/pages/user-detail/index?id=${id}` }) }
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

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

.nav-left, .nav-right {
  width: 100rpx;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

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
  color: #e7412b;
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
  background: #e7412b;
  border-radius: 2rpx;
}

.content {
  height: 100vh;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.follow-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.name {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.follow-time {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

.unfollow-btn {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  background: #e7412b;
  border-radius: 30rpx;
}

.unfollow-btn text {
  font-size: 24rpx;
  color: #fff;
}

.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-icon {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.loading {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}

.no-more {
  text-align: center;
  padding: 40rpx 0;
  color: #ccc;
  font-size: 24rpx;
}

.bottom-safe {
  height: 60rpx;
}
</style>
