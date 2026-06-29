<template>
  <view class="questions-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <text class="nav-title">问答列表</text>
        <view class="nav-right" />
      </view>
    </view>

    <!-- 标题区 -->
    <view class="header-section" :style="{ paddingTop: (statusBarHeight + navInnerHeight) + 'px' }">
      <text class="header-title">热门问答</text>
      <text class="header-tip">回答感兴趣的话题，增加曝光率哦！</text>
    </view>

    <!-- 问题列表 -->
    <scroll-view
      class="question-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
    >
      <view
        v-for="question in questionList"
        :key="question.id"
        class="question-card"
        @tap="goToDetail(question)"
      >
        <text class="card-title"># {{ question.title }}</text>
        <view class="card-tag" :class="question.isAnsweredByUser ? 'answered' : 'pending'">
          <text>{{ question.isAnsweredByUser ? '已回答' : '待回答' }}</text>
        </view>
      </view>

      <view v-if="loading" class="status-tip">
        <text>加载中...</text>
      </view>
      <view v-if="!loading && questionList.length === 0" class="status-tip">
        <text>暂无问题</text>
      </view>
      <view v-if="noMore && questionList.length > 0" class="status-tip">
        <text>没有更多了</text>
      </view>

      <!-- 底部占位，给悬浮按钮留空间 -->
      <view class="bottom-placeholder" />
    </scroll-view>

    <!-- 底部悬浮回答按钮 -->
    <view class="float-btn" @tap="goToAnswer(questionList[0])">
      <text class="float-btn-text">回答</text>
      <text class="float-btn-arrow"> ></text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'
import { safeNavigateBack } from '@/utils/navigate'

interface Question {
  id: number
  title: string
  content: string
  answerCount: number
  isActive: number
  isAnsweredByUser: boolean
}

const userStore = useUserStore()
const questionList = ref<Question[]>([])
const page = ref(1)
const limit = 20
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const statusBarHeight = ref(0)
const navInnerHeight = 44

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
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
      data: { page: page.value, limit },
    })
    const list = (res.list || res || []).map((item: any) => ({
      ...item,
      isAnsweredByUser: item.isAnsweredByUser || false,
    }))
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
    if (list.length < limit) noMore.value = true
    page.value++
  } catch (e) {
    console.error('fetch questions error', e)
    refreshing.value = false
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (!loading.value && !noMore.value) fetchQuestions()
}

const onRefresh = () => {
  refreshing.value = true
  fetchQuestions(true)
}

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

// ===== 标题区 =====
.header-section {
  padding: 24rpx 32rpx;
  background-color: #ffffff;
}

.header-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #000000;
  margin-bottom: 8rpx;
}

.header-tip {
  font-size: 24rpx;
  color: var(--text-secondary, #999999);
}

// ===== 滚动列表 =====
.question-scroll {
  height: calc(100vh - 200rpx);
  padding: 20rpx 24rpx 0;
}

.question-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
}

.card-title {
  flex: 1;
  font-size: 28rpx;
  font-weight: bold;
  color: #000000;
  line-height: 1.4;
  padding-right: 20rpx;
}

// ===== 状态标签 =====
.card-tag {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;

  text {
    font-size: 22rpx;
    color: #ffffff;
    white-space: nowrap;
  }

  &.pending {
    background-color: var(--primary, #FF6B9D);
  }

  &.answered {
    background-color: var(--text-secondary, #999999);
  }
}

// ===== 底部悬浮按钮 =====
.float-btn {
  position: fixed;
  bottom: 60rpx;
  left: 32rpx;
  display: flex;
  align-items: center;
  padding: 18rpx 40rpx;
  background-color: var(--primary, #FF6B9D);
  border-radius: 48rpx;
  box-shadow: 0 4rpx 16rpx rgba(255, 107, 157, 0.35);
  z-index: 99;

  .float-btn-text {
    font-size: 28rpx;
    color: #ffffff;
    font-weight: 500;
  }

  .float-btn-arrow {
    font-size: 28rpx;
    color: #ffffff;
    margin-left: 8rpx;
    font-weight: bold;
  }
}

// ===== 状态提示 =====
.status-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
  font-size: 28rpx;
  color: var(--text-secondary, #999999);
}

.bottom-placeholder {
  height: 120rpx;
}
</style>
