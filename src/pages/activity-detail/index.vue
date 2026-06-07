<template>
  <view class="activity-detail-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <text class="nav-back-icon">←</text>
      </view>
      <text class="nav-title">活动详情</text>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view class="content-scroll" scroll-y enable-flex v-if="activity">
      <!-- 顶部海报大图 -->
      <view class="cover-wrapper">
        <image class="cover-image" :src="activity.coverImage" mode="aspectFill" />
        <view v-if="activity.status !== 1" class="status-tag">
          {{ getStatusText(activity.status) }}
        </view>
      </view>

      <!-- 标题区 -->
      <view class="title-section">
        <text class="activity-title">✨ {{ activity.title }} ✨</text>
      </view>

      <!-- 信息卡片区 -->
      <view class="info-card">
        <!-- 活动时间 -->
        <view class="info-section">
          <view class="section-header">
            <view class="section-line"></view>
            <text class="section-title">活动时间</text>
          </view>
          <text class="section-content">{{ formatDateTime(activity.startTime) }} - {{ formatDateTime(activity.endTime) }}</text>
        </view>

        <!-- 活动地点 -->
        <view class="info-section">
          <view class="section-header">
            <view class="section-line"></view>
            <text class="section-title">活动地点</text>
          </view>
          <text class="section-content">{{ activity.location || '待定' }}</text>
        </view>

        <!-- 报名需求 -->
        <view class="info-section">
          <view class="section-header">
            <view class="section-line"></view>
            <text class="section-title">报名需求</text>
          </view>
          <text class="section-content">{{ activity.subtitle || '20周岁以上单身青年均可参加' }}</text>
        </view>

        <!-- 报名方式 -->
        <view class="info-section">
          <view class="section-header">
            <view class="section-line"></view>
            <text class="section-title">报名方式</text>
          </view>
          <text class="section-content">扫描下方二维码，添加红娘老师微信</text>
          <text class="section-content phone-text">联系电话：{{ selectedMatchmaker.phone || '15703592518' }}</text>
          <view class="qrcode-wrapper">
            <image class="qrcode-image" :src="selectedMatchmaker.qrCode || '/static/matchmaker.png'" mode="aspectFit" />
          </view>
          <text class="qrcode-tip">（长按识别二维码添加红娘老师微信即可）</text>
        </view>
      </view>

      <!-- 报名嘉宾区 -->
      <view v-if="signupAvatars.length > 0" class="signup-section">
        <view class="signup-header">
          <text class="signup-title">报名嘉宾</text>
          <text class="signup-count">{{ activity.currentParticipants }}人已报名</text>
        </view>
        <scroll-view class="avatar-scroll" scroll-x>
          <view class="avatar-list">
            <image
              v-for="(avatar, index) in signupAvatars"
              :key="index"
              class="signup-avatar"
              :class="{ first: index === 0 }"
              :src="avatar"
              mode="aspectFill"
            />
          </view>
        </scroll-view>
      </view>

      <!-- 活动详情区 -->
      <view v-if="activity.content" class="detail-section">
        <rich-text :nodes="activity.content" class="rich-content"></rich-text>
      </view>

      <view class="bottom-safe-area"></view>
    </scroll-view>

    <!-- 底部固定操作栏 -->
    <view v-if="activity" class="bottom-bar">
      <view class="bottom-left">
        <view class="action-btn" @tap="handleShare">
          <text class="action-icon action-icon-share">↗</text>
          <text class="action-text">分享</text>
        </view>
        <view class="action-btn" @tap="showMatchmakerPopup">
          <text class="action-icon action-icon-chat">✎</text>
          <text class="action-text">咨询</text>
        </view>
      </view>
      <view class="bottom-right">
        <view
          v-if="activity.status === 1"
          class="signup-btn"
          :class="{ disabled: isFull }"
          @tap="handleSignup"
        >
          {{ isFull ? '名额已满' : '立即报名' }}
        </view>
        <view v-else-if="activity.status === 2" class="signup-btn ended">
          活动已结束，查看更多
        </view>
        <view v-else-if="activity.status === 3" class="signup-btn ended">
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
          <text class="popup-close" @tap="closeSignupPopup">&#xe6a7;</text>
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
import request from '@/utils/request'
import { checkLogin } from '@/utils/auth'
import { safeNavigateBack } from '@/utils/navigate'
import { getFullImageUrl } from '@/utils/common'

interface Activity {
  id: number
  title: string
  subtitle?: string
  coverImage: string
  content?: string
  activityType: string
  startTime: string
  endTime: string
  location?: string
  maxParticipants: number
  currentParticipants: number
  status: number
  signUpEndTime?: string
}

const activity = ref<Activity | null>(null)
const signupAvatars = ref<string[]>([])
const showSignupPopup = ref(false)
const matchmakerVisible = ref(false)
const matchmakerListVisible = ref(false)
const matchmakerList = ref<any[]>([])
const selectedMatchmaker = ref({
  id: 1,
  name: '红娘老师',
  avatar: '/static/default-avatar.png',
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

function handleShare() {
  // 提示用户使用右上角原生分享（showShareMenu 已在 onMounted 激活）
  uni.showToast({ title: '请点击右上角「···」分享', icon: 'none', duration: 2000 })
}

function showMatchmakerPopup() {
  if (!matchmakerList.value || matchmakerList.value.length === 0) {
    matchmakerList.value = [
      { id: 1, name: '小红娘', avatar: '/static/default-avatar.png', title: '资深红娘', wechat: 'hongniang001', phone: '15703592518', qrCode: '/static/matchmaker.png' },
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
    const res = await request({
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
      { id: 1, name: '小红娘', avatar: '/static/default-avatar.png', title: '资深红娘', wechat: 'hongniang001', phone: '15703592518', qrCode: '/static/matchmaker.png' },
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
      // 已报名是正常状态，不报错
      if (err.message?.includes('已报名')) {
        uni.showToast({ title: '您已报名该活动', icon: 'none' })
        closeSignupPopup()
      } else {
        uni.showToast({ title: err.message || '报名失败，请重试', icon: 'none' })
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
    title: `${activity.value.title} - 栖缘社活动`,
    path: `/pages/activity-detail/index?id=${activity.value.id}`,
    imageUrl: activity.value.coverImage || '/static/heart.png',
  }
}
</script>

<style lang="scss" scoped>
.activity-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: calc(110rpx + env(safe-area-inset-bottom));
}

/* 顶部导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  padding-top: var(--status-bar-height);
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
  box-sizing: content-box;

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
.content-scroll {
  height: calc(100vh - 208rpx - var(--status-bar-height));
}

/* 封面图 */
.cover-wrapper {
  position: relative;
  width: 100%;
  height: 400rpx;

  .cover-image {
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

/* 标题区 */
.title-section {
  background-color: #fff;
  padding: 32rpx;
  text-align: center;

  .activity-title {
    font-size: 36rpx;
    font-weight: bold;
    color: #ff6b9d;
  }
}

/* 信息卡片 */
.info-card {
  background-color: #fff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 32rpx;

  .info-section {
    margin-bottom: 32rpx;

    &:last-child {
      margin-bottom: 0;
    }

    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 16rpx;

      .section-line {
        width: 8rpx;
        height: 28rpx;
        background-color: #ff6b9d;
        border-radius: 4rpx;
        margin-right: 16rpx;
      }

      .section-title {
        font-size: 32rpx;
        font-weight: bold;
        color: #ff6b9d;
      }
    }

    .section-content {
      display: block;
      font-size: 28rpx;
      color: #333;
      line-height: 1.6;
      padding-left: 24rpx;
    }

    .phone-text {
      margin-top: 8rpx;
      color: #666;
    }

    .qrcode-wrapper {
      display: flex;
      justify-content: center;
      margin-top: 24rpx;

      .qrcode-image {
        width: 400rpx;
        height: 400rpx;
        border: 4rpx solid #fff;
        box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);
      }
    }

    .qrcode-tip {
      display: block;
      text-align: center;
      font-size: 24rpx;
      color: #999;
      margin-top: 16rpx;
    }
  }
}

/* 报名嘉宾区 */
.signup-section {
  background-color: #fff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 32rpx;

  .signup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;

    .signup-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }

    .signup-count {
      font-size: 28rpx;
      color: #ff6b9d;
    }
  }

  .avatar-scroll {
    white-space: nowrap;

    .avatar-list {
      display: flex;
      align-items: center;

      .signup-avatar {
        width: 96rpx;
        height: 96rpx;
        border-radius: 50%;
        border: 4rpx solid #fff;
        margin-left: -32rpx;

        &.first {
          margin-left: 0;
        }
      }
    }
  }
}

/* 活动详情区 */
.detail-section {
  background-color: #fff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;

  .rich-content {
    font-size: 28rpx;
    line-height: 1.6;
    color: #333;

    image, img {
      max-width: 100%;
      height: auto;
    }
  }
}

/* 底部操作栏 */
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
  padding-bottom: env(safe-area-inset-bottom);
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

      .action-icon-share {
        color: #666;
      }

      .action-icon-chat {
        color: #666;
      }

      .action-text {
        font-size: 22rpx;
        color: #999;
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
        background: #ccc;
        color: #999;
        font-size: 26rpx;
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
