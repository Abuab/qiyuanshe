<template>
  <view class="page">
    <!-- ========== 顶部导航栏 ========== -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">{{ appName }}</text>
        <view class="nav-right"></view>
      </view>
    </view>

    <!-- ========== 内容区（可滚动） ========== -->
    <scroll-view
      class="content-scroll"
      scroll-y
      :style="scrollViewStyle"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- Banner -->
      <view v-if="currentBanner" class="banner-area">
        <image
          class="banner-image"
          :src="currentBanner"
          mode="widthFix"
          @error="onBannerError"
        />
      </view>
      <view v-else class="banner-placeholder">
        <text class="placeholder-text">{{ appName }}</text>
      </view>

      <!-- 横向标签栏 -->
      <scroll-view class="tab-scroll" scroll-x :show-scrollbar="false">
        <view class="tab-list">
          <view
            v-for="circle in circles"
            :key="circle.id"
            class="tab-item"
            :class="{ active: activeCircleId === circle.id }"
            @tap="switchCircle(circle)"
          >
            <text class="tab-text">{{ circle.name }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 用户列表 -->
      <view class="user-list">
        <user-card
          v-for="user in userList"
          :key="user.id"
          :user="user"
          @click="goToUserDetail(user)"
        />

        <view v-if="loadingMore" class="loading-more">
          <text class="loading-text">加载中...</text>
        </view>

        <view v-if="noMore && userList.length > 0" class="no-more">
          <text class="no-more-text">没有更多了</text>
        </view>

        <!-- 空状态 -->
        <view v-if="userList.length === 0 && !loading && !loadingMore" class="empty-state">
          <text class="empty-desc">暂时找不到匹配的对象，</text>
          <text class="empty-link" @tap="goHome">返回首页~</text>
        </view>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { get } from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import { useSystemStore } from '@/store/system'
import UserCard from '@/components/user-card/user-card.vue'
import type { UserCardData } from '@/components/user-card/user-card.vue'

const systemStore = useSystemStore()
const appName = computed(() => systemStore.appName || '志趣相投')

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)

const circles = ref<any[]>([])
const activeCircleId = ref<number>(0)
const currentBanner = ref<string>('')
const userList = ref<UserCardData[]>([])
const pageNum = ref(1)
const loading = ref(true)
const loadingMore = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)

const scrollViewStyle = computed(() => {
  const top = statusBarHeight.value + navBarHeightPx.value
  return `height: calc(100vh - ${top}px); padding-top: ${top}px;`
})

onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  await loadCircles()
})

// ========== 加载圈子列表 ==========
async function loadCircles() {
  try {
    const res = await get<any>('/circles')
    const list = Array.isArray(res) ? res : (res?.list || [])
    circles.value = list.filter((c: any) => c.status === 1)
    if (circles.value.length > 0) {
      activeCircleId.value = circles.value[0].id
      currentBanner.value = circles.value[0].bannerImage || circles.value[0].icon || ''
      await loadUsers(true)
    } else {
      loading.value = false
    }
  } catch (e) {
    console.error('[Circles] loadCircles error:', e)
    loading.value = false
  }
}

// ========== 加载圈子用户 ==========
async function loadUsers(reset = false) {
  if (!activeCircleId.value) return
  if (reset) {
    pageNum.value = 1
    noMore.value = false
    loading.value = true
  }
  try {
    const res = await get<any>(`/circles/${activeCircleId.value}/users`, {
      page: pageNum.value,
      limit: 10,
    })
    const result = res?.list || res || []
    if (reset) {
      userList.value = Array.isArray(result) ? result : result.list || []
    } else {
      const newItems = Array.isArray(result) ? result : result.list || []
      userList.value = [...userList.value, ...newItems]
    }
    const total = res?.total ?? (Array.isArray(result) ? result.length : 0)
    if (userList.value.length >= total && total > 0) {
      noMore.value = true
    }
  } catch (e) {
    console.error('[Circles] loadUsers error:', e)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// ========== 切换圈子 ==========
function switchCircle(circle: any) {
  if (activeCircleId.value === circle.id) return
  activeCircleId.value = circle.id
  currentBanner.value = circle.bannerImage || circle.icon || ''
  loadUsers(true)
}

// ========== 下拉刷新 ==========
async function onRefresh() {
  isRefreshing.value = true
  await loadUsers(true)
  isRefreshing.value = false
}

// ========== 加载更多 ==========
function onLoadMore() {
  if (noMore.value || loadingMore.value) return
  loadingMore.value = true
  pageNum.value++
  loadUsers()
}

// ========== 跳转 ==========
function handleBack() { safeNavigateBack() }
function goToUserDetail(user: UserCardData) {
  uni.navigateTo({ url: `/pages/user-detail/index?id=${user.id}` })
}
function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function onBannerError() {
  currentBanner.value = ''
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FFF5F7; }

// ===== 导航 =====
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; font-weight: 300; }
.nav-title { font-size: 34rpx; font-weight: 400; color: #333; }

// ===== 滚动区 =====
.content-scroll { height: 100vh; box-sizing: border-box; }

// ===== Banner =====
.banner-area { width: 100%; }
.banner-image { width: 100%; display: block; }
.banner-placeholder {
  width: 100%; height: 35vh; background: linear-gradient(135deg, #FFB3C6, #FFD1DC);
  display: flex; align-items: center; justify-content: center;
}
.placeholder-text { font-size: 48rpx; color: #fff; font-weight: 300; letter-spacing: 8rpx; }

// ===== 标签栏 =====
.tab-scroll { white-space: nowrap; background: #fff; padding: 20rpx 0; }
.tab-list { display: flex; padding: 0 24rpx; }
.tab-item {
  flex-shrink: 0; padding: 14rpx 32rpx; margin-right: 16rpx; border-radius: 40rpx;
  background: #F5F5F5; transition: all 0.25s;
  &.active {
    background: #FF4D6A;
    .tab-text { color: #fff; }
  }
}
.tab-text { font-size: 28rpx; color: #666; font-weight: 400; }

// ===== 用户列表 =====
.user-list { padding: 16rpx 0; }
.loading-more, .no-more {
  text-align: center; padding: 30rpx 0; color: #999; font-size: 26rpx;
}

// ===== 空状态 =====
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 80rpx 0;
}
.empty-desc { color: #999; font-size: 28rpx; margin-top: 30rpx; }
.empty-link { color: #FF4D6A; font-size: 28rpx; margin-top: 10rpx; }

// ===== 底部安全区 =====
.bottom-safe { height: 80rpx; }
</style>
