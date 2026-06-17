<template>
  <view class="my-page">
    <!-- 顶部粉色连续区域：导航 + 用户信息 -->
    <view class="top-pink-area" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <!-- 导航 -->
      <view class="nav-bar" :style="{ paddingTop: (statusBarHeight + 12) + 'px' }">
        <view class="nav-title">我的</view>
      </view>

      <!-- 用户信息区 -->
      <view class="profile-section" @tap="isLoggedIn ? undefined : goToLogin()">
        <!-- 未登录 -->
        <view v-if="!isLoggedIn" class="profile-row">
          <image class="profile-avatar" src="/static/default-avatar.png" mode="aspectFill" />
          <view class="profile-info">
            <text class="profile-nickname">点击登录</text>
            <text class="profile-sub">登录后享受更多服务</text>
          </view>
          <text class="arrow">></text>
        </view>

        <!-- 已登录 -->
        <view v-else class="profile-row">
          <image class="profile-avatar" :src="avatarSrc" mode="aspectFill" @error="onAvatarError" />
          <view class="profile-info">
            <text class="profile-nickname">{{ userInfo?.nickname || '用户' }}</text>
            <view class="profile-id-row">
              <text class="id-badge">ID</text>
              <text class="id-number">{{ formattedUserId }}</text>
              <image
                v-if="pageIcons.copy"
                class="copy-icon"
                :src="pageIcons.copy"
                mode="aspectFit"
                @tap.stop="copyUserId"
              />
              <text v-else class="copy-text" @tap.stop="copyUserId">📋</text>
            </view>
          </view>
          <view class="edit-btn" @tap.stop="goToEditProfile">
            <text>编辑资料 ></text>
          </view>
        </view>

        <!-- 统计行 -->
        <view class="stats-row" v-if="isLoggedIn">
          <view class="stat-item" @tap.stop="goToFollows">
            <text class="stat-label">关注</text>
            <text class="stat-num">{{ stats.following }}</text>
          </view>
          <view class="stat-item" @tap.stop="goToFollowers">
            <text class="stat-label">被关注</text>
            <text class="stat-num">{{ stats.followers }}</text>
          </view>
          <view class="stat-item" @tap.stop="showComingSoon">
            <text class="stat-label">足迹</text>
            <text class="stat-num">{{ stats.footprints }}</text>
          </view>
          <view class="stat-item" @tap.stop="goToVisitors">
            <text class="stat-label">看过我</text>
            <text class="stat-num">{{ stats.viewedMe }}</text>
          </view>
        </view>
      </view>
    </view>

    <scroll-view class="content-scroll" scroll-y enable-flex :style="{ height: 'calc(100vh - 120rpx - ' + (44 + statusBarHeight + 6) + 'px)' }">
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

      <!-- ========== 金刚区：我的问答 + 专属红娘（合并为一张卡片，左对齐网格） ========== -->
      <view class="service-card">
        <view class="service-grid">
          <view class="service-item" @tap="goToQuestions">
            <image v-if="pageIcons.qaIcon" class="service-icon-img" :src="pageIcons.qaIcon" mode="aspectFit" />
            <view v-else class="service-icon-box orange-gradient">
              <text class="service-icon-text">#</text>
            </view>
            <text class="service-label">我的问答</text>
          </view>
          <view class="service-item" @tap="goToMatchmaker">
            <image v-if="pageIcons.matchmakerIcon" class="service-icon-img" :src="pageIcons.matchmakerIcon" mode="aspectFit" />
            <view v-else class="service-icon-box purple-gradient">
              <text class="service-icon-text">👤</text>
            </view>
            <text class="service-label">专属红娘</text>
          </view>
        </view>
      </view>

      <!-- ========== 工具区：7个图标网格卡片（4列对齐） ========== -->
      <view class="tools-card">
        <!-- 4列网格：第一行4个，第二行前3个对齐 -->
        <view class="tool-grid">
          <view
            v-for="item in toolGrid7"
            :key="item.key"
            class="tool-item"
            :class="{ 'tool-placeholder': item.placeholder }"
            @tap="item.placeholder ? undefined : item.handler"
          >
            <template v-if="!item.placeholder">
              <image v-if="pageIcons[item.key]" class="tool-icon-img" :src="pageIcons[item.key]" mode="aspectFit" />
              <text v-else class="tool-icon-emoji">{{ item.emoji }}</text>
              <text class="tool-label">{{ item.label }}</text>
            </template>
          </view>
        </view>
      </view>

      <!-- ========== 公众号关注 ========== -->
      <view class="oa-card" @tap="showComingSoon">
        <view class="oa-avatar pink-heart">
          <image v-if="pageIcons.oaHeart" class="oa-avatar-img" :src="pageIcons.oaHeart" mode="aspectFit" />
          <text v-else class="oa-avatar-icon">❤️</text>
        </view>
        <view class="oa-info">
          <text class="oa-name">{{ appName }}公众号</text>
          <text class="oa-desc">关注后可获得账号消息通知等全功能体验</text>
        </view>
        <view class="oa-follow-btn">
          <text>关注</text>
        </view>
      </view>

      <!-- ========== 底部陪伴信息 ========== -->
      <view class="footer-info">
        <image v-if="pageIcons.footerHeart" class="footer-heart-img" :src="pageIcons.footerHeart" mode="aspectFit" />
        <text v-else class="footer-heart">❤️</text>
        <text class="footer-text">{{ appName }}已经陪伴您{{ daysSinceCreation }}天</text>
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
import { useSystemStore } from '@/store/system'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import { getFullImageUrl } from '@/utils/common'
import { getBaseUrl } from '@/utils/request'
import { icons } from '@/config/icons'

const userStore = useUserStore()
const systemStore = useSystemStore()
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
const appName = computed(() => systemStore.appName || '缘来是你')

// 格式化为7位数显示ID
const formattedUserId = computed(() => {
  const id = userStore.userInfo?.id
  if (!id) return '*******'
  return String(id).padStart(7, '0')
})

// 后台可配置的页面图标（通过 systemStore.icons.page 下发）
const pageIcons = computed(() => systemStore.icons?.page || {})

const daysSinceCreation = computed(() => {
  if (!userStore.userInfo?.createTime) return 0
  const created = new Date(userStore.userInfo.createTime).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - created) / 86400000))
})

const stats = reactive({
  following: 0,
  followers: 0,
  footprints: 0,
  viewedMe: 0,
})

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

const goToLogin = () => uni.navigateTo({ url: '/pages/login/index' })
const goToEditProfile = () => uni.navigateTo({ url: '/pages/edit-profile/index' })
const goToVip = () => uni.switchTab({ url: '/pages/vip/index' })
const goToQuestions = () => {
  uni.navigateTo({ url: '/pages/my-answers/index', fail: () => uni.navigateTo({ url: '/pages/questions/index' }) })
}
const goToSettings = () => uni.navigateTo({ url: '/pages/settings/index' })
const goToFollows = () => uni.navigateTo({ url: '/pages/my-follows/index?tab=following' })
const goToFollowers = () => uni.navigateTo({ url: '/pages/my-follows/index?tab=followers' })
const goToVisitors = () => uni.navigateTo({ url: '/pages/my-visitors/index' })
const goToPhotos = () => uni.navigateTo({ url: '/pages/my-photos/index' })
const goToRealnameAuth = () => uni.navigateTo({ url: '/pages/realname-auth/index' })
const goToMatchmaker = () => uni.switchTab({ url: '/pages/index/index' })

// 7个工具图标 + 1个占位（4列布局，第二行第4列为空）
// 后台可通过 pageIcons[item.key] 配置图标URL
const toolGrid7 = [
  { key: 'myPhotos',    label: '我的相册', emoji: '🖼', handler: goToPhotos },
  { key: 'loveQuotes',  label: '爱情语录', emoji: '💌', handler: showComingSoon },
  { key: 'myGifts',     label: '我的礼物', emoji: '🎁', handler: showComingSoon },
  { key: 'privacy',     label: '隐私设置', emoji: '🔒', handler: goToSettings },
  { key: 'feedback',    label: '问题反馈', emoji: '📝', handler: showComingSoon },
  { key: 'userAgreement', label: '用户协议', emoji: '📄', handler: showComingSoon },
  { key: 'antiFraud',   label: '防骗提醒', emoji: '🛡', handler: showComingSoon },
  { key: 'dummy',       label: '',         emoji: '',     placeholder: true, handler: () => {} },
]
</script>

<style lang="scss" scoped>
.my-page {
  min-height: 100vh;
  background-color: #FFF8FA;
  display: flex;
  flex-direction: column;
}

// ========== 顶部粉色区域 ==========
.top-pink-area {
  background: linear-gradient(180deg, #FFE4EC 0%, #FFF0F5 40%, #FFF8FA 75%, #FFF8FA 100%);
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

// ========== 用户信息区 ==========
.profile-section {
  padding: 24rpx 32rpx 16rpx;
}

.profile-row {
  display: flex;
  align-items: center;
}

.profile-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 14rpx;
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
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.profile-sub {
  font-size: 24rpx;
  color: #999;
}

.profile-id-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.id-badge {
  display: inline-block;
  font-style: italic;
  font-size: 20rpx;
  font-weight: bold;
  color: #fff;
  background-color: #ccc;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  line-height: 1.4;
}

.id-number {
  font-size: 26rpx;
  color: #666;
}

.copy-icon {
  width: 28rpx;
  height: 28rpx;
  opacity: 0.6;
}

.copy-text {
  font-size: 22rpx;
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

.arrow {
  font-size: 28rpx;
  color: #ccc;
  margin-left: 12rpx;
}

// 统计行
.stats-row {
  display: flex;
  justify-content: space-around;
  margin-top: 20rpx;
  padding-top: 16rpx;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #999;
}

.stat-num {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

// ========== 内容滚动区 ==========
.content-scroll {
  flex: 1;
  background-color: #FFF8FA;
}

// ========== 会员卡片 ==========
.vip-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 24rpx 24rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #2D2B55 0%, #4A4458 100%);
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
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: #FFF8E7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  text {
    font-size: 24rpx;
    color: #333;
    font-weight: bold;
  }
}

// ========== 信息认证 ==========
.auth-card {
  display: flex;
  align-items: center;
  margin: 0 24rpx 24rpx;
  padding: 20rpx 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

.auth-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  flex-shrink: 0;
}

.auth-desc {
  flex: 1;
  font-size: 24rpx;
  color: #FF6681;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: 12rpx;
}

// ========== 我的问答 + 专属红娘（合并为一张卡片，4列网格左对齐） ==========
.service-card {
  margin: 0 24rpx 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  padding: 28rpx 20rpx 24rpx;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.service-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.service-icon-box {
  width: 80rpx;
  height: 80rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;

  &.orange-gradient {
    background: linear-gradient(135deg, #FF9F43, #FFB347);
  }

  &.purple-gradient {
    background: linear-gradient(135deg, #A78BFA, #C4B5FD);
  }
}

.service-icon-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}

.service-icon-img {
  width: 80rpx;
  height: 80rpx;
  border-radius: 18rpx;
  margin-bottom: 12rpx;
}

.service-label {
  font-size: 26rpx;
  color: #333;
}

// ========== 7个工具图标卡片（4列网格对齐） ==========
.tools-card {
  background-color: #fff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 32rpx 24rpx 24rpx;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  row-gap: 32rpx;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;

  &.tool-placeholder {
    visibility: hidden;
  }
}

.tool-icon-emoji {
  font-size: 64rpx;
  margin-bottom: 12rpx;
  filter: grayscale(1) opacity(0.7);
}

.tool-icon-img {
  width: 64rpx;
  height: 64rpx;
  margin-bottom: 12rpx;
}

.tool-label {
  font-size: 28rpx;
  color: #333;
  text-align: center;
}

// ========== 公众号卡片 ==========
.oa-card {
  display: flex;
  align-items: center;
  margin: 0 24rpx 24rpx;
  padding: 20rpx 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

.oa-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &.pink-heart {
    background-color: #FF6681;
  }
}

.oa-avatar-img {
  width: 40rpx;
  height: 40rpx;
}

.oa-avatar-icon {
  font-size: 36rpx;
}

.oa-info {
  flex: 1;
  min-width: 0;
}

.oa-name {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
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

// ========== 底部信息 ==========
.footer-info {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0 8rpx;
}

.footer-heart {
  font-size: 26rpx;
  margin-right: 6rpx;
}

.footer-heart-img {
  width: 28rpx;
  height: 28rpx;
  margin-right: 6rpx;
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
