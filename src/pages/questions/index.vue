<template>
  <view class="questions-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">问答列表</view>
      <view class="nav-right"></view>
    </view>

    <view class="page-content">
      <view class="header-section">
        <text class="header-title">热门问答</text>
        <text class="header-tip">回答感兴趣的话题，增加曝光率哦！</text>
      </view>

      <scroll-view
        class="question-list"
        scroll-y
        @scrolltolower="loadMore"
        :refresher-enabled="true"
        @refresherrefresh="onRefresh"
        :refresher-triggered="refreshing"
      >
        <view
          v-for="question in questionList"
          :key="question.id"
          class="question-card"
          @tap="goToDetail(question)"
        >
          <view class="question-header">
            <text class="question-title"># {{ question.title }}</text>
            <view class="status-tag" :class="{ answered: question.answerCount > 0 }">
              <text>{{ question.answerCount > 0 ? '已回答' : '待回答' }}</text>
            </view>
          </view>
          <view class="question-action" @tap.stop="goToAnswer(question)">
            <text>回答 ></text>
          </view>
        </view>

        <view v-if="loading" class="loading-tip">
          <text>加载中...</text>
        </view>

        <view v-if="!loading && questionList.length === 0" class="empty-tip">
          <text>暂无问题</text>
        </view>

        <view v-if="noMore && questionList.length > 0" class="no-more-tip">
          <text>没有更多了</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'

interface Question {
  id: number
  title: string
  content: string
  answerCount: number
  isActive: number
}

const userStore = useUserStore()
const questionList = ref<Question[]>([])
const page = ref(1)
const limit = 20
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)

onMounted(() => {
  fetchQuestions()
})

const fetchQuestions = async (isRefresh = false) => {
  try {
    if (isRefresh) {
      page.value = 1
      noMore.value = false
    }

    loading.value = true

    const res = await request({
      url: '/questions',
      method: 'GET',
      data: {
        page: page.value,
        limit,
      },
    })

    const list = res.list || res || []

    if (isRefresh) {
      questionList.value = list
      refreshing.value = false
    } else {
      if (page.value === 1) {
        questionList.value = list
      } else {
        questionList.value.push(...list)
      }
    }

    if (list.length < limit) {
      noMore.value = true
    }

    page.value++
  } catch (e) {
    console.error('fetch questions error', e)
    refreshing.value = false
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (!loading.value && !noMore.value) {
    fetchQuestions()
  }
}

const onRefresh = () => {
  refreshing.value = true
  fetchQuestions(true)
}

import { safeNavigateBack } from '@/utils/navigate'

const handleBack = () => {
  safeNavigateBack()
}

const goToDetail = (question: Question) => {
  uni.navigateTo({
    url: `/pages/question-detail/index?id=${question.id}&title=${encodeURIComponent(question.title)}`,
  })
}

const goToAnswer = (question: Question) => {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  uni.navigateTo({
    url: `/pages/answer/index?questionId=${question.id}&title=${encodeURIComponent(question.title)}`,
  })
}
</script>

<style lang="scss" scoped>
.questions-page {
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

.page-content {
  padding-top: 108rpx;
}

.header-section {
  padding: 32rpx;
  background-color: #fff;
  margin-bottom: 16rpx;
}

.header-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.header-tip {
  font-size: 28rpx;
  color: #999;
}

.question-list {
  height: calc(100vh - 180rpx);
  padding: 0 32rpx;
}

.question-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.question-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.4;
  padding-right: 20rpx;
}

.status-tag {
  padding: 8rpx 16rpx;
  background-color: #FFF0F3;
  border-radius: 8rpx;
  flex-shrink: 0;

  text {
    font-size: 24rpx;
    color: #FF6B9D;
  }

  &.answered {
    background-color: #F5F5F5;

    text {
      color: #999;
    }
  }
}

.question-action {
  display: flex;
  justify-content: flex-end;

  text {
    padding: 8rpx 24rpx;
    border: 2rpx solid #FF6B9D;
    border-radius: 32rpx;
    font-size: 26rpx;
    color: #FF6B9D;
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
</style>
