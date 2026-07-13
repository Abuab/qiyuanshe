<template>
  <view class="detail-page">
    <!-- 导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <text class="nav-title">{{ questionTitle }}</text>
        <view class="nav-right" />
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view
      class="content-scroll"
      scroll-y
      :style="{ paddingTop: (statusBarHeight + navInnerHeight) + 'px' }"
    >
      <!-- 标题区 + 更多链接 -->
      <view class="question-header">
        <text class="question-title"># {{ questionTitle }}</text>
        <view class="more-link" @tap="goToQuestions">
          <text>查看更多热门问答 ></text>
        </view>
      </view>

      <!-- 回答列表 -->
      <view class="answer-list">
        <view v-if="loading" class="status-tip">
          <text>加载中...</text>
        </view>

        <view
          v-for="answer in answerList"
          :key="answer.id"
          class="answer-card"
        >
          <!-- 回答者头部 -->
          <view class="answerer-header" @tap="goToUserProfile(answer.userId)">
            <image
              class="answerer-avatar"
              :src="answer.user?.avatar || icons.common.defaultAvatar"
              mode="aspectFill"
            />
            <view class="answerer-info">
              <text class="answerer-name">{{ answer.user?.nickname || '匿名用户' }}</text>
              <text class="answerer-tags">
                {{ answer.user?.age || '--' }} | {{ answer.user?.height || '--' }}cm | {{ answer.user?.weight || '--' }}kg | {{ answer.user?.education || '--' }} | {{ answer.user?.incomeRange || '--' }}
              </text>
            </view>
          </view>

          <!-- 回答内容 -->
          <view class="answer-body">
            <text class="answer-text">{{ answer.content }}</text>
          </view>

          <!-- 回答图片 -->
          <view v-if="answer.photos && answer.photos.length > 0" class="answer-images">
            <image
              v-for="(photo, index) in answer.photos.slice(0, 3)"
              :key="index"
              class="answer-img-item"
              :src="photo"
              mode="aspectFill"
              @tap.stop="previewImage(answer.photos, index)"
            />
          </view>

          <!-- 回答底部：时间 -->
          <view class="answer-meta">
            <text class="answer-time">{{ formatTime(answer.createdAt) }}</text>
          </view>
        </view>

        <view v-if="!loading && answerList.length === 0" class="status-tip">
          <text>暂无回答，快来抢沙发吧~</text>
        </view>
        <view v-if="!loading && noMore && answerList.length > 0" class="status-tip">
          <text>没有更多了</text>
        </view>
        <view class="scroll-bottom-spacer" />
      </view>
    </scroll-view>

    <!-- 底部悬浮回答按钮 -->
    <view class="float-answer-btn" @tap="goToAnswer">
      <text class="answer-btn-text">回答</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { icons } from '@/config/icons'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { safeNavigateBack } from '@/utils/navigate'

interface Answer {
  id: number
  questionId: number
  userId: number
  content: string
  photos: string[]
  createdAt: string
  user?: {
    nickname: string
    avatar: string
    age: number
    height: number
    weight: number
    education: string
    incomeRange: string
  }
}

const userStore = useUserStore()
const systemStore = useSystemStore()
const questionId = ref(0)
const questionTitle = ref('')
const answerList = ref<Answer[]>([])
const page = ref(1)
const limit = 20
const loading = ref(false)
const noMore = ref(false)
const statusBarHeight = ref(20)
const navInnerHeight = 44

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage'],
    fail: () => {},
  })
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}
  questionId.value = parseInt(options.id) || 0
  questionTitle.value = decodeURIComponent(options.title || '问答详情')
  fetchAnswers()
})

const fetchAnswers = async (isRefresh = false) => {
  try {
    if (isRefresh) {
      page.value = 1
      noMore.value = false
    }
    loading.value = true
    const res = await request({
      url: `/questions/${questionId.value}`,
      method: 'GET',
      data: { page: page.value, limit },
    })
    const list = (res.answers || []).map((answer: any) => ({
      ...answer,
      photos: (answer.photos || []).map((p: string) => getFullImageUrl(p)),
      user: answer.user ? {
        ...answer.user,
        avatar: getFullImageUrl(answer.user.avatar) || icons.common.defaultAvatar,
      } : undefined,
    }))
    if (isRefresh) {
      answerList.value = list
    } else {
      if (page.value === 1) answerList.value = list
      else answerList.value.push(...list)
    }
    if (list.length < limit) noMore.value = true
    page.value++
  } catch (e) {
    console.error('fetch answers error', e)
  } finally {
    loading.value = false
  }
}

const previewImage = (photos: string[], index: number) => {
  uni.previewImage({ urls: photos, current: index })
}

const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

const handleBack = () => safeNavigateBack()

const goToQuestions = () => {
  uni.navigateTo({
    url: '/pages/questions/index',
    fail: () => uni.switchTab({ url: '/pages/questions/index' }),
  })
}

const goToUserProfile = (userId: number) => {
  uni.navigateTo({ url: `/pages/user-detail/index?id=${userId}` })
}

const goToAnswer = () => {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/answer/index?questionId=${questionId.value}&title=${encodeURIComponent(questionTitle.value)}`,
  })
}

const onShareAppMessage = () => {
  return {
    title: questionTitle.value || `问答详情 - ${systemStore.appName}`,
    path: `/pages/question-detail/index?id=${questionId.value}&title=${encodeURIComponent(questionTitle.value)}`,
  }
}
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background-color: var(--bg, #FFF5F7);
  position: relative;
}

// ===== 导航栏 =====
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #ffffff;
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}

.nav-left {
  width: 80rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
}

.nav-right {
  width: 80rpx;
}

.back-icon {
  font-size: 40rpx;
  color: var(--text, #333333);
  font-weight: bold;
  line-height: 1;
}

.nav-title {
  font-size: 32rpx;
  color: var(--text, #333333);
  font-weight: 600;
  text-align: center;
  flex: 1;
}

// ===== 滚动内容 =====
.content-scroll {
  height: 100vh;
}

// ===== 标题区 =====
.question-header {
  padding: 24rpx 32rpx 20rpx;
  background-color: #ffffff;
  margin-bottom: 16rpx;
}

.question-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #000000;
  line-height: 1.4;
  margin-bottom: 16rpx;
}

.more-link {
  text {
    font-size: 26rpx;
    color: var(--primary, #FF6B9D);
  }
}

// ===== 回答列表 =====
.answer-list {
  padding: 0 24rpx;
}

.answer-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
}

// ===== 回答者头部 =====
.answerer-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.answerer-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: #f5f5f5;
}

.answerer-info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
}

.answerer-name {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #000000;
  margin-bottom: 6rpx;
}

.answerer-tags {
  display: block;
  font-size: 22rpx;
  color: var(--text-secondary, #999999);
  line-height: 1.4;
  word-break: break-all;
}

// ===== 回答内容 =====
.answer-body {
  margin-bottom: 16rpx;
}

.answer-text {
  font-size: 28rpx;
  color: var(--text, #333333);
  line-height: 1.7;
  word-break: break-all;
}

// ===== 回答图片 =====
.answer-images {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.answer-img-item {
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
}

// ===== 回答底部 =====
.answer-meta {
  display: flex;
  align-items: center;
}

.answer-time {
  font-size: 22rpx;
  color: var(--text-secondary, #999999);
}

// ===== 状态提示 =====
.status-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx 0;
  font-size: 28rpx;
  color: var(--text-secondary, #999999);
}

.scroll-bottom-spacer {
  height: 140rpx;
}

// ===== 底部悬浮按钮 =====
.float-answer-btn {
  position: fixed;
  bottom: calc(40rpx + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 56rpx;
  background-color: var(--primary, #FF6B9D);
  border-radius: 48rpx;
  box-shadow: 0 6rpx 20rpx rgba(255, 107, 157, 0.4);
  z-index: 99;
}

.answer-btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>
