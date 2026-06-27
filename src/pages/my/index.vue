<template>
  <view class="my-page">
    <!-- 顶部固定导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <text class="nav-title">个人中心</text>
      </view>
    </view>

    <!-- 顶部粉色区域：用户信息 -->
    <view class="top-pink-area" :style="{ paddingTop: navTotalHeight + 'px' }">
      <!-- 用户信息区 -->
      <view class="profile-section" @tap="isLoggedIn ? undefined : goToLogin()">
        <!-- 未登录 -->
        <view v-if="!isLoggedIn" class="profile-row guest-row">
          <view class="guest-avatar">
            <text class="guest-icon">👤</text>
          </view>
          <view class="profile-info">
            <text class="profile-nickname">注册/登录</text>
            <text class="profile-sub">登录后即可体验更多服务</text>
          </view>
          <text class="arrow">></text>
        </view>

        <!-- 已登录 -->
        <view v-else class="profile-row">
          <view class="avatar-wrap" :class="{ 'avatar-wrap-female': userInfo?.gender === 2 }">
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
          <view class="stat-item" @tap.stop="goToFootprints">
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

    <scroll-view
      class="content-scroll"
      scroll-y
      enable-flex
      refresher-enabled
      :refresher-triggered="refreshingVisible"
      refresher-threshold="80"
      @refresherrefresh="onRefresherRefresh"
      :style="{ height: 'calc(100vh - 100rpx - ' + navTotalHeight + 'px)' }"
    >
      <!-- ========== 会员卡片 ========== -->
      <view class="vip-card" @tap="goToVip">
        <view class="vip-card-left">
          <text class="vip-card-title">{{ isVipValid ? '会员已开通' : '尚未开通会员' }}</text>
          <view class="vip-card-carousel">
            <text class="vip-card-desc">{{ vipCardTexts[currentCarouselIdx] }}</text>
          </view>
        </view>
        <view class="vip-card-btn">
          <text>{{ isVipValid ? '已开通' : '开通服务' }}</text>
        </view>
      </view>

      <!-- ========== 信息认证（含认证状态） ========== -->
      <view class="auth-card" @tap="goToRealnameAuth">
        <view class="auth-card-header">
          <text class="auth-label">信息认证</text>
          <text class="auth-desc">{{ userInfo?.isRealName ? '已认证' : '去签署单身承诺，真心诚信寻觅爱情！' }}</text>
          <text class="arrow">></text>
        </view>
        <view class="auth-steps">
          <view class="auth-step">
            <view class="step-icon" :class="{ done: authSteps.wechat }">
              <uni-icons v-if="authSteps.wechat" type="checkmarkempty" size="28rpx" color="#FFFFFF"></uni-icons>
            </view>
            <text class="step-label" :class="{ done: authSteps.wechat }">微信授权</text>
            <text v-if="!authSteps.wechat" class="step-action" @tap.stop="goAuthWechat">去认证</text>
          </view>
          <view class="step-line" :class="{ done: authSteps.wechat && authSteps.phone }" />
          <view class="auth-step">
            <view class="step-icon" :class="{ done: authSteps.phone }">
              <uni-icons v-if="authSteps.phone" type="checkmarkempty" size="28rpx" color="#FFFFFF"></uni-icons>
            </view>
            <text class="step-label" :class="{ done: authSteps.phone }">手机绑定</text>
            <text v-if="!authSteps.phone" class="step-action" @tap.stop="goAuthPhone">去认证</text>
          </view>
          <view class="step-line" :class="{ done: authSteps.phone && authSteps.realName }" />
          <view class="auth-step">
            <view class="step-icon" :class="{ done: authSteps.realName }">
              <uni-icons v-if="authSteps.realName" type="checkmarkempty" size="28rpx" color="#FFFFFF"></uni-icons>
            </view>
            <text class="step-label" :class="{ done: authSteps.realName }">实名认证</text>
            <text v-if="!authSteps.realName" class="step-action" @tap.stop="goRealNameAuth">去认证</text>
          </view>
        </view>
      </view>

      <!-- ========== 金刚区：我的问答 + 专属红娘 + AI助手 ========== -->
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
          <view v-if="showAiAssistantEntry" class="service-item" @tap="aiAssistantExpanded = !aiAssistantExpanded">
            <view class="service-icon-box ai-gradient">
              <text class="service-icon-text">🤖</text>
            </view>
            <text class="service-label">AI助手</text>
          </view>
        </view>
        <!-- AI助手展开面板 -->
        <view v-if="showAiAssistantEntry && aiAssistantExpanded" class="ai-assistant-panel">
          <view v-if="systemStore.isAiFeatureEnabled('matchmaker')" class="ai-sub-item" @tap="goToAiMatchmaker">
            <text class="ai-sub-emoji">💝</text>
            <text class="ai-sub-label">AI 红娘</text>
            <text class="ai-sub-desc">智能匹配缘分</text>
            <text class="arrow">></text>
          </view>
          <view v-if="systemStore.isAiFeatureEnabled('fun_quiz')" class="ai-sub-item" @tap="goToAiQuiz">
            <text class="ai-sub-emoji">💬</text>
            <text class="ai-sub-label">AI 情感问答</text>
            <text class="ai-sub-desc">解答情感困惑</text>
            <text class="arrow">></text>
          </view>
          <view v-if="isLoggedIn && systemStore.isAiFeatureEnabled('profile_gen')" class="ai-sub-item" @tap="goToAiImpression">
            <text class="ai-sub-emoji">✨</text>
            <text class="ai-sub-label">AI 个人印象</text>
            <text class="ai-sub-desc">{{ aiProfileText ? '已生成' : '生成魅力印象' }}</text>
            <text class="arrow">></text>
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
            @tap="item.placeholder ? undefined : handleToolClick(item.key)"
          >
            <template v-if="!item.placeholder">
              <image v-if="pageIcons[item.key]" class="tool-icon-img" :src="pageIcons[item.key]" mode="aspectFit" />
              <view v-else-if="item.key === 'myLikes'" class="tool-icon-likes">
                <uni-icons type="heart-filled" size="36rpx" color="#fff"></uni-icons>
              </view>
              <text v-else class="tool-icon-emoji">{{ item.emoji }}</text>
              <text class="tool-label">{{ item.label }}</text>
            </template>
          </view>
        </view>
      </view>

      <!-- ========== 公众号关注 ========== -->
      <view v-if="isLoggedIn && systemStore.showOfficialAccountPrompt" class="oa-card" @tap="handleOfficialAccount">
        <view class="oa-avatar red-ring-heart">
          <image v-if="pageIcons.oaHeart" class="oa-avatar-img" :src="pageIcons.oaHeart" mode="aspectFit" />
          <uni-icons v-else type="heart-filled" size="36rpx" color="#FF6B6B"></uni-icons>
        </view>
        <view class="oa-info">
          <text class="oa-name">{{ appName }}公众号</text>
          <text class="oa-desc">关注后可获得账号消息通知等全功能体验</text>
        </view>
        <view class="oa-follow-btn">
          <text>关注</text>
        </view>
      </view>

      <!-- ========== 底部陪伴信息（仅登录后显示） ========== -->
      <view v-if="isLoggedIn" class="footer-info">
        <view class="footer-heart-circle">
          <image v-if="pageIcons.footerHeart" class="footer-heart-img" :src="pageIcons.footerHeart" mode="aspectFit" />
          <uni-icons v-else type="heart-filled" size="20rpx" color="#fff"></uni-icons>
        </view>
        <text class="footer-text">{{ appName }}已经陪伴您{{ daysSinceCreation }}天</text>
      </view>
      <view class="footer-version">
        <text>v1.0.0</text>
      </view>

      <view class="bottom-safe-area"></view>
    </scroll-view>

    <tab-bar />

    <!-- 红娘弹窗 -->
    <matchmaker-popup
      :show="showMatchmaker"
      :matchmaker="selectedMatchmaker || {}"
      @close="showMatchmaker = false"
    />

    <!-- 问题反馈弹窗 -->
    <feedback-popup
      :show="showFeedback"
      @close="showFeedback = false"
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
import FeedbackPopup from '@/components/feedback-popup/feedback-popup.vue'
import { getFullImageUrl } from '@/utils/common'
import request, { getBaseUrl, get } from '@/utils/request'
import { icons } from '@/config/icons'
import { authSteps, initAuthSteps, goAuthWechat, goAuthPhone, goRealNameAuth } from '@/composables/useAuthSteps'

const userStore = useUserStore()
const systemStore = useSystemStore()
const avatarError = ref(false)
const statusBarHeight = ref(20)
// 导航栏总高度（px）：statusBar + 88rpx → px
const navTotalHeight = computed(() => {
  const sysInfo = uni.getSystemInfoSync()
  const screenWidth = sysInfo.screenWidth || 390
  const rpxRatio = screenWidth / 750
  return statusBarHeight.value + 88 * rpxRatio
})
const refreshingVisible = ref(false)  // 下拉刷新状态
const aiProfileText = ref('')        // AI 个人印象文本
const profileGenLoading = ref(false) // AI 印象生成中
const aiAssistantExpanded = ref(false) // AI助手面板展开状态

// AI助手入口是否显示：优先看 ai_assistant 开关，若后端未配置则看任意子功能是否开启
const showAiAssistantEntry = computed(() => {
  // 总开关关闭则入口不显示
  if (!systemStore.aiMasterEnabled) return false
  const features = systemStore.aiFeatures as Record<string, boolean>
  // 有明确的 ai_assistant 配置就用它
  if ('ai_assistant' in features) return features.ai_assistant === true
  // 后端未配置时，只要有任意 AI 子功能开启就显示入口
  return !!(
    features.matchmaker ||
    features.fun_quiz ||
    features.profile_gen ||
    features.match ||
    features.chat_skill
  )
})

// 会员卡片轮播
// 会员卡片轮播（3条，可从后台 /system/config 的 vipCardTexts 字段配置）
const vipCardTexts = computed(() => {
  const texts = systemStore.vipCardTexts || []
  const defaults = ['限时特惠，尊享VIP特权', '每日签到领金币，解锁更多功能', '开通VIP，优先匹配心仪TA']
  const result: string[] = []
  for (let i = 0; i < 3; i++) {
    result.push(texts[i] || defaults[i])
  }
  return result
})
const currentCarouselIdx = ref(0)
let carouselTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  loadStats()
  // 启动会员卡片轮播（3秒切换一次）
  if (vipCardTexts.value.length > 1) {
    carouselTimer = setInterval(() => {
      currentCarouselIdx.value = (currentCarouselIdx.value + 1) % vipCardTexts.value.length
    }, 3000)
  }
  // 在已有 onMounted 末尾追加：
  initAuthSteps()
})

onShow(() => {
  loadStats()
  refreshProfile()
  systemStore.loadAiFeatureConfig(true) // force=true 确保每次显示都拉最新开关状态
  loadAiProfileText()
})

const onRefresherRefresh = async () => {
  refreshingVisible.value = true
  await Promise.all([refreshProfile(), loadStats()])
  refreshingVisible.value = false
}

onUnmounted(() => {
  if (carouselTimer) clearInterval(carouselTimer)
})

const avatarSrc = computed(() => {
  if (avatarError.value) return icons.common.defaultAvatar
  const url = getFullImageUrl(userStore.userInfo?.avatar)
  if (!url) return icons.common.defaultAvatar
  // 加版本参数避免微信缓存旧头像（updatedAt 兜底用当前时间戳）
  const sep = url.includes('?') ? '&' : '?'
  const v = userStore.userInfo?.updatedAt || Date.now()
  return url + sep + 'v=' + encodeURIComponent(v)
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

const refreshProfile = async () => {
  if (!isLoggedIn.value) return
  try {
    const res: any = await get('/auth/profile')
    if (res) {
      userStore.updateProfile(res)
    }
  } catch {}
}

const loadStats = async () => {
  if (!isLoggedIn.value) return
  try {
    const data = await get<any>('/users/stats')
    stats.following = data.following || 0
    stats.followers = data.followers || 0
    stats.footprints = data.footprints || 0
    stats.viewedMe = data.viewedMe || 0
  } catch {}
}

const copyUserId = () => {
  if (!userStore.userInfo?.id) return
  uni.setClipboardData({
    data: String(userStore.userInfo.id),
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}

const handleOfficialAccount = () => {
  // 跳转公众号关注引导页（小程序需关联公众号后使用 official-account 组件）
  uni.showToast({ title: '请前往微信搜索并关注公众号', icon: 'none' })
}

const showComingSoon = () => {
  uni.showToast({ title: '该功能正在开发中', icon: 'none' })
}

const goToLogin = () => uni.navigateTo({ url: '/pages/login/index' })
const goToEditProfile = () => uni.navigateTo({ url: '/pages/edit-profile/index' })
const goToVip = () => uni.switchTab({ url: '/pages/vip/index' })
const goToQuestions = () => {
  if (!isLoggedIn.value) { goToLogin(); return }
  uni.navigateTo({ url: '/pages/my-answers/index', fail: () => uni.navigateTo({ url: '/pages/questions/index' }) })
}
const goToAiMatchmaker = () => {
  if (!isLoggedIn.value) { goToLogin(); return }
  uni.navigateTo({ url: '/pages/ai-matchmaker/index' })
}
const goToAiQuiz = () => {
  uni.navigateTo({ url: '/pages/ai-quiz/ai-quiz' })
}

// AI 个人印象：点击入口
const goToAiImpression = () => {
  if (aiProfileText.value) {
    uni.showModal({
      title: 'AI 个人印象',
      content: aiProfileText.value,
      confirmText: '刷新',
      cancelText: '关闭',
      success: (res) => { if (res.confirm) refreshMyProfileGen() }
    })
  } else {
    refreshMyProfileGen()
  }
}

// AI 个人印象：加载已有印象
const loadAiProfileText = async () => {
  if (!isLoggedIn.value || !systemStore.isAiFeatureEnabled('profile_gen')) return
  try {
    const userId = userStore.userInfo?.id
    if (!userId) return
    const res: any = await get(`/users/${userId}/detail`)
    if (res?.aboutMe?.aiProfileText) {
      aiProfileText.value = res.aboutMe.aiProfileText
    }
  } catch { /* 静默 */ }
}

// AI 个人印象：生成/刷新
const refreshMyProfileGen = async () => {
  profileGenLoading.value = true
  try {
    const res: any = await request({ url: '/ai/profile-gen/refresh', method: 'POST' })
    if (res?.personaText) {
      aiProfileText.value = res.personaText
    }
    uni.showToast({ title: 'AI印象已生成', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '生成失败，请完善资料后重试', icon: 'none' })
  } finally {
    profileGenLoading.value = false
  }
}
const goToSettings = () => uni.navigateTo({ url: '/pages/settings/index' })
const goToFollows = () => uni.navigateTo({ url: '/pages/my-follows/index?tab=following' })
const goToFollowers = () => uni.navigateTo({ url: '/pages/my-follows/index?tab=followers' })
const goToVisitors = () => uni.navigateTo({ url: '/pages/my-visitors/index?tab=visitors' })
const goToFootprints = () => uni.navigateTo({ url: '/pages/my-visitors/index?tab=views' })
const goToPhotos = () => uni.navigateTo({ url: '/pages/edit-profile/index' })
const goToRealnameAuth = () => {
  if (!isLoggedIn.value) { goToLogin(); return }
  uni.navigateTo({ url: '/pages/realname-auth/index' })
}

const showMatchmaker = ref(false)
const selectedMatchmaker = ref<any>(null)
const matchmakerList = ref<any[]>([])

const goToMatchmaker = async () => {
  // 弹出红娘联系方式弹窗
  if (matchmakerList.value.length === 0) {
    await fetchMatchmakerList()
  }
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
  } catch {
    matchmakerList.value = []
  }
}
const goToLoveQuotes = () => uni.navigateTo({ url: '/pages/love-quotes/index' })
const goToMyLikes = () => uni.navigateTo({ url: '/pages/my-likes/my-likes' })
const goToPrivacySettings = () => uni.navigateTo({ url: '/pages/privacy-settings/index' })
const goToUserAgreement = () => uni.navigateTo({ url: '/pages/agreement/index?type=user' })
const goToAntiFraud = () => uni.navigateTo({ url: '/pages/agreement/index?type=antiFraud' })

// 问题反馈弹窗
const showFeedback = ref(false)

const goToFeedback = () => {
  if (!isLoggedIn.value) { goToLogin(); return }
  showFeedback.value = true
}

// 中央分发器 - 避免 mini-program 中函数引用丢失
// 需要登录的 key 列表
const requireLoginKeys = new Set(['myPhotos', 'loveQuotes', 'myLikes', 'privacy', 'feedback'])
const handleToolClick = (key: string) => {
  // 未登录时，提示登录
  if (!isLoggedIn.value && requireLoginKeys.has(key)) {
    goToLogin()
    return
  }
  const map: Record<string, () => void> = {
    myPhotos: goToPhotos,
    loveQuotes: goToLoveQuotes,
    myLikes: goToMyLikes,
    privacy: goToPrivacySettings,
    feedback: goToFeedback,
    userAgreement: goToUserAgreement,
    antiFraud: goToAntiFraud,
  }
  const fn = map[key]
  if (fn) fn()
}

// 7个工具图标 + 1个占位（4列布局，第二行第4列为空）
// 后台可通过 pageIcons[item.key] 配置图标URL
const toolGrid7 = [
  { key: 'myPhotos',    label: '我的相册', emoji: '🖼' },
  { key: 'loveQuotes',  label: '爱情语录', emoji: '💌' },
  { key: 'myLikes',     label: '我的喜欢', emoji: '❤️' },
  { key: 'privacy',     label: '隐私设置', emoji: '🔒' },
  { key: 'feedback',    label: '问题反馈', emoji: '📝' },
  { key: 'userAgreement', label: '用户协议', emoji: '📄' },
  { key: 'antiFraud',   label: '防骗提醒', emoji: '🛡' },
  { key: 'dummy',       label: '',        emoji: '',      placeholder: true },
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
  background: linear-gradient(180deg, #FFE4EC 0%, #FFE4EC 60%, #FFF0F5 100%);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 400;
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

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
  margin-right: 20rpx;
  border-radius: 18rpx;
  border: 2px solid #3B82F6;
  box-shadow: 0 0 6px 2px rgba(59, 130, 246, 0.4);
}

.avatar-wrap-female {
  border-color: #FF6B9D;
  box-shadow: 0 0 6px 2px rgba(255, 107, 157, 0.4);
}

.profile-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 16rpx;
  background-color: #f5f5f5;
  display: block;
}

.avatar-review-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 34%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 14rpx 14rpx;

  text {
    font-size: 18rpx;
    color: #fff;
    font-weight: 500;
  }
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
  font-size: 26rpx;
  font-weight: 500;
  color: #fff;
  background-color: #aaa;
  padding: 0 7rpx;
  border-radius: 20rpx;
  line-height: 1.2;
  vertical-align: baseline;
  margin-right: 4rpx;
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
  font-size: 32rpx;
  color: #999;
  margin-left: 12rpx;
}

// 未登录占位头像
.guest-row {
  align-items: center;
}
.guest-avatar {
  width: 100rpx; height: 100rpx; border-radius: 50%;
  background: #E5E5E5;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-right: 20rpx;
}
.guest-icon {
  font-size: 48rpx; color: #999;
}

// ========== 统计行 ==========
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
  padding-left: 8rpx;
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

.vip-card-carousel {
  min-height: 32rpx;
  overflow: hidden;
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

// ========== 信息认证（含认证状态） ==========
.auth-card {
  margin: 0 24rpx 24rpx;
  padding: 20rpx 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

.auth-card-header {
  display: flex;
  align-items: center;
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

.auth-steps {
  margin-top: 20rpx;
  display: flex;
  align-items: flex-start;
}

.auth-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.step-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #eeeeee;
  display: flex;
  align-items: center;
  justify-content: center;

  &.done {
    background: #52c41a;
  }
}

.step-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999999;

  &.done {
    color: #333333;
  }
}

.step-action {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #ff6b6b;
}

.step-line {
  height: 2rpx;
  background: #eeeeee;
  flex: 0.5;
  min-width: 40rpx;
  position: relative;
  top: 20rpx;

  &.done {
    background: #52c41a;
  }
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

  &.pink-gradient {
    background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
  }

  &.ai-gradient {
    background: linear-gradient(135deg, #6366F1, #8B5CF6);
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

// ===== AI助手展开面板 =====
.ai-assistant-panel {
  margin-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
  padding-top: 16rpx;
}

.ai-sub-item {
  display: flex;
  align-items: center;
  padding: 16rpx 12rpx;
  border-radius: 12rpx;

  &:active {
    background-color: #f8f8ff;
  }
}

.ai-sub-emoji {
  font-size: 36rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.ai-sub-label {
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
  margin-right: 16rpx;
}

.ai-sub-desc {
  flex: 1;
  font-size: 24rpx;
  color: #999;
  text-align: right;
  margin-right: 8rpx;
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

.tool-icon-likes {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
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
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &.red-ring-heart {
    background: #fff;
    border: 3rpx solid #FF6B6B;
  }
}

.oa-avatar-img {
  width: 36rpx;
  height: 36rpx;
}

.footer-heart-circle {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10rpx;
  flex-shrink: 0;
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

.footer-heart-img {
  width: 28rpx;
  height: 28rpx;
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

.auth-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.step-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #eeeeee;
  display: flex;
  align-items: center;
  justify-content: center;

  &.done {
    background: #52c41a;
  }
}

.step-label {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999999;

  &.done {
    color: #333333;
  }
}

.step-action {
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #ff6b6b;
}

.step-line {
  height: 2rpx;
  background: #eeeeee;
  flex: 0.5;
  min-width: 40rpx;
  position: relative;
  top: 24rpx;

  &.done {
    background: #52c41a;
  }
}
</style>
