<template>
  <view class="my-page">
    <view class="nav-bar" :style="{ paddingTop: (statusBarHeight + 6) + 'px' }">
      <view class="nav-title">我的</view>
    </view>

    <scroll-view class="content-scroll" scroll-y enable-flex :style="{ height: 'calc(100vh - 88rpx - 120rpx - ' + (statusBarHeight + 6) + 'px)' }">
      <!-- 用户信息卡片 -->
      <view class="user-card" @tap="goToLogin" v-if="!isLoggedIn">
        <image class="user-avatar" src="/static/default-avatar.png" mode="aspectFill" />
        <view class="user-info">
          <text class="user-name">点击登录</text>
          <text class="user-desc">登录后享受更多服务</text>
        </view>
        <text class="arrow">></text>
      </view>

      <view class="user-card" v-else>
        <image
          class="user-avatar"
          :src="avatarSrc"
          mode="aspectFill"
          @error="onAvatarError"
        />
        <view class="user-info">
          <text class="user-name">{{ userInfo?.nickname || '用户' }}</text>
          <view class="user-tags">
            <text v-if="isVipValid" class="vip-tag">VIP</text>
            <text v-if="userInfo?.isRealName" class="real-tag">已实名</text>
          </view>
        </view>
        <view class="edit-btn" @tap="goToEditProfile">
          <text>编辑资料</text>
        </view>
      </view>

      <!-- 功能菜单 -->
      <view class="menu-section">
        <view class="menu-item" @tap="goToVip">
          <text class="menu-icon">👑</text>
          <text class="menu-text">会员中心</text>
          <text v-if="isVipValid" class="menu-badge vip">已开通</text>
          <text class="arrow">></text>
        </view>

        <view class="menu-item" @tap="goToActivities">
          <text class="menu-icon">📅</text>
          <text class="menu-text">我的活动</text>
          <text class="arrow">></text>
        </view>

        <view class="menu-item" @tap="goToQuestions">
          <text class="menu-icon">💬</text>
          <text class="menu-text">我的回答</text>
          <text class="arrow">></text>
        </view>

        <view class="menu-item" @tap="goToSettings">
          <text class="menu-icon">⚙️</text>
          <text class="menu-text">设置</text>
          <text class="arrow">></text>
        </view>
      </view>

      <view v-if="isLoggedIn" class="logout-section">
        <view class="logout-btn" @tap="handleLogout">
          <text>退出登录</text>
        </view>
      </view>

      <view class="bottom-safe-area"></view>
    </scroll-view>

    <tab-bar />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import { getFullImageUrl } from '@/utils/common'
import { icons } from '@/config/icons'

const userStore = useUserStore()
const avatarError = ref(false)
const statusBarHeight = ref(20)

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
})

const avatarSrc = computed(() => {
  if (avatarError.value) return icons.common.defaultAvatar
  return getFullImageUrl(userStore.userInfo?.avatar) || icons.common.defaultAvatar
})

const onAvatarError = () => {
  avatarError.value = true
}

const isLoggedIn = computed(() => userStore.isLoggedIn)
const userInfo = computed(() => userStore.userInfo)
const isVipValid = computed(() => userStore.isVipValid)

const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/index',
  })
}

const goToEditProfile = () => {
  uni.navigateTo({
    url: '/pages/edit-profile/index',
  })
}

const goToVip = () => {
  uni.switchTab({
    url: '/pages/vip/index',
  })
}

const goToActivities = () => {
  uni.navigateTo({
    url: '/pages/activity-list/index',
  })
}

const goToQuestions = () => {
  uni.navigateTo({
    url: '/pages/my-answers/index',
    fail: () => uni.navigateTo({ url: '/pages/questions/index' }),
  })
}

const goToSettings = () => {
  uni.navigateTo({ url: '/pages/settings/index' })
}

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.my-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.content-scroll {
  height: calc(100vh - 88rpx - 120rpx);
}

.user-card {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background-color: #fff;
  margin-bottom: 20rpx;
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-right: 24rpx;
  background-color: #f5f5f5;
}

.user-info {
  flex: 1;
}

.user-name {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.user-desc {
  font-size: 26rpx;
  color: #999;
}

.user-tags {
  display: flex;
  gap: 12rpx;
  margin-top: 8rpx;
}

.vip-tag {
  padding: 4rpx 12rpx;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #fff;
  font-size: 20rpx;
  border-radius: 4rpx;
}

.real-tag {
  padding: 4rpx 12rpx;
  background-color: #e6f7ff;
  color: #1890ff;
  font-size: 20rpx;
  border-radius: 4rpx;
}

.edit-btn {
  padding: 12rpx 24rpx;
  border: 2rpx solid #FF6B9D;
  border-radius: 32rpx;

  text {
    font-size: 24rpx;
    color: #FF6B9D;
  }
}

.arrow {
  font-size: 28rpx;
  color: #ccc;
  margin-left: 16rpx;
}

.menu-section {
  background-color: #fff;
  margin-bottom: 20rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.menu-badge {
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 20rpx;
  color: #fff;
  margin-right: 12rpx;

  &.vip {
    background-color: #FF6B9D;
  }
}

.logout-section {
  padding: 32rpx;
}

.logout-btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border-radius: 16rpx;

  text {
    font-size: 30rpx;
    color: #FF6B9D;
  }
}

.bottom-safe-area {
  height: 40rpx;
}
</style>
