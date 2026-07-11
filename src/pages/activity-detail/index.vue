<template>
  <view class="activity-detail-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: (44 + statusBarHeight) + 'px' }">
      <view class="nav-back" @tap="goBack">
        <text class="nav-back-icon">←</text>
      </view>
      <text class="nav-title">活动详情</text>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view class="content-scroll" scroll-y enable-flex v-if="activity" :style="{ height: 'calc(100vh - ' + (44 + statusBarHeight) + 'px)' }">
      <!-- 顶部 Banner 大图（全宽+底部圆角） -->
      <view class="banner-wrapper">
        <image class="banner-image" :src="activity.coverImage" mode="aspectFill" />
        <view v-if="effectiveStatus !== 1" class="status-tag">
          {{ getStatusText(effectiveStatus) }}
        </view>
      </view>

      <!-- 活动标题 -->
      <view class="title-section">
        <text class="activity-title">{{ activity.title }}</text>
        <text v-if="activity.subtitle" class="activity-subtitle">{{ activity.subtitle }}</text>
      </view>

      <!-- 信息行 -->
      <view class="info-rows">
        <view class="info-row" v-if="activity.signUpEndTime">
          <view class="info-icon-circle">
            <text class="info-icon-text">⏰</text>
          </view>
          <view class="info-text-wrap">
            <text class="info-label">报名截止</text>
            <text class="info-value">{{ formatDateOnly(activity.signUpEndTime) }}</text>
          </view>
        </view>
        <view class="info-row-sep" v-if="activity.signUpEndTime"></view>
        <view class="info-row">
          <view class="info-icon-circle">
            <text class="info-icon-text">📅</text>
          </view>
          <view class="info-text-wrap">
            <text class="info-label">活动时间</text>
            <text class="info-value">{{ formatDateOnly(activity.startTime) }} - {{ formatDateOnly(activity.endTime) }}</text>
          </view>
        </view>
        <view class="info-row-sep"></view>
        <view class="info-row">
          <view class="info-icon-circle">
            <text class="info-icon-text">📍</text>
          </view>
          <view class="info-text-wrap">
            <text class="info-label">活动地址</text>
            <text class="info-value">{{ activity.location || '待定' }}</text>
          </view>
        </view>
      </view>

      <!-- 报名嘉宾 -->
      <view v-if="signupAvatars.length > 0" class="guests-section">
        <view class="guests-header">
          <text class="guests-title">报名嘉宾</text>
          <view class="guests-count">
            <text class="fire-icon">🔥</text>
            <text class="guests-count-text">{{ activity.currentParticipants }}人已报名</text>
          </view>
        </view>
        <view class="guests-avatars">
          <image
            v-for="(avatar, index) in displayAvatars"
            :key="index"
            class="guest-avatar"
            :src="avatar"
            mode="aspectFill"
          />
          <view v-if="avatarOverflow > 0" class="guest-avatar guest-avatar-overflow">
            <text class="overflow-text">+{{ avatarOverflow }}</text>
          </view>
        </view>
      </view>

      <!-- Tab 切换栏 -->
      <view class="tab-bar">
        <view
          class="tab-item"
          :class="{ active: activeTab === 'detail' }"
          @tap="switchTab('detail')"
        >
          <text class="tab-text">活动详情</text>
          <view v-if="activeTab === 'detail'" class="tab-indicator"></view>
        </view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'scene' }"
          @tap="switchTab('scene')"
        >
          <text class="tab-text">活动现场</text>
          <view v-if="activeTab === 'scene'" class="tab-indicator"></view>
        </view>
      </view>

      <!-- Tab 内容区 -->
      <view class="tab-content" :class="{ 'fade-in': tabAnimating }">
        <!-- 活动详情 -->
        <view v-show="activeTab === 'detail'" class="content-blocks">
          <template v-if="activity.detailBlocks && activity.detailBlocks.length > 0">
            <BlockRenderer
              v-for="block in activity.detailBlocks"
              :key="block.id"
              :block="block"
            />
          </template>
          <view v-else-if="activity.content" class="rich-content-wrapper">
            <rich-text :nodes="richContent" class="rich-content"></rich-text>
          </view>
          <view v-else class="empty-hint">
            <text>暂无内容</text>
          </view>
        </view>

        <!-- 活动现场 -->
        <view v-show="activeTab === 'scene'" class="content-blocks">
          <template v-if="activity.sceneBlocks && activity.sceneBlocks.length > 0">
            <BlockRenderer
              v-for="block in activity.sceneBlocks"
              :key="block.id"
              :block="block"
            />
          </template>
          <view v-else class="empty-hint">
            <text>暂无内容</text>
          </view>
        </view>
      </view>

      <view class="bottom-safe-area"></view>
    </scroll-view>

    <!-- 底部固定操作栏 -->
    <view v-if="activity" class="bottom-bar" :style="{ paddingBottom: safeAreaBottom + 'px' }">
      <view class="bottom-left">
        <button class="action-btn share-btn" open-type="share">
          <text class="action-icon action-icon-share">↗</text>
          <text class="action-text">分享</text>
        </button>
        <view class="action-btn" @tap="showMatchmakerPopup">
          <image class="action-icon-img" :src="icons.tabbar.message.default" mode="aspectFit" />
          <text class="action-text">咨询</text>
        </view>
      </view>
      <view class="bottom-right">
        <view
          v-if="effectiveStatus === 1"
          class="signup-btn"
          :class="{ disabled: isFull }"
          @tap="handleSignup"
        >
          {{ isFull ? '名额已满' : '立即报名' }}
        </view>
        <view v-else-if="effectiveStatus === 2" class="signup-btn ended">
          活动已结束，查看更多
        </view>
        <view v-else-if="effectiveStatus === 3" class="signup-btn ended">
          活动已取消
        </view>
        <view v-else class="signup-btn ended">
          活动未开始
        </view>
      </view>
    </view>

    <!-- 报名弹窗 -->
    <view v-if="showSignupPopup" class="signup-popup">
      <view class="popup-overlay" @tap="closeSignupPopup"></view>
      <view class="popup-card">
        <view class="popup-header">
          <text class="popup-title">活动报名</text>
          <text class="popup-close" @tap="closeSignupPopup">✕</text>
        </view>

        <view class="popup-info">
          <text class="popup-activity-title">{{ activity?.title }}</text>
          <text class="popup-activity-time">{{ formatDateTime(activity?.startTime || '') }}</text>
          <text class="popup-activity-location">{{ activity?.location || '待定' }}</text>
        </view>

        <view class="popup-form">
          <view class="form-item">
            <text class="form-label">姓名 <text class="required">*</text></text>
            <input
              class="form-input"
              v-model="signupForm.realName"
              placeholder="请输入您的真实姓名"
            />
          </view>
          <view class="form-item">
            <text class="form-label">手机号 <text class="required">*</text></text>
            <input
              class="form-input"
              v-model="signupForm.phone"
              placeholder="请输入您的手机号"
              type="number"
              maxlength="11"
            />
          </view>
          <view class="form-item">
            <text class="form-label">备注</text>
            <input
              class="form-input"
              v-model="signupForm.remark"
              placeholder="可选填"
            />
          </view>
        </view>

        <view class="popup-actions">
          <text class="cancel-btn" @tap="closeSignupPopup">取消</text>
          <view class="submit-btn" @tap="submitSignup">提交报名</view>
        </view>
      </view>
    </view>

    <!-- 红娘弹窗 -->
    <matchmaker-popup
      :show="matchmakerVisible"
      :matchmaker="selectedMatchmaker"
      @update:show="matchmakerVisible = $event"
      @close="matchmakerVisible = false"
      @more="openMatchmakerList"
    />

    <matchmaker-list-popup
      :show="matchmakerListVisible"
      :matchmakers="matchmakerList"
      @update:show="matchmakerListVisible = $event"
      @close="matchmakerListVisible = false"
      @contact="onSelectMatchmaker"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import MatchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'
import MatchmakerListPopup from '@/components/matchmaker-list-popup/matchmaker-list-popup.vue'
import BlockRenderer from '@/components/activity-blocks/BlockRenderer.vue'
import request from '@/utils/request'
import { checkLogin } from '@/utils/auth'
import { safeNavigateBack } from '@/utils/navigate'
import { getFullImageUrl, getImageUrl } from '@/utils/common'
import { icons } from '@/config/icons'
import { useSystemStore } from '@/store/system'

interface Activity {
  id: number
  title: string
  subtitle?: string
  coverImage: string
  content?: string
  detailBlocks?: any[]
  sceneBlocks?: any[]
  activityType: string
  startTime: string
  endTime: string
  location?: string
  maxParticipants: number
  currentParticipants: number
  status: number
  signUpEndTime?: string
}

const systemStore = useSystemStore()

const activity = ref<Activity | null>(null)
const signupAvatars = ref<string[]>([])
const showSignupPopup = ref(false)
const matchmakerVisible = ref(false)
const matchmakerListVisible = ref(false)
const statusBarHeight = ref(0)
const safeAreaBottom = ref(0)
const activeTab = ref<'detail' | 'scene'>('detail')
const tabAnimating = ref(false)
const matchmakerList = ref<any[]>([])
const selectedMatchmaker = ref({
  id: 1,
  name: '红娘老师',
  avatar: icons.common.defaultAvatar,
  title: '资深红娘',
  wechat: 'hongniang123',
  phone: '15703592518',
  qrCode: '/static/matchmaker.png',
})

const signupForm = ref({
  realName: '',
  phone: '',
  remark: '',
})

const isFull = computed(() => {
  if (!activity.value) return false
  return activity.value.maxParticipants > 0 && activity.value.currentParticipants >= activity.value.maxParticipants
})

/** 有效状态：进行中(1) 但已过截止时间时，自动视为「已结束」(2) */
const effectiveStatus = computed(() => {
  const a = activity.value
  if (!a) return 0
  if (a.status === 1 && a.endTime && new Date(a.endTime).getTime() < Date.now()) {
    return 2
  }
  return a.status
})

/** 富文本内容处理：
 * 1. 把相对图片路径(如 /uploads/xxx.jpg)改写为经后端图片网关访问的完整 URL；
 * 2. 去掉图片固定宽高、注入自适应样式，避免图片在小程序端超出屏幕。 */
const richContent = computed(() => {
  const html = activity.value?.content || ''
  if (!html) return ''
  return html.replace(/<img[^>]*>/gi, (tag) => {
    // 1. 改写 src
    let newTag = tag.replace(
      /(src=)(["'])(.*?)\2/i,
      (_m, p, q, url) => `${p}${q}${getImageUrl(url)}${q}`,
    )
    // 2. 移除固定宽高属性
    newTag = newTag.replace(/\s(width|height)=(["']?)[^"'\s>]*\2/gi, '')
    // 3. 注入自适应样式（去掉内联宽高后追加 max-width:100%）
    if (/style=/i.test(newTag)) {
      newTag = newTag.replace(/style=(["'])(.*?)\1/i, (_m, q, css) => {
        const cleaned = css.replace(/(max-)?(width|height)\s*:[^;]+;?/gi, '')
        return `style=${q}${cleaned};max-width:100%;height:auto;display:block${q}`
      })
    } else {
      newTag = newTag.replace(
        /<img/i,
        '<img style="max-width:100%;height:auto;display:block"',
      )
    }
    return newTag
  })
})

function getStatusText(status: number) {
  const map: Record<number, string> = {
    0: '草稿',
    1: '进行中',
    2: '已结束',
    3: '已取消',
  }
  return map[status] || ''
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日${getHourText(date.getHours())}`
}

function getHourText(hour: number) {
  if (hour < 12) return `上午${hour}点`
  if (hour === 12) return '中午12点'
  if (hour < 18) return `下午${hour - 12}点`
  return `晚上${hour - 12}点`
}

function formatDateOnly(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

function switchTab(tab: 'detail' | 'scene') {
  if (activeTab.value === tab) return
  tabAnimating.value = true
  activeTab.value = tab
  setTimeout(() => { tabAnimating.value = false }, 200)
}

/** 最多展示 10 个头像，超出显示 +N */
const MAX_AVATAR = 10
const displayAvatars = computed(() => {
  return signupAvatars.value.slice(0, MAX_AVATAR)
})
const avatarOverflow = computed(() => {
  return Math.max(0, signupAvatars.value.length - MAX_AVATAR)
})

async function fetchActivityDetail(id: number) {
  try {
    const result: any = await request({
      url: `/activities/${id}`,
      method: 'GET',
    })

    activity.value = result
    signupAvatars.value = (result.signupAvatars || []).map((a: string) => getFullImageUrl(a))
  } catch (error) {
    console.error('获取活动详情失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function showMatchmakerPopup() {
  if (!matchmakerList.value || matchmakerList.value.length === 0) {
    matchmakerList.value = [
      { id: 1, name: '小红娘', avatar: icons.common.defaultAvatar, title: '资深红娘', wechat: 'hongniang001', phone: '15703592518', qrCode: '/static/matchmaker.png' },
    ]
  }
  selectedMatchmaker.value = matchmakerList.value[0]
  matchmakerVisible.value = true
}

const openMatchmakerList = () => {
  matchmakerVisible.value = false
  matchmakerListVisible.value = true
}

const onSelectMatchmaker = (matchmaker: any) => {
  matchmakerListVisible.value = false
  selectedMatchmaker.value = matchmaker
  setTimeout(() => {
    matchmakerVisible.value = true
  }, 300)
}

const fetchMatchmakerList = async () => {
  try {
    const res: any = await request({
      url: '/matchmakers',
      method: 'GET',
    })

    const rawList: any[] = Array.isArray(res) ? res : (res?.list || res?.data?.list || res?.data || [])
    matchmakerList.value = rawList.map((item: any) => ({
      ...item,
      avatar: getFullImageUrl(item.avatar || item.avatarUrl),
      qrCode: getFullImageUrl(item.qrCode || item.qr_code || item.qrcode),
    }))

    if (matchmakerList.value.length > 0) {
      selectedMatchmaker.value = matchmakerList.value[0]
    }
  } catch (e: any) {
    console.log('[红娘] 接口调用失败，使用 Mock 数据', e?.message || e)
    matchmakerList.value = [
      { id: 1, name: '小红娘', avatar: icons.common.defaultAvatar, title: '资深红娘', wechat: 'hongniang001', phone: '15703592518', qrCode: '/static/matchmaker.png' },
    ]
    selectedMatchmaker.value = matchmakerList.value[0]
  }
}

function handleSignup() {
  if (isFull.value) return
  showSignupPopup.value = true
}

function closeSignupPopup() {
  showSignupPopup.value = false
  signupForm.value = { realName: '', phone: '', remark: '' }
}

async function submitSignup() {
  // 未登录时先跳转登录页
  if (!checkLogin()) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/index' })
    }, 1000)
    return
  }

  if (!signupForm.value.realName.trim()) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }
  if (!signupForm.value.phone.trim()) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }
  if (!/^1[3-9]\d{9}$/.test(signupForm.value.phone)) {
    uni.showToast({ title: '手机号格式不正确', icon: 'none' })
    return
  }

  uni.showLoading({ title: '提交报名...' })

  try {
    await request({
      url: `/activities/${activity.value?.id}/signup`,
      method: 'POST',
      data: signupForm.value as Record<string, unknown>,
      skipToast: true,
    })

    uni.showToast({ title: '报名成功', icon: 'success' })
    closeSignupPopup()
    // 刷新页面数据
    if (activity.value) {
      fetchActivityDetail(activity.value.id)
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error('报名失败:', err.message)
    if (err.message !== 'Unauthorized') {
      uni.showToast({ title: err.message || '报名失败，请重试', icon: 'none' })
      if (err.message?.includes('已报名')) {
        closeSignupPopup()
      }
    }
  } finally {
    uni.hideLoading()
  }
}

function goBack() {
  safeNavigateBack()
}

onMounted(() => {
  // 获取状态栏高度
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  safeAreaBottom.value = sysInfo.safeAreaInsets?.bottom || 0

  // 激活右上角原生分享按钮
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
    fail: () => {
      // showShareMenu 在开发工具中 ban，静默忽略
      console.log('[分享]showShareMenu 开发工具跳过')
    },
  })

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const id = currentPage.options?.id || currentPage.$page?.options?.id
  if (id) {
    fetchActivityDetail(Number(id))
    fetchMatchmakerList()
  }
})

const onShareAppMessage = () => {
  if (!activity.value) return {}
  return {
    title: `${activity.value.title} - ${systemStore.appName}活动`,
    path: `/pages/activity-detail/index?id=${activity.value.id}`,
    imageUrl: activity.value.coverImage || '/static/heart.png',
  }
}
</script>

<style lang="scss" scoped>
.activity-detail-page {
  min-height: 100vh;
  background-color: #FEF9F9;
}

/* 顶部导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;

  .nav-back {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    .nav-back-icon {
      font-size: 52rpx;
      color: #333;
      line-height: 1;
    }
  }

  .nav-title {
    font-size: 34rpx;
    font-weight: bold;
    color: #333;
  }

  .nav-placeholder {
    width: 60rpx;
  }
}

/* 内容滚动区 */
.content-scroll { }

/* ===== Banner 大图（全宽 + 底部圆角） ===== */
.banner-wrapper {
  position: relative;
  width: 100%;
  height: 400rpx;
  border-bottom-left-radius: 32rpx;
  border-bottom-right-radius: 32rpx;
  overflow: hidden;

  .banner-image {
    width: 100%;
    height: 100%;
  }

  .status-tag {
    position: absolute;
    top: 0;
    left: 0;
    background-color: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 24rpx;
    padding: 8rpx 16rpx;
    border-bottom-right-radius: 8rpx;
  }
}

/* ===== 活动标题 ===== */
.title-section {
  background: #fff;
  padding: 32rpx 32rpx 16rpx;

  .activity-title {
    display: block;
    font-size: 36rpx;
    font-weight: bold;
    color: #222;
  }

  .activity-subtitle {
    display: block;
    font-size: 26rpx;
    color: #999;
    margin-top: 8rpx;
  }
}

/* ===== 信息行（三行：报名截止 / 活动时间 / 活动地址） ===== */
.info-rows {
  background: #fff;
  padding: 0 32rpx 16rpx;

  .info-row {
    display: flex;
    align-items: center;
    padding: 24rpx 0;
  }

  .info-icon-circle {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: rgba(255, 107, 157, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .info-icon-text {
      font-size: 28rpx;
    }
  }

  .info-text-wrap {
    margin-left: 20rpx;
    flex: 1;

    .info-label {
      display: block;
      font-size: 24rpx;
      color: #999;
    }

    .info-value {
      display: block;
      font-size: 28rpx;
      color: #333;
      margin-top: 4rpx;
    }
  }

  .info-row-sep {
    height: 1rpx;
    background: #F0F0F0;
    margin-left: 76rpx;
  }
}

/* ===== 报名嘉宾 ===== */
.guests-section {
  background: #fff;
  padding: 16rpx 32rpx 32rpx;

  .guests-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;

    .guests-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }

    .guests-count {
      display: flex;
      align-items: center;

      .fire-icon {
        font-size: 28rpx;
        margin-right: 6rpx;
      }

      .guests-count-text {
        font-size: 26rpx;
        color: #FF6B9D;
      }
    }
  }

  .guests-avatars {
    display: flex;
    align-items: center;

    .guest-avatar {
      width: 80rpx;
      height: 80rpx;
      border-radius: 50%;
      border: 4rpx solid #fff;
      margin-left: -22rpx;
      box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);

      &:first-child {
        margin-left: 0;
      }

      &.guest-avatar-overflow {
        background: rgba(255, 107, 157, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;

        .overflow-text {
          font-size: 22rpx;
          color: #FF6B9D;
          font-weight: bold;
        }
      }
    }
  }
}

/* ===== Tab 切换栏 ===== */
.tab-bar {
  background: #fff;
  display: flex;
  border-bottom: 1rpx solid #F0F0F0;
  position: sticky;
  top: 0;
  z-index: 50;

  .tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24rpx 0 0;
    position: relative;

    .tab-text {
      font-size: 30rpx;
      color: #999;
    }

    &.active .tab-text {
      color: #222;
      font-weight: bold;
    }

    .tab-indicator {
      width: 48rpx;
      height: 6rpx;
      background: #FF6B9D;
      border-radius: 3rpx;
      margin-top: 12rpx;
    }
  }
}

/* ===== Tab 内容区 ===== */
.tab-content {
  background: #FEF9F9;
  padding: 24rpx 32rpx;
  min-height: 300rpx;

  &.fade-in {
    animation: tabFadeIn 200ms ease;
  }

  @keyframes tabFadeIn {
    from { opacity: 0.6; }
    to { opacity: 1; }
  }

  .content-blocks {
    /* block renderer handles child spacing */
  }

  .rich-content-wrapper {
    .rich-content {
      font-size: 28rpx;
      line-height: 1.8;
      color: #555;

      image, img {
        max-width: 100%;
        height: auto;
        display: block;
      }
    }
  }

  .empty-hint {
    text-align: center;
    padding: 80rpx 0;

    text {
      font-size: 28rpx;
      color: #ccc;
    }
  }
}

/* 底部安全区 */
.bottom-safe-area {
  height: env(safe-area-inset-bottom);
}

/* ===== 底部固定操作栏 ===== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 110rpx;
  background-color: #fff;
  border-top: 1rpx solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  z-index: 100;
  box-sizing: content-box;

  .bottom-left {
    display: flex;
    gap: 32rpx;
    align-items: center;
    height: 100%;

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2rpx;
      padding: 0 12rpx;

      .action-icon {
        font-size: 36rpx;
        color: #999;
        line-height: 1.2;
      }

      .action-icon-img {
        width: 44rpx;
        height: 44rpx;
      }

      .action-icon-share {
        color: #666;
      }

      .action-text {
        font-size: 22rpx;
        color: #999;
      }
    }

    /* 分享按钮：复用 open-type="share" 直接拉起微信转发，需重置原生 button 样式 */
    .share-btn {
      height: auto;
      line-height: 1.2;
      background: transparent;
      border: none;
      margin: 0;

      &::after {
        border: none;
      }
    }
  }

  .bottom-right {
    display: flex;
    align-items: center;
    height: 100%;

    .signup-btn {
      width: 240rpx;
      height: 72rpx;
      background: linear-gradient(135deg, #FF6B9D 0%, #FF85A8 100%);
      color: #fff;
      font-size: 30rpx;
      font-weight: bold;
      border-radius: 36rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      &.disabled {
        background: #ccc;
        color: #fff;
      }

      &.ended {
        width: 440rpx;
        background: #ccc;
        color: #fff;
        font-size: 26rpx;
        font-weight: normal;
        white-space: nowrap;
      }
    }
  }
}

/* 报名弹窗 */
.signup-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;

  .popup-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
  }

  .popup-card {
    position: relative;
    width: 85%;
    background-color: #fff;
    border-radius: 24rpx;
    padding: 32rpx;
    z-index: 1;

    .popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24rpx;

      .popup-title {
        font-size: 36rpx;
        font-weight: bold;
        color: #333;
      }

      .popup-close {
        font-size: 40rpx;
        color: #999;
      }
    }

    .popup-info {
      margin-bottom: 32rpx;
      padding-bottom: 24rpx;
      border-bottom: 1rpx solid #eee;

      .popup-activity-title {
        display: block;
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 8rpx;
      }

      .popup-activity-time,
      .popup-activity-location {
        display: block;
        font-size: 26rpx;
        color: #666;
        margin-top: 4rpx;
      }
    }

    .popup-form {
      .form-item {
        margin-bottom: 24rpx;

        .form-label {
          display: block;
          font-size: 28rpx;
          color: #333;
          margin-bottom: 12rpx;

          .required {
            color: #ff4d4f;
          }
        }

        .form-input {
          width: 100%;
          height: 80rpx;
          border: 1rpx solid #ddd;
          border-radius: 8rpx;
          padding: 0 24rpx;
          font-size: 28rpx;
          box-sizing: border-box;
        }
      }
    }

    .popup-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 32rpx;

      .cancel-btn {
        font-size: 30rpx;
        color: #666;
        padding: 16rpx 32rpx;
      }

      .submit-btn {
        background-color: #ff6b9d;
        color: #fff;
        font-size: 30rpx;
        font-weight: bold;
        padding: 16rpx 48rpx;
        border-radius: 40rpx;
      }
    }
  }
}

.bottom-safe-area {
  height: 40rpx;
}
</style>
