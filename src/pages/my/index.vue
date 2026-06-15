<template>
  <view class="my-page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: (statusBarHeight + 6) + 'px', height: (44 + statusBarHeight + 6) + 'px' }">
      <view class="nav-title">我的</view>
    </view>

    <scroll-view class="content-scroll" scroll-y enable-flex :style="{ height: 'calc(100vh - 120rpx - ' + (44 + statusBarHeight + 6) + 'px)' }">
      <!-- ========== 用户信息头部卡片 ========== -->
      <view class="profile-card" @tap="isLoggedIn ? undefined : goToLogin()">
        <!-- 未登录 -->
        <view v-if="!isLoggedIn" class="profile-row">
          <image class="profile-avatar" src="/static/default-avatar.png" mode="aspectFill" />
          <view class="profile-info">
            <text class="profile-nickname">点击登录</text>
            <text class="profile-id">登录后享受更多服务</text>
          </view>
          <text class="arrow">></text>
        </view>

        <!-- 已登录 -->
        <view v-else class="profile-row">
          <image class="profile-avatar" :src="avatarSrc" mode="aspectFill" @error="onAvatarError" />
          <view class="profile-info">
            <text class="profile-nickname">{{ userInfo?.nickname || '用户' }}</text>
            <view class="profile-id-row">
              <text class="profile-id">ID {{ userInfo?.id || '******' }}</text>
              <text class="copy-id" @tap.stop="copyUserId">📋</text>
            </view>
          </view>
          <view class="edit-btn" @tap.stop="goToEditProfile">
            <text>编辑资料 ></text>
          </view>
        </view>

        <!-- 统计行 -->
        <view class="stats-row" v-if="isLoggedIn">
          <view class="stat-item" @tap.stop="goToFollows">
            <text class="stat-num">{{ stats.following }}</text>
            <text class="stat-label">关注</text>
          </view>
          <view class="stat-item" @tap.stop="goToVisitors">
            <text class="stat-num">{{ stats.followers }}</text>
            <text class="stat-label">被关注</text>
          </view>
          <view class="stat-item" @tap.stop="showComingSoon">
            <text class="stat-num">{{ stats.footprints }}</text>
            <text class="stat-label">足迹</text>
          </view>
          <view class="stat-item" @tap.stop="goToVisitors">
            <text class="stat-num">{{ stats.viewedMe }}</text>
            <text class="stat-label">看过我</text>
          </view>
        </view>
      </view>

      <!-- ========== 会员卡片 ========== -->
      <view class="vip-card" @tap="isVipValid ? goToVip() : showComingSoon()">
        <view class="vip-card-left">
          <text class="vip-card-title">{{ isVipValid ? '会员已开通' : '尚未开通会员' }}</text>
          <text class="vip-card-desc">会员权益：金币，给心意TA赠送礼物</text>
        </view>
        <view class="vip-card-btn">
          <text>{{ isVipValid ? '已开通' : '开通服务' }}</text>
        </view>
      </view>

      <!-- ========== 信息认证 ========== -->
      <view class="auth-card" @tap="goToRealnameAuth">
        <text class="auth-label">信息认证</text>
        <text class="auth-desc">{{ userInfo?.isRealName ? '已认证' : '去签署单身承诺，真心诚信寻觅爱情！' }}</text>
        <text class="arrow">></text>
      </view>

      <!-- ========== 金刚区图标网格 ========== -->
      <view class="icon-grid">
        <!-- 第一行 2 个 -->
        <view class="grid-row-2">
          <view class="grid-item large" @tap="goToQuestions">
            <view class="grid-icon-box orange-gradient">
              <text class="grid-icon-text">#</text>
            </view>
            <text class="grid-label">我的问答</text>
          </view>
          <view class="grid-item large" @tap="goToMatchmaker">
            <view class="grid-icon-box purple-gradient">
              <text class="grid-icon-text">💁</text>
            </view>
            <text class="grid-label">专属红娘</text>
          </view>
        </view>

        <!-- 第二行 4 个 -->
        <view class="grid-row-4">
          <view class="grid-item" @tap="goToPhotos">
            <text class="grid-emoji">🖼</text>
            <text class="grid-label">我的相册</text>
          </view>
          <view class="grid-item" @tap="showComingSoon">
            <text class="grid-emoji">💌</text>
            <text class="grid-label">爱情语录</text>
          </view>
          <view class="grid-item" @tap="showComingSoon">
            <text class="grid-emoji">🎁</text>
            <text class="grid-label">我的礼物</text>
          </view>
          <view class="grid-item" @tap="goToSettings">
            <text class="grid-emoji">🔒</text>
            <text class="grid-label">隐私设置</text>
          </view>
        </view>

        <!-- 第三行 3 个 -->
        <view class="grid-row-3">
          <view class="grid-item" @tap="showComingSoon">
            <text class="grid-emoji">📝</text>
            <text class="grid-label">问题反馈</text>
          </view>
          <view class="grid-item" @tap="showComingSoon">
            <text class="grid-emoji">📄</text>
            <text class="grid-label">用户协议</text>
          </view>
          <view class="grid-item" @tap="showComingSoon">
            <text class="grid-emoji">🛡</text>
            <text class="grid-label">防骗提醒</text>
          </view>
        </view>
      </view>

      <!-- ========== 公众号关注 ========== -->
      <view class="oa-card" @tap="showComingSoon">
        <image class="oa-avatar" src="/static/default-avatar.png" mode="aspectFill" />
        <view class="oa-info">
          <text class="oa-name">灵通相亲公众号</text>
          <text class="oa-desc">关注获取更多相亲资讯</text>
        </view>
        <view class="oa-follow-btn">
          <text>关注</text>
        </view>
      </view>

      <!-- ========== 原有菜单列表 ========== -->
      <view class="menu-section">
        <view
          v-for="item in menuList"
          :key="item.key"
          class="menu-item"
          @tap="item.handler"
        >
          <image
            v-if="getMenuIcon(item.key)"
            class="menu-icon-img"
            :src="getMenuIcon(item.key)"
            mode="aspectFit"
          />
          <text v-else class="menu-icon">{{ item.emoji }}</text>
          <text class="menu-text">{{ item.label }}</text>
          <template v-if="item.key === 'vipCenter' && isVipValid">
            <text class="menu-badge vip">已开通</text>
          </template>
          <template v-if="item.key === 'realnameAuth'">
            <text v-if="userInfo?.isRealName" class="menu-badge real">已认证</text>
            <text v-else class="menu-badge warn">未认证</text>
          </template>
          <text class="arrow">></text>
        </view>
      </view>

      <!-- ========== 底部陪伴信息 ========== -->
      <view class="footer-info">
        <text class="footer-heart">❤️</text>
        <text class="footer-text">缘来是你已经陪伴您{{ daysSinceCreation }}天</text>
      </view>
      <view class="footer-version">
        <text>v1.0.0</text>
      </view>

      <view class="bottom-safe-area"></view>
    </scroll-view>

    <tab-bar />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, reactive } from 'vue'
import { useUserStore } from '@/store/user'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import { getFullImageUrl } from '@/utils/common'
import { getBaseUrl } from '@/utils/request'
import { icons } from '@/config/icons'
import { useIcon } from '@/composables/useIcon'

const userStore = useUserStore()
const { getMenuIcon } = useIcon()
const avatarError = ref(false)
const statusBarHeight = ref(20)

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  loadStats()
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
const daysSinceCreation = computed(() => {
  if (!userStore.userInfo?.createdAt) return 0
  const created = new Date(userStore.userInfo.createdAt).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - created) / 86400000))
})

const stats = reactive({
  following: 0,
  followers: 0,
  footprints: 0,
  viewedMe: 0,
})

// 加载统计数据
const loadStats = () => {
  if (!isLoggedIn.value) return
  uni.request({
    url: getBaseUrl() + '/users/stats',
    method: 'GET',
    success: (res: any) => {
      const data = res?.data
      if (data) {
        stats.following = data.following || 0
        stats.followers = data.followers || 0
        stats.footprints = data.footprints || 0
        stats.viewedMe = data.viewedMe || 0
      }
    },
  })
}

const copyUserId = () => {
  if (!userStore.userInfo?.id) return
  uni.setClipboardData({
    data: String(userStore.userInfo.id),
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}

const showComingSoon = () => {
  uni.showToast({ title: '该功能正在开发中', icon: 'none' })
}

const goToLogin = () => {
  uni.navigateTo({ url: '/pages/login/index' })
}

const goToEditProfile = () => {
  uni.navigateTo({ url: '/pages/edit-profile/index' })
}

const goToVip = () => {
  uni.switchTab({ url: '/pages/vip/index' })
}

const goToActivities = () => {
  uni.navigateTo({ url: '/pages/activity-list/index' })
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

const goToFollows = () => {
  uni.navigateTo({ url: '/pages/my-follows/index' })
}

const goToVisitors = () => {
  uni.navigateTo({ url: '/pages/my-visitors/index' })
}

const goToPhotos = () => {
  uni.navigateTo({ url: '/pages/my-photos/index' })
}

const goToRealnameAuth = () => {
  uni.navigateTo({ url: '/pages/realname-auth/index' })
}

const goToHelp = () => {
  uni.navigateTo({ url: '/pages/help/index' })
}

const goToMatchmaker = () => {
  uni.switchTab({ url: '/pages/index/index' })
  // 触发红娘弹窗需要在首页处理，此处简单跳转
}

const menuList = [
  { key: 'vipCenter', label: '会员中心', emoji: '👑', handler: goToVip },
  { key: 'activities', label: '我的活动', emoji: '📅', handler: goToActivities },
  { key: 'answers', label: '我的回答', emoji: '💬', handler: goToQuestions },
  { key: 'follows', label: '我的关注', emoji: '❤️', handler: goToFollows },
  { key: 'visitors', label: '谁看过我', emoji: '👁', handler: goToVisitors },
  { key: 'help', label: '帮助与反馈', emoji: '❓', handler: goToHelp },
  { key: 'settings', label: '设置', emoji: '⚙️', handler: goToSettings },
]
</script>

<style lang="scss" scoped>
.my-page {
  min-height: 100vh;
  background-color: #FFF5F7;
}

.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: none;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.content-scroll {
  height: calc(100vh - 88rpx - 120rpx);
}

// ========== 用户信息卡片 ==========
.profile-card {
  background-color: #fff;
  margin: 16rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}

.profile-row {
  display: flex;
  align-items: center;
}

.profile-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 12rpx;
  margin-right: 20rpx;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-nickname {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 6rpx;
}

.profile-id-row {
  display: flex;
  align-items: center;
}

.profile-id {
  font-size: 24rpx;
  color: #999;
}

.copy-id {
  font-size: 22rpx;
  margin-left: 8rpx;
  color: #999;
}

.edit-btn {
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #FF6B9D, #FF8FB0);
  border-radius: 32rpx;
  flex-shrink: 0;

  text {
    font-size: 24rpx;
    color: #fff;
  }
}

// 统计行
.stats-row {
  display: flex;
  justify-content: space-around;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f5f5f5;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 4rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #999;
}

// ========== 会员卡片 ==========
.vip-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 24rpx 16rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #3B2C5C 0%, #5C3D7A 50%, #7B4FA0 100%);
  border-radius: 16rpx;
}

.vip-card-left {
  flex: 1;
  min-width: 0;
}

.vip-card-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 6rpx;
}

.vip-card-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}

.vip-card-btn {
  padding: 14rpx 28rpx;
  background-color: #FFD1DC;
  border-radius: 32rpx;
  flex-shrink: 0;

  text {
    font-size: 24rpx;
    color: #5C3D7A;
    font-weight: 500;
  }
}

// ========== 信息认证 ==========
.auth-card {
  display: flex;
  align-items: center;
  margin: 0 24rpx 16rpx;
  padding: 20rpx 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

.auth-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  flex-shrink: 0;
  margin-right: 12rpx;
}

.auth-desc {
  flex: 1;
  font-size: 24rpx;
  color: #FF6681;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// ========== 金刚区图标网格 ==========
.icon-grid {
  background-color: #fff;
  margin: 0 24rpx 16rpx;
  border-radius: 16rpx;
  padding: 20rpx 16rpx;
}

.grid-row-2 {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.grid-row-4 {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16rpx;
  padding: 0 8rpx;
}

.grid-row-3 {
  display: flex;
  justify-content: space-around;
  padding: 0 8rpx;
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;

  &.large {
    flex: 1;
  }
}

.grid-icon-box {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;

  &.orange-gradient {
    background: linear-gradient(135deg, #FF9A56, #FFB347);
  }

  &.purple-gradient {
    background: linear-gradient(135deg, #A18CD1, #C2A5F3);
  }

  .grid-icon-text {
    font-size: 36rpx;
    font-weight: bold;
    color: #fff;
  }
}

.grid-emoji {
  font-size: 44rpx;
  margin-bottom: 8rpx;
}

.grid-label {
  font-size: 22rpx;
  color: #333;
  text-align: center;
}

// ========== 公众号卡片 ==========
.oa-card {
  display: flex;
  align-items: center;
  margin: 0 24rpx 16rpx;
  padding: 20rpx 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

.oa-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: #f5f5f5;
  flex-shrink: 0;
  margin-right: 20rpx;
}

.oa-info {
  flex: 1;
  min-width: 0;
}

.oa-name {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 4rpx;
}

.oa-desc {
  font-size: 22rpx;
  color: #999;
}

.oa-follow-btn {
  padding: 12rpx 28rpx;
  background-color: #FF6681;
  border-radius: 32rpx;

  text {
    font-size: 24rpx;
    color: #fff;
  }
}

// ========== 菜单列表 ==========
.menu-section {
  background-color: #fff;
  margin: 0 24rpx 16rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 24rpx 24rpx;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.menu-icon-img {
  width: 40rpx;
  height: 40rpx;
  margin-right: 20rpx;
}

.menu-text {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.menu-badge {
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 20rpx;
  color: #fff;
  margin-right: 12rpx;

  &.vip { background-color: #FF6681; }
  &.real { background-color: #07c160; }
  &.warn { background-color: #f5a623; }
}

.arrow {
  font-size: 28rpx;
  color: #ccc;
  margin-left: 8rpx;
}

// ========== 底部信息 ==========
.footer-info {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0 8rpx;
}

.footer-heart {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.footer-text {
  font-size: 24rpx;
  color: #999;
}

.footer-version {
  display: flex;
  justify-content: center;
  padding-bottom: 20rpx;

  text {
    font-size: 22rpx;
    color: #ccc;
  }
}

.bottom-safe-area {
  height: 40rpx;
}
</style>
