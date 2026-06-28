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
      :style="{ paddingTop: navBarTop + 'px' }"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- Banner：固定高度35vh，aspectFill填充 -->
      <view v-if="currentBanner" class="banner-area">
        <image
          class="banner-image"
          :src="currentBanner"
          mode="aspectFill"
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
          <!-- 粉色星球插图（纯CSS） -->
          <view class="empty-planet">
            <view class="planet-body">
              <view class="planet-ring"></view>
              <view class="planet-crater crater-1"></view>
              <view class="planet-crater crater-2"></view>
              <view class="planet-crater crater-3"></view>
            </view>
            <view class="planet-star star-1"></view>
            <view class="planet-star star-2"></view>
            <view class="planet-star star-3"></view>
          </view>
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
import { getFullImageUrl } from '@/utils/common'
import { useSystemStore } from '@/store/system'
import { useUserStore } from '@/store/user'
import UserCard from '@/components/user-card/user-card.vue'
import type { UserCardData } from '@/components/user-card/user-card.vue'

const systemStore = useSystemStore()
const userStore = useUserStore()
const appName = computed(() => systemStore.appName || '志趣相投')

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const navBarTop = computed(() => statusBarHeight.value + navBarHeightPx.value)

const circles = ref<any[]>([])
const activeCircleId = ref<number>(0)
const currentBanner = ref<string>('')
const userList = ref<UserCardData[]>([])
const pageNum = ref(1)
const pageSize = 10
const loading = ref(true)
const loadingMore = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)

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
      currentBanner.value = getFullImageUrl(circles.value[0].bannerImage) || ''
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
    const res = await get<{ list: UserCardData[]; total: number }>(`/circles/${activeCircleId.value}/users`, {
      page: pageNum.value,
      limit: pageSize,
    })

    if (res && res.list) {
      // 过滤掉当前登录用户自己（与首页逻辑一致）
      const currentUserId = userStore.userInfo?.id
      let filteredList = res.list
      if (currentUserId) {
        filteredList = res.list.filter((u: UserCardData) => u.id !== currentUserId)
      }

      if (reset) {
        userList.value = filteredList
      } else {
        // 去重：已在列表中的用户不再追加，避免 wx:key 重复警告
        const existingIds = new Set(userList.value.map(u => u.id))
        const newUsers = filteredList.filter((u: UserCardData) => !existingIds.has(u.id))
        userList.value = [...userList.value, ...newUsers]
      }

      if (res.list.length < pageSize) {
        noMore.value = true
      } else {
        pageNum.value++
      }
    } else {
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
  currentBanner.value = getFullImageUrl(circle.bannerImage) || ''
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
  loadUsers()
}

// ========== 跳转 ==========
function handleBack() {
  safeNavigateBack()
}
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
.page {
  min-height: 100vh;
  background: #FFF5F7;
}

// ===== 导航 =====
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
.nav-left,
.nav-right {
  width: 100rpx;
}
.back-icon {
  font-size: 40rpx;
  color: #333;
  font-weight: 300;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 400;
  color: #333;
}

// ===== 滚动区 =====
.content-scroll {
  height: 100vh;
  box-sizing: border-box;
}

// ===== Banner：固定 35vh 高度 =====
.banner-area {
  width: 100%;
  height: 35vh;
  overflow: hidden;
}
.banner-image {
  width: 100%;
  height: 100%;
}
.banner-placeholder {
  width: 100%;
  height: 35vh;
  background: linear-gradient(135deg, #FFB3C6, #FFD1DC);
  display: flex;
  align-items: center;
  justify-content: center;
}
.placeholder-text {
  font-size: 48rpx;
  color: #fff;
  font-weight: 300;
  letter-spacing: 8rpx;
}

// ===== 标签栏 =====
.tab-scroll {
  white-space: nowrap;
  background: #fff;
  padding: 20rpx 0;
}
.tab-list {
  display: flex;
  padding: 0 24rpx;
}
.tab-item {
  flex-shrink: 0;
  padding: 14rpx 32rpx;
  margin-right: 16rpx;
  border-radius: 40rpx;
  background: #F5F5F5;
  transition: all 0.25s;
  &.active {
    background: #FF8899;
    .tab-text {
      color: #fff;
    }
  }
}
.tab-text {
  font-size: 28rpx;
  color: #666;
  font-weight: 400;
}

// ===== 用户列表 =====
.user-list {
  padding: 0 24rpx;
}
.loading-more,
.no-more {
  text-align: center;
  padding: 30rpx 0;
  color: #999;
  font-size: 26rpx;
}

// ===== 空状态 =====
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0 80rpx;
}
.empty-desc {
  color: #999;
  font-size: 28rpx;
  margin-top: 40rpx;
}
.empty-link {
  color: #FF4D6A;
  font-size: 28rpx;
  margin-top: 10rpx;
}

// ===== 粉色星球插图（纯CSS） =====
.empty-planet {
  position: relative;
  width: 200rpx;
  height: 200rpx;
}

.planet-body {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFB3C6 0%, #FF6B81 100%);
  box-shadow: 0 8rpx 30rpx rgba(255, 107, 129, 0.3);
}

.planet-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-20deg);
  width: 200rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 6rpx solid rgba(255, 179, 198, 0.5);
  border-top-color: transparent;
  border-bottom-color: transparent;
}

.planet-crater {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}
.crater-1 {
  top: 30rpx;
  left: 30rpx;
  width: 24rpx;
  height: 24rpx;
}
.crater-2 {
  top: 80rpx;
  right: 25rpx;
  width: 18rpx;
  height: 18rpx;
}
.crater-3 {
  bottom: 35rpx;
  left: 50rpx;
  width: 14rpx;
  height: 14rpx;
}

.planet-star {
  position: absolute;
  background: #FFB3C6;
  border-radius: 50%;
  animation: star-twinkle 2s ease-in-out infinite;
}
.star-1 {
  top: 0;
  right: 20rpx;
  width: 10rpx;
  height: 10rpx;
  animation-delay: 0s;
}
.star-2 {
  top: 40rpx;
  left: 0;
  width: 14rpx;
  height: 14rpx;
  animation-delay: 0.6s;
}
.star-3 {
  bottom: 20rpx;
  right: -10rpx;
  width: 8rpx;
  height: 8rpx;
  animation-delay: 1.2s;
}

@keyframes star-twinkle {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}

// ===== 底部安全区 =====
.bottom-safe {
  height: 80rpx;
}
</style>
