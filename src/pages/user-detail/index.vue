<template>
  <view class="user-detail-page">
    <view v-if="loading" class="loading-container">
      <text>加载中...</text>
    </view>

    <template v-else-if="profileData">
      <!-- ========== 自定义导航栏 ========== -->
      <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <view class="nav-title">{{ profileData.top.nickname || '用户主页' }}</view>
        <view class="nav-right">
          <text class="more-icon" @tap="showMoreActions">⋮</text>
        </view>
      </view>

      <scroll-view class="page-scroll" scroll-y :enhanced="true" :show-scrollbar="false">
        <!-- ========== 1. 顶部大背景图 ========== -->
        <view class="hero-section">
          <image
            class="hero-bg"
            :src="profileData.top.backgroundPhoto || '/static/default-bg.png'"
            mode="aspectFill"
          />
          <view class="hero-gradient" />
        </view>

        <!-- ========== 头像+昵称区 ========== -->
        <view class="profile-header-card">
          <view class="avatar-wrapper">
            <image
              class="avatar-img"
              :src="profileData.top.avatar || '/static/default-avatar.png'"
              mode="aspectFill"
            />
            <view v-if="profileData.identityAuth?.items?.filter((i: any) => i.verified).length >= 2" class="verified-badge">✓</view>
          </view>
          <view class="name-id-row">
            <view class="name-line">
              <text class="nickname">{{ profileData.top.nickname }}</text>
              <view v-if="profileData.top.isSelf" class="self-tag"><text>自己</text></view>
            </view>
            <view class="id-line">
              <text class="id-badge">ID</text>
              <text class="id-num">{{ profileData.top.userId }}</text>
            </view>
          </view>
          <!-- 关注按钮 -->
          <view v-if="!profileData.top.isSelf" class="follow-btn-area">
            <view class="follow-btn" :class="{ followed: profileData.top.isFollowed }" @tap="toggleFollow">
              <text class="follow-icon">{{ profileData.top.isFollowed ? '❤️' : '🤍' }}</text>
              <text>{{ profileData.top.isFollowed ? '已关注' : '关注' }}</text>
            </view>
          </view>
        </view>

        <!-- ========== 2. 基础资料区 ========== -->
        <view class="section-card basic-section">
          <view class="basic-line">
            <text v-if="profileData.basicInfo.age">{{ profileData.basicInfo.age }}岁</text>
            <text v-if="profileData.basicInfo.age" class="dot">·</text>
            <text v-if="profileData.basicInfo.height">{{ profileData.basicInfo.height }}cm</text>
            <text v-if="profileData.basicInfo.height" class="dot">·</text>
            <text v-if="profileData.basicInfo.weight">{{ profileData.basicInfo.weight }}kg</text>
            <text v-if="profileData.basicInfo.weight" class="dot">·</text>
            <text v-if="profileData.basicInfo.education">{{ profileData.basicInfo.education }}</text>
          </view>
          <view class="birth-line">
            <view v-if="profileData.basicInfo.birthDay" class="info-chip pink-chip">
              <text class="chip-icon">🎂</text>
              <text>{{ profileData.basicInfo.birthDay }}·{{ profileData.basicInfo.zodiac }}·{{ profileData.basicInfo.constellation }}</text>
            </view>
          </view>
          <view v-if="profileData.basicInfo.occupation" class="info-chip blue-chip">
            <text class="chip-icon">💼</text>
            <text>{{ profileData.basicInfo.occupation }}</text>
          </view>
          <view class="location-row">
            <view v-if="profileData.basicInfo.hometown" class="loc-item">
              <text class="loc-dot blue">●</text>
              <text class="loc-label">户籍</text>
              <text class="loc-val">{{ profileData.basicInfo.hometown }}</text>
            </view>
            <view v-if="profileData.basicInfo.residence" class="loc-item">
              <text class="loc-dot orange">●</text>
              <text class="loc-label">现居</text>
              <text class="loc-val">{{ profileData.basicInfo.residence }}</text>
            </view>
          </view>
        </view>

        <!-- ========== 3. 身份认证区 ========== -->
        <view class="section-card auth-section">
          <view class="section-title-bar">
            <text class="section-title">身份认证</text>
            <text class="section-hint">点亮的为已认证</text>
          </view>
          <scroll-view class="auth-scroll" scroll-x :show-scrollbar="false">
            <view class="auth-items">
              <view
                v-for="item in profileData.identityAuth.items"
                :key="item.type"
                class="auth-item"
                @tap="onAuthTap(item)"
              >
                <view class="auth-circle" :class="{ on: item.verified }">
                  <text>{{ item.verified ? '✓' : '—' }}</text>
                </view>
                <text class="auth-name">{{ item.label }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- ========== 4. 关于我区 ========== -->
        <view class="section-card about-section">
          <text class="section-title">关于我</text>
          <view v-if="profileData.aboutMe.tags?.length" class="tag-cloud">
            <view v-for="tag in profileData.aboutMe.tags" :key="tag.name" class="sys-tag">
              <text>{{ tag.name }}</text>
            </view>
          </view>
          <view v-if="profileData.aboutMe.aiProfileText" class="ai-profile-block">
            <view class="ai-label">
              <text class="ai-dot">✨</text>
              <text class="ai-label-text">AI印象</text>
            </view>
            <text class="ai-text">{{ profileData.aboutMe.aiProfileText }}</text>
          </view>
          <!-- AI个人印象生成入口（仅自己） -->
          <view v-if="profileData.top.isSelf && profileData.showAiProfileGenEntry" class="ai-profile-gen-entry" @tap="refreshProfileGen">
            <view class="entry-icon-wrap sm">
              <text class="entry-icon">✨</text>
            </view>
            <view class="entry-info">
              <text class="entry-title">{{ profileData.aboutMe.aiProfileText ? '刷新AI印象' : '生成AI印象' }}</text>
              <text class="entry-desc">AI帮你总结个人魅力标签</text>
            </view>
            <text class="entry-arrow">→</text>
          </view>
          <view v-else-if="!profileData.aboutMe.tags?.length && !profileData.aboutMe.aiProfileText" class="empty-hint">
            <text>TA还没填写介绍哦～</text>
          </view>
        </view>

        <!-- ========== AI缘分分析入口卡片 ========== -->
        <view v-if="profileData.showAiMatchEntry && !profileData.top.isSelf" class="ai-match-entry" @tap="openAiMatch">
          <view class="entry-ring left-ring" />
          <view class="entry-ring right-ring" />
          <view class="entry-content">
            <view class="entry-icon-wrap">
              <text class="entry-icon">💞</text>
            </view>
            <view class="entry-info">
              <text class="entry-title">AI缘分分析</text>
              <text class="entry-desc">测测你们缘分契合度</text>
            </view>
            <text class="entry-arrow">→</text>
          </view>
        </view>

        <!-- ========== AI趣味缘分测试入口卡片 ========== -->
        <view v-if="profileData.showAiFunQuizEntry && !profileData.top.isSelf" class="ai-match-entry fun-quiz-entry" @tap="openFunQuiz">
          <view class="entry-ring left-ring" />
          <view class="entry-ring right-ring" />
          <view class="entry-content">
            <view class="entry-icon-wrap">
              <text class="entry-icon">🔮</text>
            </view>
            <view class="entry-info">
              <text class="entry-title">AI趣味测试</text>
              <text class="entry-desc">看星座生肖契合密码</text>
            </view>
            <text class="entry-arrow">→</text>
          </view>
        </view>

        <!-- ========== 5. Ta希望你区 ========== -->
        <view class="section-card hope-section">
          <text class="section-title">Ta希望你</text>
          <view v-if="profileData.hopeTa.partnerTags?.length" class="partner-tags">
            <view v-for="pt in profileData.hopeTa.partnerTags" :key="pt.label" class="partner-tag">
              <text class="pt-label">{{ pt.label }}：</text>
              <text class="pt-val">{{ pt.value }}</text>
            </view>
          </view>
          <view v-if="profileData.hopeTa.aiHopeText" class="ai-hope-block">
            <view class="ai-label">
              <text class="ai-dot">✨</text>
              <text class="ai-label-text">AI期望解读</text>
            </view>
            <text class="ai-text">{{ profileData.hopeTa.aiHopeText }}</text>
          </view>
          <view v-if="!profileData.hopeTa.partnerTags?.length && !profileData.hopeTa.aiHopeText" class="empty-hint">
            <text>TA还没填写期待哦～</text>
          </view>
        </view>

        <!-- ========== 6. 互动区 ========== -->
        <view class="section-card interaction-section">
          <view v-if="profileData.interaction.giftCount > 0" class="interact-item" @tap="goGifts">
            <text class="interact-emoji">🎁</text>
            <text class="interact-text">已收到 {{ profileData.interaction.giftCount }} 个礼物</text>
          </view>
          <view class="interact-row">
            <view class="interact-item" @tap="shareProfile">
              <text class="interact-emoji">📤</text>
              <text class="interact-text">介绍给好友</text>
            </view>
            <view class="interact-item warn" @tap="reportUser">
              <text class="interact-emoji">🚩</text>
              <text class="interact-text">举报/拉黑</text>
            </view>
          </view>
        </view>

        <view class="bottom-spacer" />
      </scroll-view>

      <!-- ========== 7. 底部固定操作栏 ========== -->
      <view v-if="profileData.bottomBar.visible" class="bottom-bar" :style="{ paddingBottom: safeAreaBottom + 'px' }">
        <view class="bb-btn contact-btn" @tap="handleContact">
          <text class="bb-icon">👋</text>
          <text>{{ profileData.bottomBar.contactText }}</text>
        </view>
        <view class="bb-btn matchmaker-btn" @tap="showMatchmakerPopup">
          <text class="bb-icon">🎯</text>
          <text>{{ profileData.bottomBar.matchmakerText }}</text>
        </view>
      </view>

      <!-- ========== 举报弹窗 ========== -->
      <view v-if="showReportSheet" class="report-sheet">
        <view class="sheet-overlay" @tap="showReportSheet = false" />
        <view class="sheet-content">
          <view class="sheet-title">举报{{ profileData.top.nickname }}</view>
          <view v-for="r in reportReasons" :key="r" class="sheet-item" @tap="onReport(r)">
            <text>{{ r }}</text>
          </view>
          <view class="sheet-cancel" @tap="showReportSheet = false">
            <text>取消</text>
          </view>
        </view>
      </view>

      <!-- ========== AI缘分分析弹窗 ========== -->
      <ai-match-popup
        v-if="showAiMatchPopup"
        :show="showAiMatchPopup"
        :target-user-id="userId"
        :target-nickname="profileData.top.nickname"
        @update:show="showAiMatchPopup = $event"
      />

      <!-- ========== AI趣味测试弹窗 ========== -->
      <view v-if="showFunQuizPopup" class="funquiz-overlay" @tap="showFunQuizPopup = false">
        <view class="funquiz-panel" @tap.stop>
          <!-- 顶部标题 -->
          <view class="funquiz-header">
            <text class="funquiz-title">AI趣味缘分测试</text>
            <view class="funquiz-close" @tap="showFunQuizPopup = false"><text>✕</text></view>
          </view>

          <!-- 输入表单（按钮在外） -->
          <template v-if="!funQuizResult">
            <scroll-view class="funquiz-body" scroll-y :enhanced="true" :show-scrollbar="false">
              <view class="funquiz-body-inner">
                <text class="funquiz-desc">输入你和{{ profileData.top.nickname }}的生日，AI会为你们生成一份趣味缘分密码报告</text>
                <view class="funquiz-field">
                  <text class="funquiz-label">我的生日</text>
                  <picker mode="date" :end="today" @change="(e: any) => funQuizBirthday.userBirthDay = e.detail.value">
                    <view class="funquiz-picker">{{ funQuizBirthday.userBirthDay || '点击选择' }}</view>
                  </picker>
                </view>
                <view class="funquiz-field">
                  <text class="funquiz-label">TA的生日</text>
                  <picker mode="date" :end="today" @change="(e: any) => funQuizBirthday.taBirthDay = e.detail.value">
                    <view class="funquiz-picker">{{ funQuizBirthday.taBirthDay || '点击选择' }}</view>
                  </picker>
                </view>
              </view>
            </scroll-view>
            <!-- 开始测试按钮固定在底部 -->
            <view class="funquiz-footer">
              <view class="funquiz-btn" :class="{ disabled: funQuizLoading }" @tap="submitFunQuiz">
                <text>{{ funQuizLoading ? '生成中...' : '开始测试' }}</text>
              </view>
            </view>
          </template>

          <!-- 结果页 -->
          <template v-else>
            <scroll-view class="funquiz-body funquiz-result-body" scroll-y :enhanced="true" :show-scrollbar="false">
              <view class="funquiz-body-inner">
                <view class="fq-result-header">
                  <text class="fq-zodiac">{{ funQuizResult.userZodiac }} · {{ funQuizResult.userConstellation }}</text>
                  <text class="fq-vs">💞</text>
                  <text class="fq-zodiac">{{ funQuizResult.taZodiac }} · {{ funQuizResult.taConstellation }}</text>
                </view>
                <view class="fq-keywords">
                  <text v-for="(k, i) in funQuizResult.keywords" :key="i" class="fq-keyword">{{ k }}</text>
                </view>
                <view class="fq-section">
                  <text class="fq-section-title">性格互补分析</text>
                  <text class="fq-section-text">{{ funQuizResult.personalityAnalysis }}</text>
                </view>
                <view class="fq-section">
                  <text class="fq-section-title">相处模式建议</text>
                  <text class="fq-section-text">{{ funQuizResult.relationshipAdvice }}</text>
                </view>
                <view v-if="funQuizResult.timeNodes?.length" class="fq-section">
                  <text class="fq-section-title">未来趣味节点</text>
                  <view v-for="(n, i) in funQuizResult.timeNodes" :key="i" class="fq-node">
                    <text class="fq-node-day">{{ n.day }}</text>
                    <text class="fq-node-title">{{ n.title }}</text>
                    <text class="fq-node-desc">{{ n.desc }}</text>
                  </view>
                </view>
                <view class="fq-disclaimer">仅供娱乐参考，珍惜真实相处时光</view>
              </view>
            </scroll-view>
            <!-- 重新测试按钮固定在底部 -->
            <view class="funquiz-footer">
              <view class="funquiz-btn funquiz-retry-btn" @tap="retryFunQuiz">
                <text>重新测试</text>
              </view>
            </view>
          </template>
        </view>
      </view>

      <!-- ========== 红娘弹窗 ========== -->
      <matchmaker-popup
        :show="showMatchmaker"
        :matchmaker="selectedMatchmaker"
        @update:show="showMatchmaker = $event"
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
    </template>

    <view v-else class="empty-container">
      <text>用户不存在</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { logger } from '@/utils/logger'
import matchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import matchmakerListPopup from '@/components/matchmaker-list-popup/matchmaker-list-popup.vue'
import aiMatchPopup from '@/components/ai-match-popup/ai-match-popup.vue'
import { safeNavigateBack } from '@/utils/navigate'

const userStore = useUserStore()
const systemStore = useSystemStore()

const userId = ref(0)
const loading = ref(true)
const profileData = ref<any>(null)
const showAiMatchPopup = ref(false)
const showMatchmaker = ref(false)
const showMatchmakerList = ref(false)
const showReportSheet = ref(false)
const selectedMatchmaker = ref<any>(null)
const matchmakerList = ref<any[]>([])
const followLoading = ref(false)

const isLoggedIn = computed(() => userStore.isLoggedIn)
const statusBarHeight = computed(() => systemStore.statusBarHeight || 44)

/** 底部安全区：iOS=34, 安卓=12 近似 */
const safeAreaBottom = computed(() => {
  const sysInfo = uni.getSystemInfoSync()
  return (sysInfo.safeAreaInsets?.bottom ?? sysInfo.safeArea?.bottom ?? 20)
})

const reportReasons = ['虚假信息', '冒充他人', '骚扰谩骂', '广告营销', '色情低俗', '其他']

const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

onMounted(() => {
  uni.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'], fail: () => {} })
  const pages = getCurrentPages()
  const opts = (pages[pages.length - 1] as any)?.options || {}
  if (opts.id) {
    userId.value = parseInt(opts.id)
    fetchProfileDetail()
  } else {
    loading.value = false
  }
  fetchMatchmakerList()
})

onShow(() => {
  if (userId.value && isLoggedIn.value && profileData.value) {
    refreshFollowStatus()
  }
})

const refreshFollowStatus = async () => {
  try {
    const res = await request({ url: `/users/${userId.value}/follow-status`, method: 'GET' })
    if (profileData.value && res) {
      profileData.value.top.isFollowed = (res as any).isFollowed ?? false
    }
  } catch { /* ignore */ }
}

const onShareAppMessage = () => ({
  title: `${profileData.value?.top?.nickname || ''}的个人主页`,
  path: `/pages/user-detail/index?id=${userId.value}`,
  imageUrl: profileData.value?.top?.avatar || '',
})

const fetchProfileDetail = async () => {
  loading.value = true
  try {
    const res = await request({
      url: `/users/${userId.value}/detail`,
      method: 'GET',
    })
    profileData.value = res
    // 头像/背景图补全
    if (profileData.value) {
      profileData.value.top.avatar = getFullImageUrl(profileData.value.top.avatar) || '/static/default-avatar.png'
      profileData.value.top.backgroundPhoto = getFullImageUrl(profileData.value.top.backgroundPhoto) || ''
    }
  } catch {
    uni.showToast({ title: '获取用户信息失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const fetchMatchmakerList = async () => {
  try {
    const res = await request({ url: '/matchmakers', method: 'GET', timeout: 15000 })
    const rawList = Array.isArray(res) ? res : (res?.list || res?.data?.list || [])
    matchmakerList.value = rawList.map((item: any) => ({
      ...item,
      avatar: getFullImageUrl(item.avatar || item.avatarUrl),
      qrCode: getFullImageUrl(item.qrCode || item.qr_code || item.qrcode),
    }))
  } catch {
    matchmakerList.value = [
      { id: 1, name: '小红娘', avatar: '/static/default-avatar.png', title: '资深红娘', wechat: 'hongniang001', phone: '15703592518', qrCode: '/static/matchmaker.png' },
    ]
  }
}

const handleBack = () => safeNavigateBack()

const onAuthTap = (item: any) => {
  uni.showModal({ title: item.label, content: item.verified ? '已认证' : '未认证', showCancel: false })
}

const toggleFollow = async () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages/login/index' }), 1000)
    return
  }
  if (!profileData.value || followLoading.value) return
  followLoading.value = true
  const followed = profileData.value.top.isFollowed
  try {
    await request({ url: `/users/${userId.value}/follow`, method: followed ? 'DELETE' : 'POST' })
    profileData.value.top.isFollowed = !followed
    uni.showToast({ title: followed ? '已取消关注' : '关注成功', icon: 'success', duration: 1500 })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    followLoading.value = false
  }
}

const openAiMatch = () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages/login/index' }), 1000)
    return
  }
  showAiMatchPopup.value = true
}

const showFunQuizPopup = ref(false)
const funQuizBirthday = ref({ userBirthDay: '', taBirthDay: '' })
const funQuizLoading = ref(false)
const funQuizResult = ref<any>(null)

/** 从 birthDay 字符串（如 "1990年"）中提取年份，转成 YYYY-01-01 格式 */
const extractBirthYear = (birthDay?: string): number | null => {
  if (!birthDay || typeof birthDay !== 'string') return null
  const match = birthDay.match(/(\d{4})/)
  return match ? parseInt(match[1], 10) : null
}

const openFunQuiz = () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages/login/index' }), 1000)
    return
  }
  funQuizResult.value = null
  // 自动填入当前用户的生日（如有）
  const myBirthYear = userStore.userInfo?.birthYear
  if (myBirthYear) {
    funQuizBirthday.value.userBirthDay = `${myBirthYear}-01-01`
  } else {
    funQuizBirthday.value.userBirthDay = ''
  }
  // 自动填入对方用户的生日（如有）
  const taBirthDay = profileData.value?.basicInfo?.birthDay
  const taYear = extractBirthYear(taBirthDay)
  funQuizBirthday.value.taBirthDay = taYear ? `${taYear}-01-01` : ''
  showFunQuizPopup.value = true
}

const submitFunQuiz = async () => {
  if (!funQuizBirthday.value.userBirthDay || !funQuizBirthday.value.taBirthDay) {
    uni.showToast({ title: '请填写双方的出生日期', icon: 'none' })
    return
  }
  funQuizLoading.value = true
  try {
    const res: any = await request({
      url: '/ai/fun-quiz/generate',
      method: 'POST',
      data: funQuizBirthday.value,
      timeout: 30000,
      skipToast: true,
    })
    funQuizResult.value = res
  } catch (e: any) {
    logger.error('[funQuiz] 生成失败:', e?.message || e)
    uni.showToast({
      title: '缘分正在生成中，请稍后再试～',
      icon: 'none',
      duration: 2000,
    })
  } finally {
    funQuizLoading.value = false
  }
}

const retryFunQuiz = () => {
  funQuizResult.value = null
  // 重新自动填入当前用户的生日（如有）
  const myBirthYear = userStore.userInfo?.birthYear
  if (myBirthYear) {
    funQuizBirthday.value.userBirthDay = `${myBirthYear}-01-01`
  } else {
    funQuizBirthday.value.userBirthDay = ''
  }
  // 重新自动填入对方用户的生日（如有）
  const taBirthDay2 = profileData.value?.basicInfo?.birthDay
  const taYear2 = extractBirthYear(taBirthDay2)
  funQuizBirthday.value.taBirthDay = taYear2 ? `${taYear2}-01-01` : ''
}

const profileGenLoading = ref(false)
const refreshProfileGen = async () => {
  profileGenLoading.value = true
  try {
    const res: any = await request({ url: '/ai/profile-gen/refresh', method: 'POST' })
    if (res?.personaText) {
      profileData.value.aboutMe.aiProfileText = res.personaText
    }
    uni.showToast({ title: 'AI印象已生成', icon: 'success' })
    await fetchProfileDetail()
  } catch (e: any) {
    uni.showToast({ title: e?.data?.message || '生成失败，请完善资料后重试', icon: 'none' })
  } finally {
    profileGenLoading.value = false
  }
}

const handleContact = () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateTo({ url: '/pages/login/index' }), 1000)
    return
  }
  if (!userStore.isVip) {
    uni.switchTab({ url: '/pages/vip/index' })
    return
  }
  uni.navigateTo({ url: `/pages/chat/index?userId=${userId.value}&nickname=${encodeURIComponent(profileData.value.top.nickname || '')}` })
}

const showMatchmakerPopup = () => {
  if (!matchmakerList.value.length) {
    matchmakerList.value = [{ id: 1, name: '小红娘', avatar: '/static/default-avatar.png', title: '资深红娘', wechat: 'hongniang001', phone: '15703592518', qrCode: '/static/matchmaker.png' }]
  }
  selectedMatchmaker.value = matchmakerList.value[0]
  showMatchmaker.value = true
}
const openMatchmakerList = () => { showMatchmaker.value = false; showMatchmakerList.value = true }
const onSelectMatchmaker = (m: any) => { showMatchmakerList.value = false; selectedMatchmaker.value = m; setTimeout(() => { showMatchmaker.value = true }, 300) }

const shareProfile = () => {
  uni.showToast({ title: '请点击右上角「···」分享', icon: 'none', duration: 2000 })
}

const showMoreActions = () => {
  uni.showActionSheet({
    itemList: ['分享主页', '举报用户', '拉黑'],
    success: (res) => {
      if (res.tapIndex === 0) shareProfile()
      else if (res.tapIndex === 1) showReportSheet.value = true
      else blockUser()
    },
  })
}

const reportUser = () => { showReportSheet.value = true }
const onReport = (reason: string) => {
  request({ url: `/reports`, method: 'POST', data: { targetUserId: userId.value, type: 'user', reason } })
    .then(() => uni.showToast({ title: '举报已提交', icon: 'success' }))
    .catch(() => uni.showToast({ title: '举报失败', icon: 'none' }))
  showReportSheet.value = false
}
const blockUser = () => {
  uni.showModal({
    title: '确认拉黑',
    content: '拉黑后将不再看到TA的动态和消息',
    success: (res) => {
      if (res.confirm) {
        request({ url: `/users/${userId.value}/block`, method: 'POST' })
          .then(() => uni.showToast({ title: '已拉黑', icon: 'success' }))
          .catch(() => uni.showToast({ title: '拉黑失败', icon: 'none' }))
      }
    },
  })
}
const goGifts = () => uni.showToast({ title: '礼物功能开发中', icon: 'none' })
</script>

<style lang="scss" scoped>
$pink: #FF6B8A;
$pink-light: #FF8FA8;
$purple: #7C3AED;
$bg: #F5F5F5;
$card-bg: #FFFFFF;
$text: #1A1A1A;
$text-secondary: #666666;
$text-hint: #999999;

.user-detail-page {
  min-height: 100vh;
  background: $bg;
  position: relative;
}
.loading-container, .empty-container {
  display: flex; align-items: center; justify-content: center; height: 100vh;
  font-size: 28rpx; color: $text-hint;
}

// ===== 导航栏 =====
.nav-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12rpx 32rpx; height: 88rpx; box-sizing: content-box;
}
.nav-left, .nav-right { display: flex; align-items: center; gap: 24rpx; }
.back-icon { font-size: 44rpx; color: #fff; font-weight: bold; text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.4); }
.nav-title { font-size: 32rpx; font-weight: bold; color: #fff; text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.4); }
.more-icon { font-size: 44rpx; color: #fff; text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.4); }

// ===== 滚动区域 =====
.page-scroll { height: calc(100vh - 88rpx); }

// ===== 1. 顶部大图 =====
.hero-section {
  position: relative; width: 100%; height: 520rpx; overflow: hidden;
}
.hero-bg { width: 100%; height: 100%; }
.hero-gradient {
  position: absolute; bottom: 0; left: 0; right: 0; height: 320rpx;
  background: linear-gradient(transparent, rgba(0,0,0,0.55));
}

// ===== 头像卡片 =====
.profile-header-card {
  position: relative; z-index: 10;
  background: $card-bg; border-radius: 24rpx 24rpx 0 0;
  margin-top: -80rpx; padding: 0 32rpx 24rpx;
  display: flex; align-items: flex-end;
}
.avatar-wrapper {
  position: relative; margin-top: -48rpx; margin-right: 20rpx; flex-shrink: 0;
}
.avatar-img {
  width: 120rpx; height: 120rpx; border-radius: 50%;
  border: 4rpx solid #fff; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.12);
}
.verified-badge {
  position: absolute; right: -2rpx; bottom: -2rpx;
  width: 36rpx; height: 36rpx; border-radius: 50%;
  background: #4CAF50; color: #fff; font-size: 22rpx;
  display: flex; align-items: center; justify-content: center;
  border: 3rpx solid #fff;
}
.name-id-row { flex: 1; min-width: 0; }
.name-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.nickname { font-size: 36rpx; font-weight: bold; color: $text; }
.self-tag {
  font-size: 20rpx; color: $pink; background: rgba($pink, 0.08);
  padding: 2rpx 12rpx; border-radius: 8rpx;
}
.id-line { display: flex; align-items: center; gap: 8rpx; }
.id-badge {
  font-style: italic; font-weight: bold; font-size: 20rpx; color: #fff;
  background: $text-hint; padding: 2rpx 10rpx; border-radius: 4rpx;
}
.id-num { font-size: 24rpx; color: $text-hint; }
.follow-btn-area { flex-shrink: 0; }
.follow-btn {
  display: flex; align-items: center; gap: 6rpx;
  padding: 14rpx 28rpx; border-radius: 40rpx;
  background: #FFF0F3; font-size: 26rpx; color: $pink;
  &.followed { background: #FFE0E8; }
}
.follow-icon { font-size: 28rpx; }

// ===== 分区卡片通用 =====
.section-card {
  background: $card-bg; margin: 16rpx 24rpx; border-radius: 20rpx; padding: 28rpx;
}
.section-title {
  font-size: 30rpx; font-weight: bold; color: $text; margin-bottom: 20rpx;
}
.section-title-bar {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx;
}
.section-hint { font-size: 22rpx; color: $text-hint; }

// ===== 2. 基础资料 =====
.basic-line { display: flex; align-items: center; flex-wrap: wrap; font-size: 28rpx; color: $text-secondary; margin-bottom: 18rpx; }
.dot { margin: 0 8rpx; color: #ddd; }
.birth-line { margin-bottom: 14rpx; }
.info-chip {
  display: inline-flex; align-items: center; gap: 8rpx;
  padding: 8rpx 20rpx; border-radius: 20rpx; font-size: 24rpx; margin-bottom: 14rpx; margin-right: 14rpx;
}
.pink-chip { background: #FFF0F3; color: $pink; }
.blue-chip { background: #EEF4FF; color: #4A90E2; }
.chip-icon { font-size: 24rpx; }
.location-row { display: flex; flex-wrap: wrap; gap: 28rpx; }
.loc-item { display: flex; align-items: center; gap: 8rpx; }
.loc-dot { font-size: 20rpx; }
.loc-dot.blue { color: #4A90E2; }
.loc-dot.orange { color: #FF9500; }
.loc-label { font-size: 22rpx; color: $text-hint; }
.loc-val { font-size: 24rpx; color: $text; }

// ===== 3. 身份认证 =====
.auth-scroll { white-space: nowrap; }
.auth-items { display: flex; gap: 40rpx; padding: 8rpx 0; }
.auth-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; flex-shrink: 0; }
.auth-circle {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  background: #E8E8E8; display: flex; align-items: center; justify-content: center;
  font-size: 30rpx; color: #999;
  &.on { background: #4A90E2; color: #fff; }
}
.auth-name { font-size: 22rpx; color: $text-hint; }

// ===== 4. 关于我 =====
.tag-cloud { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 22rpx; }
.sys-tag {
  padding: 10rpx 22rpx; background: #F5F5F5; border-radius: 18rpx;
  font-size: 24rpx; color: $text-secondary;
}
.ai-profile-block, .ai-hope-block {
  background: #FAFAFA; border-radius: 16rpx; padding: 20rpx; margin-top: 6rpx;
}
.ai-label { display: flex; align-items: center; gap: 8rpx; margin-bottom: 10rpx; }
.ai-dot { font-size: 24rpx; }
.ai-label-text { font-size: 22rpx; color: $pink; font-weight: 500; }
.ai-text { font-size: 26rpx; color: $text-secondary; line-height: 1.6; }
.empty-hint { font-size: 24rpx; color: #ccc; text-align: center; padding: 20rpx 0; }

// ===== AI缘分入口卡片 =====
.ai-match-entry {
  position: relative; margin: 0 24rpx 16rpx; padding: 24rpx 28rpx;
  background: linear-gradient(135deg, rgba($pink, 0.06), rgba($pink-light, 0.12));
  border: 2rpx solid rgba($pink, 0.35); border-radius: 20rpx;
  overflow: hidden;
}
.entry-ring {
  position: absolute; width: 120rpx; height: 120rpx; border-radius: 50%;
  border: 2rpx solid rgba($pink, 0.15);
  &.left-ring { top: -60rpx; left: -40rpx; }
  &.right-ring { bottom: -60rpx; right: -40rpx; }
}
.entry-content { display: flex; align-items: center; gap: 20rpx; position: relative; z-index: 1; }
.entry-icon-wrap {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  background: linear-gradient(135deg, $pink, $pink-light);
  display: flex; align-items: center; justify-content: center;
}
.entry-icon { font-size: 36rpx; }
.entry-info { flex: 1; }
.entry-title { font-size: 30rpx; font-weight: bold; color: $pink; }
.entry-desc { font-size: 24rpx; color: $text-hint; margin-top: 4rpx; }
.entry-arrow { font-size: 36rpx; color: $pink; }

// AI个人印象生成入口行内样式
.ai-profile-gen-entry {
  display: flex; align-items: center; gap: 16rpx;
  margin-top: 20rpx; padding: 20rpx;
  background: rgba($pink, 0.05); border: 1rpx solid rgba($pink, 0.2); border-radius: 16rpx;
  .entry-icon-wrap.sm { width: 56rpx; height: 56rpx; }
  .entry-icon { font-size: 28rpx; }
  .entry-title { font-size: 26rpx; }
  .entry-desc { font-size: 22rpx; }
}

// ===== AI趣味测试弹窗 =====
.funquiz-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999;
  background: rgba(0,0,0,0.45); display: flex; align-items: flex-end;
}
.funquiz-panel {
  width: 100%; max-height: 80vh;
  background: linear-gradient(180deg, #FFF0F5 0%, #FFF8FA 100%);
  border-radius: 32rpx 32rpx 0 0;
  display: flex; flex-direction: column;
  box-sizing: border-box;
}
.funquiz-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 32rpx 32rpx 20rpx;
  flex-shrink: 0;
}
.funquiz-title { font-size: 34rpx; font-weight: bold; color: #1A1A1A; }
.funquiz-close {
  width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F5F5;
  display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #999;
}

// 输入表单 body（flex: 1 撑开剩余空间）
.funquiz-body {
  flex: 1; overflow-y: auto;
  box-sizing: border-box;
}
.funquiz-body-inner {
  padding: 0 32rpx 24rpx;
}
// 结果页 body 需要独立滚动
.funquiz-result-body {
  overflow-y: auto;
}
.funquiz-desc {
  font-size: 26rpx; color: #666; line-height: 1.6; margin-bottom: 32rpx; display: block;
  max-width: 100%; overflow-wrap: break-word;
}
.funquiz-field { margin-bottom: 24rpx; }
.funquiz-label { font-size: 26rpx; color: #333; margin-bottom: 10rpx; display: block; }
.funquiz-picker {
  padding: 20rpx 24rpx; background: #F5F5F5; border-radius: 12rpx;
  font-size: 28rpx; color: #333;
}

// 按钮容器（固定在 footer 中）
.funquiz-btn {
  display: flex; align-items: center; justify-content: center;
  height: 96rpx; border-radius: 999px;
  background: linear-gradient(135deg, $pink, $pink-light);
  font-size: 30rpx; color: #fff; font-weight: bold;
  width: 100%; box-sizing: border-box;
  &.disabled { opacity: 0.5; }
}
// 重新测试按钮 — 主题粉色
.funquiz-retry-btn {
  background: linear-gradient(135deg, $pink, $pink-light);
  color: #fff;
}
.funquiz-footer {
  padding: 16rpx 32rpx 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #FFE4E9;
  flex-shrink: 0;
  background: #fff;
}

.fq-result-header {
  display: flex; align-items: center; justify-content: center; gap: 16rpx;
  padding: 20rpx 0 28rpx;
}
.fq-zodiac { font-size: 26rpx; color: #666; max-width: 100%; overflow-wrap: break-word; }
.fq-vs { font-size: 32rpx; flex-shrink: 0; }
.fq-keywords {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 16rpx; padding-bottom: 28rpx;
}
.fq-keyword {
  padding: 10rpx 24rpx; border-radius: 28rpx;
  background: linear-gradient(135deg, #FFF0F3, #FFE8EC);
  font-size: 24rpx; color: $pink;
  max-width: 100%; overflow-wrap: break-word;
}
.fq-section { padding-bottom: 24rpx; max-width: 100%; overflow-wrap: break-word; }
.fq-section-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 10rpx; display: block; }
.fq-section-text {
  font-size: 26rpx; color: #666; line-height: 1.7;
  max-width: 100%; overflow-wrap: break-word; word-break: break-word;
}
.fq-node {
  padding: 16rpx 20rpx; background: #FFF5F7; border-radius: 12rpx; margin-bottom: 12rpx;
  max-width: 100%; overflow-wrap: break-word; box-sizing: border-box;
}
.fq-node-day { font-size: 24rpx; color: $pink; font-weight: bold; margin-bottom: 4rpx; display: block; }
.fq-node-title { font-size: 26rpx; color: #333; margin-bottom: 4rpx; display: block; }
.fq-node-desc { font-size: 24rpx; color: #999; }
.fq-disclaimer { font-size: 22rpx; color: #CCC; text-align: center; padding: 20rpx 0; }

// ===== 5. Ta希望你 =====
.partner-tags { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 22rpx; }
.partner-tag {
  padding: 10rpx 22rpx; background: #E3F2FD; border-radius: 18rpx;
  font-size: 24rpx; color: #1565C0;
}

// ===== 6. 互动区 =====
.interact-row { display: flex; gap: 56rpx; margin-top: 20rpx; }
.interact-item {
  display: flex; align-items: center; gap: 10rpx;
  padding: 12rpx 0;
  &.warn { margin-left: auto; }
}
.interact-emoji { font-size: 32rpx; }
.interact-text { font-size: 26rpx; color: $text-secondary; }

// ===== 底部空白 =====
.bottom-spacer { height: 180rpx; }

// ===== 7. 底部操作栏 =====
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 150;
  display: flex; gap: 20rpx; padding: 16rpx 24rpx;
  background: $card-bg; box-shadow: 0 -2rpx 16rpx rgba(0,0,0,0.05);
}
.bb-btn {
  flex: 1; height: 92rpx; display: flex; align-items: center; justify-content: center; gap: 10rpx;
  border-radius: 50rpx; font-size: 30rpx; font-weight: bold; color: #fff;
}
.contact-btn { background: linear-gradient(135deg, $pink, $pink-light); }
.matchmaker-btn { background: linear-gradient(135deg, $purple, #A78BFA); }
.bb-icon { font-size: 32rpx; }

// ===== 举报弹窗 =====
.report-sheet { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; }
.sheet-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); }
.sheet-content {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: #fff; border-radius: 24rpx 24rpx 0 0;
  padding: 40rpx 32rpx; padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}
.sheet-title { font-size: 32rpx; font-weight: bold; text-align: center; color: $text; margin-bottom: 32rpx; }
.sheet-item {
  padding: 28rpx 0; text-align: center; font-size: 30rpx; color: $text;
  border-bottom: 1rpx solid #F0F0F0;
}
.sheet-cancel { padding: 28rpx 0; text-align: center; font-size: 30rpx; color: $text-hint; margin-top: 16rpx; }
</style>
