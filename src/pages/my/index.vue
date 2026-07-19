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
            <image class="guest-avatar-img" :src="icons.common.defaultAvatar" mode="aspectFill" />
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
            <view class="profile-nickname-row">
              <text class="profile-nickname">{{ userStore.displayNickname || '用户' }}</text>
            </view>
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
      :style="{ height: 'calc(100vh - 100rpx - ' + navTotalHeight + 'px)' }"
      :key="'scroll-' + (aiAssistantExpanded ? '1' : '0')"
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
          <text class="auth-desc">去完成实名认证,获取真诚与信任!</text>
          <text class="arrow">></text>
        </view>
      </view>

      <!-- ========== 金刚区：我的问答 + 专属红娘 + AI助手 ========== -->
      <view class="service-card">
        <view class="service-grid">
          <view class="service-item" @tap="goToQuestions">
            <view class="service-icon-box" style="background-color: #FFF3E0;">
              <image class="service-icon-img" src="/static/icons/home-grid/jinghao.png" mode="aspectFit" />
            </view>
            <text class="service-label">我的问答</text>
          </view>
          <view class="service-item" @tap="goToMatchmaker">
            <view class="service-icon-box" style="background-color: #F3E5F5;">
              <image class="service-icon-img" src="/static/icons/home-grid/nvxing.png" mode="aspectFit" />
            </view>
            <text class="service-label">专属红娘</text>
          </view>
          <view v-if="showAiAssistantEntry" class="service-item" @tap="aiAssistantExpanded = !aiAssistantExpanded">
            <view class="service-icon-box" style="background-color: #E3F2FD;">
              <image class="service-icon-img" src="/static/icons/home-grid/ai-audit.png" mode="aspectFit" />
            </view>
            <text class="service-label">AI助手</text>
          </view>
          <view class="service-item" @tap="goMyPersonality">
            <view class="service-icon-box" style="background-color: #FCE4EC;">
              <image class="service-icon-img" src="/static/icons/personality.png" mode="aspectFit" />
              <view v-if="personalityTested" class="service-dot" />
            </view>
            <text class="service-label">{{ myPersonalityLabel }}</text>
          </view>
        </view>
        <!-- AI助手展开面板 -->
        <view v-if="showAiAssistantEntry && aiAssistantExpanded" class="ai-assistant-panel">
          <view v-if="systemStore.isAiFeatureEnabled('matchmaker')" class="ai-sub-item" @tap="goToAiMatchmaker">
            <text class="ai-sub-star">✦</text>
            <text class="ai-sub-label">AI 红娘</text>
            <text class="ai-sub-desc">智能匹配缘分</text>
            <text class="arrow">></text>
          </view>
          <view v-if="systemStore.isAiFeatureEnabled('fun_quiz')" class="ai-sub-item" @tap="goToAiQuiz">
            <text class="ai-sub-star">✦</text>
            <text class="ai-sub-label">AI 情感问答</text>
            <text class="ai-sub-desc">解答情感困惑</text>
            <text class="arrow">></text>
          </view>
          <view v-if="isLoggedIn && systemStore.isAiFeatureEnabled('profile_gen')" class="ai-sub-item" @tap="goToAiImpression">
            <text class="ai-sub-star">✦</text>
            <text class="ai-sub-label">AI 个人印象</text>
            <text class="ai-sub-desc">{{ aiProfileText ? '已生成' : '生成魅力印象' }}</text>
            <text class="arrow">></text>
          </view>
          <view v-if="showAiPersonalityEntry" class="ai-sub-item" @tap="goToAiPersonality">
            <text class="ai-sub-star">✦</text>
            <text class="ai-sub-label">{{ aiPersonalityCopy.label }}</text>
            <text class="ai-sub-desc">{{ personalityTested ? aiPersonalityCopy.descTested : aiPersonalityCopy.descUntested }}</text>
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
              <AppIcon :name="item.iconName" size="56" color="#333333" />
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
        <text class="footer-heart-uni">♥</text>
        <text class="footer-text">{{ appName }}已经陪伴您{{ daysSinceCreation }}天</text>
      </view>
      <view class="bottom-safe-area"></view>
    </scroll-view>

    <tab-bar />

    <!-- 红娘弹窗 -->
    <matchmaker-popup
      :show="showMatchmaker"
      :matchmaker="selectedMatchmaker || {}"
      @close="showMatchmaker = false"
      @more="openMatchmakerList"
    />

    <matchmaker-list-popup
      :show="showMatchmakerList"
      :matchmakers="matchmakerList"
      @update:show="showMatchmakerList = $event"
      @close="showMatchmakerList = false"
      @contact="onSelectMatchmaker"
    />

    <!-- 问题反馈弹窗 -->
    <feedback-popup
      :show="showFeedback"
      @close="showFeedback = false"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import MatchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import MatchmakerListPopup from '@/components/matchmaker-list-popup/matchmaker-list-popup.vue'
import FeedbackPopup from '@/components/feedback-popup/feedback-popup.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import { getFullImageUrl } from '@/utils/common'
import request, { getBaseUrl, get } from '@/utils/request'
import { icons } from '@/config/icons'
import { resolveAndExposeCopy, reportCopyClick } from '@/utils/personality'

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

// ===== AI 性格解读入口（第4项）=====
const personalityTested = ref(false) // 当前用户是否已完成人格测试
const aiPersonalityCopy = reactive({
  label: 'AI 性格解读',
  descTested: '查看专属性格分析',
  descUntested: '先测一测你的人格',
})
// 入口显示：AI 总开关开启 + personality 子功能开启（后台可控）
const showAiPersonalityEntry = computed(() => {
  if (!systemStore.aiMasterEnabled) return false
  return systemStore.isAiFeatureEnabled('personality')
})

// ===== 金刚区「我的性格 / 测一测」图标（入口1）=====
const myEntryItemId = ref<number | undefined>(undefined)
const myEntryLabelOverride = ref('')
// 已测→「我的性格」，未测→「测一测」；后台文案位可覆盖
const myPersonalityLabel = computed(() => {
  if (myEntryLabelOverride.value) return myEntryLabelOverride.value
  return personalityTested.value ? '我的性格' : '测一测'
})

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
  // 启动陪伴天数计算（每60分钟更新一次，跨天即可更新）
  calcDays()
  _daysTimer = setInterval(calcDays, 60 * 60 * 1000)
})

onShow(() => {
  loadStats()
  refreshProfile()
  systemStore.loadAiFeatureConfig(true) // force=true 确保每次显示都拉最新开关状态
  loadAiProfileText()
  loadPersonalityEntry()
})

const onRefresherRefresh = async () => {
  refreshingVisible.value = true
  await Promise.all([refreshProfile(), loadStats()])
  refreshingVisible.value = false
}

onUnmounted(() => {
  if (carouselTimer) clearInterval(carouselTimer)
  if (_daysTimer) clearInterval(_daysTimer)
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

// 6位数字用户ID（用于展示 ID:123456）
const formattedUserId = computed(() => {
  return userStore.userInfo?.userId || '******'
})

// 后台可配置的页面图标（通过 systemStore.icons.page 下发）
const pageIcons = computed(() => systemStore.icons?.page || {})

const daysSinceCreation = ref(0)
let _daysTimer: ReturnType<typeof setInterval> | null = null

const calcDays = () => {
  const rawCreated = (userStore.userInfo as any)?.createdAt || userStore.userInfo?.createTime
  if (!rawCreated) {
    daysSinceCreation.value = 0
    return
  }
  const created = new Date(rawCreated).getTime()
  const now = Date.now()
  daysSinceCreation.value = Math.max(0, Math.floor((now - created) / 86400000))
}

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
  const uid = userStore.userInfo?.userId
  if (!uid) return
  uni.setClipboardData({
    data: uid,
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

// ========== 安全导航（超时自动重试） ==========
const safeNavigateTo = (url: string, fallbackUrl?: string, fallbackFn?: () => void) => {
  uni.navigateTo({
    url,
    fail: (err: any) => {
      console.warn('[navigateTo fail]', url, err?.errMsg)
      // 超时则延迟300ms重试一次
      if (err?.errMsg?.includes('timeout')) {
        setTimeout(() => {
          uni.navigateTo({
            url: fallbackUrl || url,
            fail: () => {
              uni.showToast({ title: '页面加载失败，请重试', icon: 'none' })
              fallbackFn?.()
            },
          })
        }, 300)
      } else if (fallbackUrl) {
        uni.navigateTo({ url: fallbackUrl, fail: () => { fallbackFn?.() } })
      } else {
        uni.showToast({ title: '页面跳转失败', icon: 'none' })
        fallbackFn?.()
      }
    },
  })
}

const goToLogin = () => safeNavigateTo('/pages/login/index')
const goToEditProfile = () => safeNavigateTo('/pages/edit-profile/index')
const goToVip = () => uni.switchTab({ url: '/pages/vip/index' })
const goToQuestions = () => {
  if (!isLoggedIn.value) { goToLogin(); return }
  // 优先跳转我的回答，失败则跳转问答广场
  safeNavigateTo('/pages/my-answers/index', '/pages/questions/index')
}
const goToAiMatchmaker = () => {
  if (!isLoggedIn.value) { goToLogin(); return }
  safeNavigateTo('/pages/ai-matchmaker/index')
}
const goToAiQuiz = () => {
  safeNavigateTo('/pages/ai-quiz/ai-quiz')
}

// AI 性格解读：未测试→测试页；已测试→结果页（含 AI 深度解读卡片）
const goToAiPersonality = () => {
  if (!isLoggedIn.value) { goToLogin(); return }
  if (personalityTested.value) {
    safeNavigateTo('/pages/personality/result')
  } else {
    safeNavigateTo('/pages/personality/test')
  }
}

// 金刚区「我的性格 / 测一测」图标点击
const goMyPersonality = () => {
  reportCopyClick('my_personality_entry', myEntryItemId.value)
  // 测一测允许游客参与
  if (personalityTested.value) {
    safeNavigateTo('/pages/personality/result')
  } else {
    safeNavigateTo('/pages/personality/test')
  }
}

// 加载人格测试状态 + 后台可配置的入口文案 + 文案位曝光
const loadPersonalityEntry = async () => {
  if (!isLoggedIn.value) return
  // 测试状态（金刚区图标与 AI 折叠项共用）
  try {
    const res: any = await get('/personality/my-result')
    personalityTested.value = !!(res && res.typeCode)
  } catch { /* 静默：默认视为未测试 */ }
  // 金刚区图标文案位曝光 + 文案覆盖
  try {
    const copy = await resolveAndExposeCopy('my_personality_entry')
    if (copy?.mainText) myEntryLabelOverride.value = copy.mainText
    myEntryItemId.value = copy?.itemId
  } catch { /* 静默 */ }
  // AI 助手折叠项文案（仅当 AI 开关开启时覆盖）
  if (showAiPersonalityEntry.value) {
    try {
      const copy: any = await get('/guide/copy/resolve', { slotCode: 'my_ai_personality' })
      const item = copy?.items?.[0]
      if (item?.mainText) aiPersonalityCopy.label = item.mainText
      if (item?.subText) {
        aiPersonalityCopy.descTested = item.subText
        aiPersonalityCopy.descUntested = item.subText
      }
    } catch { /* 静默：使用默认文案 */ }
  }
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
    // 新用户（资料未完善）跳过，避免因 status 不匹配导致 404
    const ui = userStore.userInfo
    if (!ui?.avatar && /^昵称/.test(ui?.nickname || '')) return
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
const goToSettings = () => safeNavigateTo('/pages/settings/index')
const goToFollows = () => safeNavigateTo('/pages/my-follows/index?tab=following')
const goToFollowers = () => safeNavigateTo('/pages/my-follows/index?tab=followers')
const goToVisitors = () => safeNavigateTo('/pages/my-visitors/index?tab=visitors')
const goToFootprints = () => safeNavigateTo('/pages/my-visitors/index?tab=views')
const goToPhotos = () => safeNavigateTo('/pages/edit-profile/index')
const goToRealnameAuth = () => {
  if (!isLoggedIn.value) { goToLogin(); return }
  safeNavigateTo('/pages/realname-auth/index')
}

const showMatchmaker = ref(false)
const showMatchmakerList = ref(false)
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

const openMatchmakerList = () => {
  showMatchmaker.value = false
  showMatchmakerList.value = true
}

const onSelectMatchmaker = (matchmaker: any) => {
  showMatchmakerList.value = false
  selectedMatchmaker.value = matchmaker
  showMatchmaker.value = true
}

const goToLoveQuotes = () => safeNavigateTo('/pages/love-quotes/index')
const goToMyLikes = () => safeNavigateTo('/pages/my-likes/my-likes')
const goToPrivacySettings = () => safeNavigateTo('/pages/privacy-settings/index')
const goToUserAgreement = () => safeNavigateTo('/pages/agreement/index?type=user')
const goToAntiFraud = () => safeNavigateTo('/pages/agreement/index?type=antiFraud')

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
  { key: 'myPhotos',    label: '我的相册', iconName: 'icon-image', emoji: '🖼' },
  { key: 'loveQuotes',  label: '爱情语录', iconName: 'icon-list-heart', emoji: '💌' },
  { key: 'myLikes',     label: '我的喜欢', iconName: 'icon-heart', emoji: '❤️' },
  { key: 'privacy',     label: '隐私设置', iconName: 'icon-shield-warning', emoji: '🔒' },
  { key: 'feedback',    label: '问题反馈', iconName: 'icon-question', emoji: '📝' },
  { key: 'userAgreement', label: '用户协议', iconName: 'icon-scroll', emoji: '📄' },
  { key: 'antiFraud',   label: '防骗提醒', iconName: 'icon-warning-circle', emoji: '🛡' },
  { key: 'dummy',       label: '',        iconName: '', emoji: '',      placeholder: true },
]
</script>

<style lang="scss" scoped>
.my-page {
  height: 100vh;
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

.profile-nickname-row {
  display: flex; align-items: center; gap: 12rpx;
  margin-bottom: 8rpx;
}
.profile-nickname {
  display: block;
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.speed-review-btn {
  font-size: 24rpx;
  color: #FF4D6A;
  flex-shrink: 0;
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
  overflow: hidden;
}
.guest-avatar-img {
  width: 100%; height: 100%;
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
  display: flex;
  flex-direction: column;
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
  width: 100rpx;
  height: 100rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  position: relative;
}

.service-icon-img {
  width: 52rpx;
  height: 52rpx;
}

.service-icon-emoji {
  font-size: 48rpx;
  line-height: 1;
}

.service-dot {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #ff4d6d;
  border: 2rpx solid #ffffff;
}

.service-label {
  font-size: 24rpx;
  color: #333333;
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

.ai-sub-star {
  font-size: 36rpx;
  color: #FF6B9D;
  margin-right: 8rpx;
  flex-shrink: 0;
}

.ai-sub-label {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
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

.tool-label {
  font-size: 28rpx;
  color: #333;
  text-align: center;
  margin-top: 8rpx;
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

.footer-heart-uni {
  font-size: 26rpx;
  color: #FF6B81;
  margin-right: 8rpx;
  line-height: 1;
}

.footer-text {
  font-size: 24rpx;
  color: #999;
}

.bottom-safe-area {
  height: 120rpx;
}
</style>
