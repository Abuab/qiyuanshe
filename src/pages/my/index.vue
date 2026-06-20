<template>
  <view class="my-page">
    <!-- 顶部粉色连续区域：导航 + 用户信息 -->
    <view class="top-pink-area" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <!-- 导航 -->
      <view class="nav-bar" :style="{ paddingTop: (statusBarHeight + 12) + 'px' }">
        <view class="nav-left" @tap="goToHome">
          <text class="home-icon">🏠</text>
          <view class="home-dot" />
        </view>
        <text class="nav-title">个人中心</text>
        <view class="nav-right" />
      </view>

      <!-- 用户信息区 -->
      <view class="profile-section" @tap="handleProfileTap">
        <!-- 未登录 -->
        <view v-if="!isLoggedIn" class="profile-row">
          <view class="avatar-placeholder">
            <text class="avatar-placeholder-icon">👤</text>
          </view>
          <view class="profile-info">
            <text class="profile-nickname">注册/登录</text>
            <text class="profile-sub">登录后即可体验更多服务</text>
          </view>
          <text class="arrow">></text>
        </view>

        <!-- 已登录 -->
        <view v-else class="profile-row">
          <view class="avatar-wrap">
            <image class="profile-avatar" :src="avatarSrc" mode="aspectFill" @error="onAvatarError" :key="avatarSrc" />
            <view v-if="userInfo?.avatarReviewStatus === 0" class="avatar-review-overlay">
              <text>待审核</text>
            </view>
          </view>
          <view class="profile-info">
            <text class="profile-nickname">{{ userInfo?.nickname || '用户' }}</text>
            <view class="profile-id-row">
              <text class="id-badge">ID</text>
              <text class="id-number">{{ formattedUserId }}</text>
              <image v-if="pageIcons.copy" class="copy-icon" :src="pageIcons.copy" mode="aspectFit" @tap.stop="copyUserId" />
              <text v-else class="copy-text" @tap.stop="copyUserId">📋</text>
            </view>
          </view>
          <view class="edit-btn" @tap.stop="goToEditProfile">
            <text>编辑资料 ></text>
          </view>
        </view>

        <!-- 统计行 -->
        <view class="stats-row">
          <view class="stat-item" @tap.stop="handleStatTap('following')">
            <text class="stat-label">关注</text>
            <text class="stat-num">{{ isLoggedIn ? stats.following : 0 }}</text>
          </view>
          <view class="stat-item" @tap.stop="handleStatTap('followers')">
            <text class="stat-label">被关注</text>
            <text class="stat-num">{{ isLoggedIn ? stats.followers : 0 }}</text>
          </view>
          <view class="stat-item" @tap.stop="handleStatTap('footprints')">
            <text class="stat-label">足迹</text>
            <text class="stat-num">{{ isLoggedIn ? stats.footprints : 0 }}</text>
          </view>
          <view class="stat-item" @tap.stop="handleStatTap('viewedMe')">
            <text class="stat-label">看过我</text>
            <text class="stat-num">{{ isLoggedIn ? stats.viewedMe : 0 }}</text>
          </view>
        </view>
      </view>
    </view>

    <scroll-view
      class="content-scroll"
      scroll-y
      enable-flex
      refresher-enabled
      :refresher-triggered="refreshingVisible"
      refresher-threshold="80"
      @refresherrefresh="onRefresherRefresh"
      :style="{ height: 'calc(100vh - 120rpx - ' + (44 + statusBarHeight + 6) + 'px)' }"
    >
      <!-- ========== 会员卡片 ========== -->
      <view class="vip-card" @tap="handleVipTap">
        <view class="vip-card-left">
          <text class="vip-card-title">{{ isVipValid ? '会员已开通' : '尚未开通会员' }}</text>
          <view class="vip-card-carousel">
            <text class="vip-card-desc">{{ isVipValid ? vipCardTexts[currentCarouselIdx] : '会员权益：牵线，享受红娘牵线服务' }}</text>
          </view>
        </view>
        <view class="vip-card-btn">
          <text>{{ isVipValid ? '已开通' : '开通服务' }}</text>
        </view>
      </view>

      <!-- ========== 信息认证 ========== -->
      <view class="auth-card" @tap="handleAuthTap">
        <text class="auth-label">信息认证</text>
        <text class="auth-desc">{{ userInfo?.isRealName ? '已认证' : '去完成实名认证，获取真诚与信任！' }}</text>
        <text class="arrow auth-arrow">></text>
      </view>

      <!-- ========== 金刚区：我的问答 + AI红娘 + 专属红娘 ========== -->
      <view class="service-card">
        <view class="service-grid">
          <view class="service-item" @tap="handleFeatureTap('questions')">
            <image v-if="pageIcons.qaIcon" class="service-icon-img" :src="pageIcons.qaIcon" mode="aspectFit" />
            <view v-else class="service-icon-box orange-gradient">
              <text class="service-icon-text">#</text>
            </view>
            <text class="service-label">我的问答</text>
          </view>
          <view class="service-item" @tap="handleFeatureTap('aiMatchmaker')">
            <view class="service-icon-box pink-gradient">
              <text class="service-icon-text">💝</text>
            </view>
            <text class="service-label">AI 红娘</text>
          </view>
          <view class="service-item" @tap="handleFeatureTap('matchmaker')">
            <image v-if="pageIcons.matchmakerIcon" class="service-icon-img" :src="pageIcons.matchmakerIcon" mode="aspectFit" />
            <view v-else class="service-icon-box purple-gradient">
              <text class="service-icon-text">👤</text>
            </view>
            <text class="service-label">专属红娘</text>
          </view>
        </view>
      </view>

      <!-- ========== 工具区：7个图标网格卡片 ========== -->
      <view class="tools-card">
        <view class="tool-grid">
          <view
            v-for="item in toolGrid7"
            :key="item.key"
            class="tool-item"
            :class="{ 'tool-placeholder': item.placeholder }"
            @tap="item.placeholder ? undefined : handleToolClick(item.key)"
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
      <view v-if="systemStore.showOfficialAccountPrompt" class="oa-card" @tap="handleOfficialAccount">
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

      <!-- ========== 底部信息 ========== -->
      <view class="footer-info">
        <image v-if="pageIcons.footerHeart" class="footer-heart-img" :src="pageIcons.footerHeart" mode="aspectFit" />
        <text v-else class="footer-heart">❤️</text>
        <text class="footer-text">{{ appName }}已经陪伴您{{ daysSinceCreation }}天</text>
      </view>
      <view class="footer-version">
        <text>v1.0.0</text>
      </view>
      <view class="bottom-safe-area" />
    </scroll-view>

    <tab-bar />

    <!-- 协议弹窗 -->
    <protocol-popup
      :show="showProtocolPopup"
      @update:show="showProtocolPopup = $event"
      @agree="onProtocolAgreeFromMy"
      @close="showProtocolPopup = false"
      @navigate="handleProtocolNavigate"
    />

    <!-- 红娘弹窗 -->
    <matchmaker-popup
      :show="showMatchmaker"
      :matchmaker="selectedMatchmaker || {}"
      @close="showMatchmaker = false"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import MatchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import ProtocolPopup from '@/components/protocol-popup/protocol-popup.vue'
import { getFullImageUrl } from '@/utils/common'
import { getBaseUrl, get } from '@/utils/request'
import { icons } from '@/config/icons'

const userStore = useUserStore()
const systemStore = useSystemStore()
const avatarError = ref(false)
const statusBarHeight = ref(20)
const refreshingVisible = ref(false)
const showProtocolPopup = ref(false)

// 会员卡片轮播
const vipCardTexts = computed(() => systemStore.vipCardTexts || ['限时特惠，尊享VIP特权', '每日签到领金币，解锁更多功能', '开通VIP，优先匹配心仪TA'])
const currentCarouselIdx = ref(0)
let carouselTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  if (userStore.isLoggedIn) loadStats()
  if (vipCardTexts.value.length > 1) {
    carouselTimer = setInterval(() => {
      currentCarouselIdx.value = (currentCarouselIdx.value + 1) % vipCardTexts.value.length
    }, 3000)
  }
})

onShow(() => {
  if (userStore.isLoggedIn) {
    loadStats()
    refreshProfile()
  }
})

const onRefresherRefresh = async () => {
  refreshingVisible.value = true
  if (userStore.isLoggedIn) {
    await Promise.all([refreshProfile(), loadStats()])
  }
  refreshingVisible.value = false
}

onUnmounted(() => {
  if (carouselTimer) clearInterval(carouselTimer)
})

const avatarSrc = computed(() => {
  if (avatarError.value) return icons.common.defaultAvatar
  const url = getFullImageUrl(userStore.userInfo?.avatar)
  if (!url) return icons.common.defaultAvatar
  const sep = url.includes('?') ? '&' : '?'
  const v = userStore.userInfo?.updatedAt || Date.now()
  return url + sep + 'v=' + encodeURIComponent(v)
})

const onAvatarError = () => { avatarError.value = true }

const isLoggedIn = computed(() => userStore.isLoggedIn)
const userInfo = computed(() => userStore.userInfo)
const isVipValid = computed(() => userStore.isVipValid)
const appName = computed(() => systemStore.appName || '栖缘社')
const formattedUserId = computed(() => {
  const id = userStore.userInfo?.id
  if (!id) return '*******'
  return String(id).padStart(7, '0')
})
const pageIcons = computed(() => systemStore.icons?.page || {})

const daysSinceCreation = computed(() => {
  if (!userStore.userInfo?.createTime) return 0
  const created = new Date(userStore.userInfo.createTime).getTime()
  return Math.max(0, Math.floor((Date.now() - created) / 86400000))
})

const stats = reactive({ following: 0, followers: 0, footprints: 0, viewedMe: 0 })

const refreshProfile = async () => {
  try {
    const res: any = await get('/auth/profile')
    if (res) userStore.updateProfile(res)
  } catch {}
}

const loadStats = async () => {
  try {
    const data = await get<any>('/users/stats')
    stats.following = data.following || 0
    stats.followers = data.followers || 0
    stats.footprints = data.footprints || 0
    stats.viewedMe = data.viewedMe || 0
  } catch {}
}

// ========== 未登录拦截 ==========
const requireAuth = (action: () => void) => {
  if (!isLoggedIn.value) {
    // 检查是否已同意协议
    if (uni.getStorageSync('hasAgreedProtocol')) {
      // 已同意协议，直接跳转登录页
      uni.navigateTo({ url: '/pages/login/index' })
    } else {
      // 显示协议弹窗
      showProtocolPopup.value = true
    }
    return
  }
  action()
}

const onProtocolAgreeFromMy = () => {
  // 协议同意后跳转登录页
  uni.navigateTo({ url: '/pages/login/index' })
}

const handleProtocolNavigate = (url: string) => {
  uni.navigateTo({ url })
}

// ========== 点击处理（统一拦截） ==========
const handleProfileTap = () => requireAuth(() => goToEditProfile())
const handleVipTap = () => {
  if (!isLoggedIn.value) {
    requireAuth(() => {})
    return
  }
  uni.switchTab({ url: '/pages/vip/index' })
}
const handleAuthTap = () => requireAuth(() => goToRealnameAuth())
const handleStatTap = (key: string) => requireAuth(() => {
  if (key === 'following') goToFollows()
  else if (key === 'followers') goToFollowers()
  else if (key === 'footprints') goToFootprints()
  else if (key === 'viewedMe') goToVisitors()
})
const handleFeatureTap = (key: string) => requireAuth(() => {
  if (key === 'questions') goToQuestions()
  else if (key === 'aiMatchmaker') goToAiMatchmaker()
  else if (key === 'matchmaker') goToMatchmaker()
})

const copyUserId = () => {
  if (!userStore.userInfo?.id) return
  uni.setClipboardData({ data: String(userStore.userInfo.id), success: () => uni.showToast({ title: '已复制', icon: 'success' }) })
}

const handleOfficialAccount = () => {
  uni.showToast({ title: '请前往微信搜索并关注公众号', icon: 'none' })
}

const showComingSoon = () => { uni.showToast({ title: '该功能正在开发中', icon: 'none' }) }
const goToHome = () => uni.switchTab({ url: '/pages/index/index' })
const goToEditProfile = () => uni.navigateTo({ url: '/pages/edit-profile/index' })
const goToQuestions = () => {
  uni.navigateTo({ url: '/pages/my-answers/index', fail: () => uni.navigateTo({ url: '/pages/questions/index' }) })
}
const goToAiMatchmaker = () => uni.navigateTo({ url: '/pages/ai-matchmaker/index' })
const goToFollows = () => uni.navigateTo({ url: '/pages/my-follows/index?tab=following' })
const goToFollowers = () => uni.navigateTo({ url: '/pages/my-follows/index?tab=followers' })
const goToVisitors = () => uni.navigateTo({ url: '/pages/my-visitors/index?tab=visitors' })
const goToFootprints = () => uni.navigateTo({ url: '/pages/my-visitors/index?tab=views' })
const goToPhotos = () => uni.navigateTo({ url: '/pages/edit-profile/index' })
const goToRealnameAuth = () => uni.navigateTo({ url: '/pages/realname-auth/index' })
const goToLoveQuotes = () => uni.navigateTo({ url: '/pages/love-quotes/index' })
const goToPrivacySettings = () => uni.navigateTo({ url: '/pages/privacy-settings/index' })

const handleToolClick = (key: string) => {
  const map: Record<string, () => void> = {
    myPhotos: goToPhotos,
    loveQuotes: goToLoveQuotes,
    myGifts: showComingSoon,
    privacy: goToPrivacySettings,
    feedback: showComingSoon,
    userAgreement: showComingSoon,
    antiFraud: showComingSoon,
  }
  const fn = map[key]
  if (fn) requireAuth(fn)
}

const toolGrid7 = [
  { key: 'myPhotos', label: '我的相册', emoji: '🖼' },
  { key: 'loveQuotes', label: '爱情语录', emoji: '💌' },
  { key: 'myGifts', label: '我的礼物', emoji: '🎁' },
  { key: 'privacy', label: '隐私设置', emoji: '🔒' },
  { key: 'feedback', label: '问题反馈', emoji: '📝' },
  { key: 'userAgreement', label: '用户协议', emoji: '📄' },
  { key: 'antiFraud', label: '防骗提醒', emoji: '🛡' },
  { key: 'dummy', label: '', emoji: '', placeholder: true },
]

// ========== 红娘弹窗 ==========
const showMatchmaker = ref(false)
const selectedMatchmaker = ref<any>(null)
const matchmakerList = ref<any[]>([])

const goToMatchmaker = async () => {
  if (matchmakerList.value.length === 0) await fetchMatchmakerList()
  if (matchmakerList.value.length === 0) {
    uni.showToast({ title: '暂无红娘信息', icon: 'none' })
    return
  }
  selectedMatchmaker.value = matchmakerList.value[0]
  showMatchmaker.value = true
}

const fetchMatchmakerList = async () => {
  try {
    const res: any = await get('/matchmakers')
    const rawList = Array.isArray(res) ? res : (res?.data || res?.list || [])
    matchmakerList.value = rawList.map((item: any) => ({
      ...item,
      qrCode: getFullImageUrl(item.qrCode || item.qr_code || item.qrcode),
      avatar: getFullImageUrl(item.avatar),
    }))
  } catch { matchmakerList.value = [] }
}
</script>

<style lang="scss" scoped>
.my-page {
  min-height: 100vh; background-color: #FFF8FA;
  display: flex; flex-direction: column;
}

// ========== 顶部粉色区域 ==========
.top-pink-area {
  background: linear-gradient(180deg, #FFE4EC 0%, #FFF0F5 40%, #FFF8FA 75%, #FFF8FA 100%);
}

.nav-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  height: 88rpx; padding: 0 32rpx;
}
.nav-left {
  width: 80rpx; flex-shrink: 0;
  position: relative;
}
.home-icon { font-size: 40rpx; }
.home-dot {
  position: absolute; top: 4rpx; right: 16rpx;
  width: 14rpx; height: 14rpx; border-radius: 50%;
  background: #FF4D4F;
}
.nav-title { font-size: 34rpx; font-weight: bold; color: #333; }
.nav-right { width: 80rpx; flex-shrink: 0; }

// ========== 用户信息区 ==========
.profile-section { padding: 24rpx 32rpx 16rpx; }
.profile-row { display: flex; align-items: center; }

// 未登录占位头像
.avatar-placeholder {
  width: 100rpx; height: 100rpx; border-radius: 50%;
  background: #E5E5E5;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-right: 20rpx;
}
.avatar-placeholder-icon { font-size: 48rpx; opacity: 0.4; }

// 已登录头像
.avatar-wrap { position: relative; flex-shrink: 0; margin-right: 20rpx; }
.profile-avatar {
  width: 100rpx; height: 100rpx; border-radius: 14rpx;
  background-color: #f5f5f5;
}
.avatar-review-overlay {
  position: absolute; bottom: 0; left: 0; right: 0; height: 34%;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  border-radius: 0 0 14rpx 14rpx;
  text { font-size: 18rpx; color: #fff; font-weight: 500; }
}

.profile-info { flex: 1; min-width: 0; }
.profile-nickname { display: block; font-size: 34rpx; font-weight: bold; color: #1A1A1A; }
.profile-sub { display: block; font-size: 24rpx; color: #999; margin-top: 4rpx; }
.profile-id-row { display: flex; align-items: center; margin-top: 4rpx; }
.id-badge { font-size: 20rpx; background: #333; color: #fff; border-radius: 4rpx; padding: 2rpx 8rpx; margin-right: 8rpx; }
.id-number { font-size: 26rpx; color: #666; }
.copy-icon { width: 28rpx; height: 28rpx; margin-left: 8rpx; }
.copy-text { font-size: 24rpx; margin-left: 8rpx; }

.arrow { font-size: 36rpx; color: #CCC; margin-left: 8rpx; }
.edit-btn {
  background: #FFF0F5; border-radius: 24rpx;
  padding: 10rpx 20rpx; flex-shrink: 0; margin-left: 12rpx;
  text { font-size: 22rpx; color: #FF6B8A; }
}

// ========== 统计行 ==========
.stats-row { display: flex; justify-content: space-around; padding: 20rpx 0 0; }
.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-label { font-size: 22rpx; color: #999; margin-bottom: 4rpx; }
.stat-num { font-size: 32rpx; font-weight: bold; color: #1A1A1A; }

// ========== 内容滚动区 ==========
.content-scroll { padding: 0 24rpx; }

// ========== 会员卡片 ==========
.vip-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24rpx 28rpx; margin-bottom: 16rpx;
  background: linear-gradient(135deg, #2D2D6B, #4A4A9E);
  border-radius: 20rpx;
}
.vip-card-left { flex: 1; min-width: 0; }
.vip-card-title { font-size: 28rpx; font-weight: bold; color: #fff; display: block; margin-bottom: 6rpx; }
.vip-card-desc { font-size: 22rpx; color: rgba(255,255,255,0.7); }
.vip-card-btn {
  background: rgba(255,255,255,0.15); border-radius: 32rpx;
  padding: 12rpx 28rpx; flex-shrink: 0; margin-left: 16rpx;
  text { font-size: 24rpx; color: #fff; font-weight: 500; }
}

// ========== 信息认证 ==========
.auth-card {
  display: flex; align-items: center;
  background: #fff; border-radius: 16rpx;
  padding: 28rpx 28rpx; margin-bottom: 16rpx;
}
.auth-label { font-size: 28rpx; font-weight: 600; color: #1A1A1A; flex-shrink: 0; }
.auth-desc { flex: 1; font-size: 24rpx; color: #FF6B8A; margin: 0 16rpx; text-align: right; }
.auth-arrow { font-size: 28rpx; color: #FF6B8A; flex-shrink: 0; }

// ========== 服务网格 ==========
.service-card {
  background: #fff; border-radius: 16rpx;
  padding: 24rpx 20rpx; margin-bottom: 16rpx;
}
.service-grid { display: flex; justify-content: space-around; }
.service-item { display: flex; flex-direction: column; align-items: center; }
.service-icon-img { width: 64rpx; height: 64rpx; }
.service-icon-box {
  width: 64rpx; height: 64rpx; border-radius: 18rpx;
  display: flex; align-items: center; justify-content: center;
}
.orange-gradient { background: linear-gradient(135deg, #FF9A56, #FFB88C); }
.pink-gradient { background: linear-gradient(135deg, #FF6B8A, #FF8FA8); }
.purple-gradient { background: linear-gradient(135deg, #A78BFA, #C4B5FD); }
.service-icon-text { font-size: 36rpx; color: #fff; }
.service-label { font-size: 24rpx; color: #333; margin-top: 10rpx; }

// ========== 工具网格 ==========
.tools-card {
  background: #fff; border-radius: 16rpx;
  padding: 24rpx 20rpx; margin-bottom: 16rpx;
}
.tool-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx 0; }
.tool-item { display: flex; flex-direction: column; align-items: center; }
.tool-placeholder { visibility: hidden; }
.tool-icon-img { width: 56rpx; height: 56rpx; }
.tool-icon-emoji { font-size: 44rpx; }
.tool-label { font-size: 22rpx; color: #666; margin-top: 8rpx; }

// ========== 公众号卡片 ==========
.oa-card {
  display: flex; align-items: center;
  margin-bottom: 24rpx; padding: 20rpx 24rpx;
  background: #fff; border-radius: 16rpx;
}
.oa-avatar {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  flex-shrink: 0; margin-right: 20rpx;
  display: flex; align-items: center; justify-content: center;
  &.pink-heart { background-color: #FF6681; }
}
.oa-avatar-img { width: 40rpx; height: 40rpx; }
.oa-avatar-icon { font-size: 36rpx; }
.oa-info { flex: 1; min-width: 0; }
.oa-name { font-size: 28rpx; font-weight: 600; color: #333; display: block; }
.oa-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.oa-follow-btn {
  background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
  border-radius: 24rpx; padding: 10rpx 28rpx; flex-shrink: 0; margin-left: 16rpx;
  text { font-size: 24rpx; color: #fff; font-weight: 500; }
}

.footer-info {
  display: flex; align-items: center; justify-content: center;
  padding: 20rpx 0 4rpx;
}
.footer-heart-img { width: 28rpx; height: 28rpx; margin-right: 8rpx; }
.footer-heart { font-size: 24rpx; margin-right: 8rpx; }
.footer-text { font-size: 22rpx; color: #BDBDBD; }
.footer-version { display: flex; justify-content: center; padding: 4rpx 0 20rpx; }
.footer-version text { font-size: 20rpx; color: #CCC; }
.bottom-safe-area { height: 40rpx; }
</style>
