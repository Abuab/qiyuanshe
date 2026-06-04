<template>
  <view class="detail-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">问答详情</view>
      <view class="nav-right"></view>
    </view>

    <scroll-view class="content" scroll-y enable-flex>
      <view class="question-section">
        <text class="question-title">{{ questionTitle }}</text>
        <view class="more-link" @tap="goToQuestions">
          <text>查看更多热门问答 ></text>
        </view>
      </view>

      <view class="answers-section">
        <view v-if="loading" class="loading-tip">
          <text>加载中...</text>
        </view>

        <view
          v-for="answer in answerList"
          :key="answer.id"
          class="answer-card"
        >
          <view class="answer-user" @tap="goToUserProfile(answer.userId)">
            <image
              class="user-avatar"
              :src="answer.user?.avatar || '/static/default-avatar.png'"
              mode="aspectFill"
            />
            <view class="user-info">
              <text class="user-nickname">{{ answer.user?.nickname || '匿名用户' }}</text>
              <text class="user-detail">
                {{ answer.user?.age || '--' }}岁 |
                {{ answer.user?.height || '--' }}cm |
                {{ answer.user?.weight || '--' }}kg |
                {{ answer.user?.education || '--' }} |
                {{ answer.user?.incomeRange || '--' }}
              </text>
            </view>
          </view>

          <view class="answer-content">
            <text>{{ answer.content }}</text>
          </view>

          <view v-if="answer.photos && answer.photos.length > 0" class="answer-photos">
            <image
              v-for="(photo, index) in answer.photos.slice(0, 3)"
              :key="index"
              class="photo-item"
              :src="photo"
              mode="aspectFill"
              @tap="previewImage(answer.photos, index)"
            />
          </view>

          <view class="answer-footer">
            <text class="answer-time">{{ formatTime(answer.createdAt) }}</text>
            <view class="like-btn" @tap="handleLike(answer)">
              <text class="heart-icon" :class="{ liked: answer.isLiked }">
                {{ answer.isLiked ? '♥' : '♡' }}
              </text>
              <text class="like-count">{{ answer.likeCount || 0 }}</text>
            </view>
          </view>
        </view>

        <view v-if="!loading && answerList.length === 0" class="empty-tip">
          <text>暂无回答，快来抢沙发吧~</text>
        </view>

        <view v-if="!loading && noMore" class="no-more-tip">
          <text>没有更多了</text>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <view class="fixed-bottom">
      <view class="answer-btn" @tap="goToAnswer">
        <text>回答</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { useUserStore } from '@/store/user'
import { safeNavigateBack } from '@/utils/navigate'

interface Answer {
  id: number
  questionId: number
  userId: number
  content: string
  photos: string[]
  likeCount: number
  isLiked: boolean
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
const questionId = ref(0)
const questionTitle = ref('')
const answerList = ref<Answer[]>([])
const page = ref(1)
const limit = 20
const loading = ref(false)
const noMore = ref(false)
const refreshing = ref(false)

onMounted(() => {
  // 开启分享菜单
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage'],
    fail: () => {
      console.log('[分享]showShareMenu 开发工具跳过')
    },
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
      data: {
        page: page.value,
        limit,
      },
    })

    const list = (res.answers || []).map((answer: any) => ({
      ...answer,
      photos: (answer.photos || []).map((p: string) => getFullImageUrl(p)),
      user: answer.user ? {
        ...answer.user,
        avatar: getFullImageUrl(answer.user.avatar) || '/static/default-avatar.png',
      } : undefined,
    }))

    if (isRefresh) {
      answerList.value = list
      refreshing.value = false
    } else {
      if (page.value === 1) {
        answerList.value = list
      } else {
        answerList.value.push(...list)
      }
    }

    if (list.length < limit) {
      noMore.value = true
    }

    page.value++
  } catch (e) {
    console.error('fetch answers error', e)
  } finally {
    loading.value = false
  }
}

const handleLike = async (answer: Answer) => {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  try {
    await request({
      url: `/answers/${answer.id}/like`,
      method: 'POST',
    })

    answer.isLiked = !answer.isLiked
    answer.likeCount += answer.isLiked ? 1 : -1
  } catch (e) {
    console.error('like error', e)
  }
}

const previewImage = (photos: string[], index: number) => {
  uni.previewImage({
    urls: photos,
    current: index,
  })
}

const formatTime = (timeStr: string) => {
  if (!timeStr) return ''

  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return `${date.getMonth() + 1}-${date.getDate()}`
}

const handleBack = () => {
  safeNavigateBack()
}

const goToQuestions = () => {
  uni.navigateTo({
    url: '/pages/questions/index',
    fail: () => uni.switchTab({ url: '/pages/questions/index' }),
  })
}

const goToUserProfile = (userId: number) => {
  uni.navigateTo({
    url: `/pages/user-detail/index?id=${userId}`,
  })
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
    title: questionTitle.value || '问答详情 - 栖缘社',
    path: `/pages/question-detail/index?id=${questionId.value}&title=${encodeURIComponent(questionTitle.value)}`,
  }
}
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background-color: #fff;
  z-index: 100;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.nav-left,
.nav-right {
  width: 100rpx;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.content {
  height: calc(100vh - 88rpx);
  padding-top: 108rpx;
}

.question-section {
  padding: 32rpx;
  background-color: #fff;
  margin-bottom: 16rpx;
}

.question-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.5;
  margin-bottom: 20rpx;
}

.more-link {
  text {
    font-size: 28rpx;
    color: #FF6B9D;
  }
}

.answers-section {
  padding: 0 32rpx;
}

.answer-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.answer-user {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.user-info {
  flex: 1;
}

.user-nickname {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.user-detail {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.answer-content {
  margin-bottom: 20rpx;

  text {
    font-size: 28rpx;
    color: #333;
    line-height: 1.6;
  }
}

.answer-photos {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.photo-item {
  width: 240rpx;
  height: 240rpx;
  border-radius: 8rpx;
}

.answer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.answer-time {
  font-size: 24rpx;
  color: #999;
}

.like-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;

  .heart-icon {
    font-size: 36rpx;
    color: #ccc;

    &.liked {
      color: #FF6B9D;
    }
  }

  .like-count {
    font-size: 26rpx;
    color: #999;
  }
}

.loading-tip,
.empty-tip,
.no-more-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
  font-size: 28rpx;
  color: #999;
}

.bottom-spacer {
  height: 140rpx;
}

.fixed-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.answer-btn {
  height: 96rpx;
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 34rpx;
    font-weight: bold;
    color: #fff;
  }
}
</style>
