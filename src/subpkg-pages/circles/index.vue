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
      :scroll-top="scrollToVal" @scroll="onScroll"
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

      <!-- 用户列表（复用首页组件） -->
      <user-list-section
        :users="userList"
        :loading-more="loadingMore"
        :no-more="noMore"
        @user-click="goToUserDetail"
      >
        <template #empty>
          <view class="cp-empty">
            <view class="cp-illust">
              <!-- 散布四角星 -->
              <view class="cp-star cp-star-1"></view>
              <view class="cp-star cp-star-2"></view>
              <view class="cp-star cp-star-3"></view>
              <view class="cp-star cp-star-4"></view>
              <!-- 圆点装饰 -->
              <view class="cp-dot cp-dot-1"></view>
              <view class="cp-dot cp-dot-2"></view>
              <view class="cp-dot cp-dot-3"></view>
              <!-- 底部椭圆阴影 -->
              <view class="cp-shadow"></view>
              <!-- 土星环（置于星球后方） -->
              <view class="cp-ring"></view>
              <!-- 粉色星球 -->
              <view class="cp-planet">
                <view class="cp-crater cp-crater-1"></view>
                <view class="cp-crater cp-crater-2"></view>
                <!-- 顶部小皇冠 -->
                <view class="cp-crown">
                  <view class="cp-crown-tri"></view>
                  <view class="cp-crown-dots">
                    <view class="cp-crown-dot"></view>
                    <view class="cp-crown-dot"></view>
                    <view class="cp-crown-dot"></view>
                  </view>
                </view>
              </view>
            </view>
            <view class="cp-text">
              <text class="cp-text-gray">暂时找不到匹配的对象，</text>
              <text class="cp-text-pink" @tap="goHome">返回首页~</text>
            </view>
          </view>
        </template>
      </user-list-section>

      <view class="bottom-safe"></view>
    </scroll-view>
    <BackTop :show="showBackTop" @click="scrollToTop" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { get } from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import { getFullImageUrl } from '@/utils/common'
import { useSystemStore } from '@/store/system'
import { useUserStore } from '@/store/user'
import UserListSection from '@/components/user-list-section/user-list-section.vue'
import BackTop from '@/components/back-top/back-top.vue'
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
const loadingMore = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)

const scrollToVal = ref(0)
const showBackTop = ref(false)
const onScroll = (e: any) => { showBackTop.value = e.detail.scrollTop > 600 }
const scrollToTop = () => { scrollToVal.value = scrollToVal.value ? 0 : 0.001; showBackTop.value = false }

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
    }
  } catch (e) {
    console.error('[Circles] loadCircles error:', e)
  }
}

// ========== 加载圈子用户 ==========
async function loadUsers(reset = false) {
  if (!activeCircleId.value) return
  if (reset) {
    pageNum.value = 1
    noMore.value = false
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
  uni.switchTab({
    url: '/pages/index/index',
    fail: () => uni.navigateTo({ url: '/pages/index/index' }),
  })
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
  height: 25vh;
  overflow: hidden;
}
.banner-image {
  width: 100%;
  height: 100%;
}
.banner-placeholder {
  width: 100%;
  height: 25vh;
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

// ===== 底部安全区 =====
.bottom-safe {
  height: 80rpx;
}

// ===== 纯 CSS 空状态：暂时找不到匹配的对象 =====
.cp-empty {
  width: 100%;
  min-height: 600rpx;
  background: #FFF8FA;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.cp-illust {
  position: relative;
  width: 300rpx;
  height: 300rpx;
}

// 底部椭圆阴影
.cp-shadow {
  position: absolute;
  top: 78%;
  left: 50%;
  transform: translateX(-50%);
  width: 100rpx;
  height: 16rpx;
  border-radius: 50%;
  background: rgba(255, 182, 193, 0.3);
  filter: blur(2rpx);
}

// 土星环
.cp-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-25deg);
  width: 180rpx;
  height: 50rpx;
  border: 3rpx solid #fff;
  border-radius: 50%;
  background: transparent;
  z-index: 2;
}

// 粉色星球
.cp-planet {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #FFD1DC 0%, #FFB6C1 50%, #FF8FAB 100%);
  border: 3rpx solid #fff;
  z-index: 3;
}

// 陨石坑
.cp-crater {
  position: absolute;
  border-radius: 50%;
}
.cp-crater-1 {
  top: 30%;
  left: 30%;
  width: 16rpx;
  height: 16rpx;
  background: rgba(255, 255, 255, 0.6);
}
.cp-crater-2 {
  bottom: 25%;
  right: 25%;
  width: 10rpx;
  height: 10rpx;
  background: rgba(255, 255, 255, 0.5);
}

// 顶部小皇冠
.cp-crown {
  position: absolute;
  top: -20rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cp-crown-tri {
  width: 0;
  height: 0;
  border-left: 4rpx solid transparent;
  border-right: 4rpx solid transparent;
  border-bottom: 6rpx solid #fff;
  margin-bottom: 2rpx;
}
.cp-crown-dots {
  display: flex;
  gap: 4rpx;
}
.cp-crown-dot {
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: #fff;
}

// 四角星
.cp-star {
  position: absolute;
  clip-path: polygon(50% 0%, 55% 40%, 95% 50%, 55% 60%, 50% 100%, 45% 60%, 5% 50%, 45% 40%);
  z-index: 4;
}
.cp-star-1 {
  top: 20%;
  left: 15%;
  width: 20rpx;
  height: 20rpx;
  background: #FF8FAB;
  transform: rotate(15deg);
}
.cp-star-2 {
  top: 25%;
  right: 10%;
  width: 24rpx;
  height: 24rpx;
  background: #FF8FAB;
  transform: rotate(-10deg);
}
.cp-star-3 {
  bottom: 35%;
  left: 20%;
  width: 12rpx;
  height: 12rpx;
  background: #FFB6C1;
  transform: rotate(20deg);
}
.cp-star-4 {
  top: 60%;
  right: 22%;
  width: 10rpx;
  height: 10rpx;
  background: #FFD1DC;
  transform: rotate(-15deg);
}

// 圆点装饰
.cp-dot {
  position: absolute;
  border-radius: 50%;
  z-index: 4;
}
.cp-dot-1 {
  top: 45%;
  left: 10%;
  width: 16rpx;
  height: 16rpx;
  background: #FFD1DC;
}
.cp-dot-2 {
  top: 55%;
  right: 15%;
  width: 20rpx;
  height: 20rpx;
  background: transparent;
  border: 2rpx solid #FFD1DC;
}
.cp-dot-3 {
  top: 15%;
  right: 30%;
  width: 8rpx;
  height: 8rpx;
  background: #FFB6C1;
}

// 文字区
.cp-text {
  margin-top: 40rpx;
  text-align: center;
  letter-spacing: 1rpx;
}
.cp-text-gray {
  font-size: 28rpx;
  color: #999;
}
.cp-text-pink {
  font-size: 28rpx;
  color: #FF6B9D;
}
</style>
