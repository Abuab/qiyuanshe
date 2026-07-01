<template>
  <view class="questions-page">
    <!-- 全屏粉色到灰白渐变的固定背景 -->
    <view class="page-gradient-bg" />

    <!-- 顶部固定导航卡片 -->
    <view class="nav-fixed-card" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <text class="nav-title">问答列表</text>
        <view class="nav-right" />
      </view>
    </view>

    <!-- 可滚动内容：热门问答标题 + 问题卡片列表 -->
    <scroll-view
      class="content-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
      :style="{ paddingTop: (statusBarHeight + navInnerHeight) + 'px' }"
    >
      <!-- 热门问答标题 -->
      <view class="header-area">
        <text class="header-title">热门问答</text>
        <text class="header-tip">回答感兴趣的话题，增加曝光率哦！</text>
      </view>

      <!-- 问题卡片 -->
      <view
        v-for="(question, index) in questionList"
        :key="question.id"
        class="question-card"
        :class="index === 0 ? 'card-first' : 'card-normal'"
        @tap="goToDetail(question)"
      >
        <view class="card-top">
          <text class="card-title" :class="index === 0 ? 'title-first' : 'title-normal'">
            # {{ question.title }}
          </text>
          <view class="card-tag" :class="question.isAnsweredByUser ? 'answered' : 'pending'">
            <text>{{ question.isAnsweredByUser ? '已回答' : '待回答' }}</text>
          </view>
        </view>

        <view v-if="index === 0" class="card-bottom">
          <view class="answer-btn-inline" @tap.stop="goToAnswer(question)">
            <text>回答 ></text>
          </view>
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
      <view class="bottom-spacer" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
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

// 从回答页返回后刷新列表，使「已回答」标签正确更新
onShow(() => {
  if (questionList.value.length > 0) {
    fetchQuestions(true)
  }
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
    const rawList = res.list || res || []
    console.log('[questions] API response keys:', Object.keys(res || {}))
    console.log('[questions] rawList length:', Array.isArray(rawList) ? rawList.length : 'not array')
    if (Array.isArray(rawList) && rawList.length > 0) {
      console.log('[questions] first item isAnsweredByUser:', (rawList[0] as any).isAnsweredByUser)
    }
    const list = rawList.map((item: any) => ({
      ...item,
      isAnsweredByUser: Boolean(item.isAnsweredByUser),
    }))
    if (isRefresh) {
      questionList.value = list
      refreshing.value = false
    } else {
      if (page.value === 1) questionList.value = list
      else questionList.value.push(...list)
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

const handleBack = () => safeNavigateBack()

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
// ===== 全屏渐变背景 =====
.page-gradient-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  background: linear-gradient(
    180deg,
    #FFE4EC 0%,
    #FFF0F5 25%,
    var(--bg, #FFF5F7) 55%,
    var(--bg, #FFF5F7) 100%
  );
}

// ===== 固定顶部导航栏（透明融入渐变背景） =====
.nav-fixed-card {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: linear-gradient(180deg, #FFE4EC 0%, #FFE4EC 60%, #FFF0F5 100%);
}

// ===== 导航栏 =====
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
  font-weight: 400;
  text-align: center;
  flex: 1;
}

// ===== 标题区（继承渐变，无缝衔接导航栏） =====
.header-area {
  padding: 20rpx 40rpx 24rpx;
  background: linear-gradient(180deg, #FFF0F5 0%, transparent 100%);
}

.header-title {
  display: block;
  font-size: 44rpx;
  font-weight: 400;
  color: #000000;
  margin-bottom: 10rpx;
}

.header-tip {
  font-size: 24rpx;
  font-weight: 400;
  color: var(--text-secondary, #999999);
}

// ===== 内容滚动区 =====
.content-scroll {
  height: 100vh;
  position: relative;
  z-index: 5;
}

// ===== 问题卡片 =====
.question-card {
  position: relative;
  overflow: hidden;
  background-color: #ffffff;
  border-radius: 20rpx;
  margin: 0 24rpx 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

// 首条卡片（更大）
.card-first {
  padding: 56rpx 40rpx 48rpx;
}

// 普通卡片
.card-normal {
  padding: 44rpx 36rpx 36rpx;
}

.card-top {
  display: flex;
  align-items: flex-start;
}

.card-title {
  flex: 1;
  color: #000000;
  line-height: 1.5;
  padding-right: 20rpx;
}

// 首条标题（加粗）
.title-first {
  font-size: 40rpx;
  font-weight: 600;
}

// 普通标题（较小、细体）
.title-normal {
  font-size: 30rpx;
  font-weight: 350;
}

// ===== 右上角角标 =====
.card-tag {
  position: absolute;
  top: 0;
  right: 0;
  padding: 8rpx 24rpx 10rpx 30rpx;
  border-radius: 0 0 0 20rpx;

  text {
    font-size: 22rpx;
    white-space: nowrap;
  }

  &.pending {
    background-color: rgba(255, 107, 157, 0.1);
    box-shadow: 0 2rpx 6rpx rgba(255, 107, 157, 0.08);

    text {
      color: var(--primary, #FF1744);
    }
  }

  &.answered {
    background-color: transparent;

    text {
      color: var(--text-secondary, #999999);
    }
  }
}

.card-bottom {
  display: flex;
  justify-content: flex-start;
  margin-top: 36rpx;
}

.answer-btn-inline {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 28rpx;
  background-color: var(--primary, #FF6B9D);
  border-radius: 24rpx;

  text {
    font-size: 24rpx;
    color: #ffffff;
    font-weight: 500;
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

.bottom-spacer {
  height: 40rpx;
}
</style>
