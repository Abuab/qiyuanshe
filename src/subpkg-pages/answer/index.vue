<template>
  <view class="answer-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <text class="nav-title">回答问题</text>
        <view class="nav-right" />
      </view>
    </view>

    <!-- 页面主体 -->
    <view class="page-body" :style="{ paddingTop: (statusBarHeight + navInnerHeight) + 'px' }">
      <!-- 问题标题 -->
      <view class="question-area">
        <text class="question-title"># {{ questionTitle }}</text>
      </view>

      <!-- 输入区 -->
      <view class="textarea-wrapper">
        <textarea
          v-model="answerContent"
          class="answer-textarea"
          :maxlength="200"
          placeholder="说说你的想法吧，最多200字哦~"
          placeholder-style="font-size:22rpx;color:#cccccc"
          :adjust-position="true"
          :disable-default-padding="true"
          :auto-height="true"
          @input="handleInput"
        />
        <text class="word-count">{{ wordCount }}/200</text>
      </view>

      <!-- 提交按钮 -->
      <view class="submit-btn" @tap="handleSubmit">
        <text>提交</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { getToken } from '@/utils/auth'
import { safeNavigateBack } from '@/utils/navigate'

const questionId = ref(0)
const questionTitle = ref('')
const answerContent = ref('')
const submitting = ref(false)
const statusBarHeight = ref(0)
const navInnerHeight = 44

onLoad((options: any) => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  if (options.questionId) {
    questionId.value = parseInt(options.questionId)
  }
  if (options.title) {
    questionTitle.value = decodeURIComponent(options.title)
  }
})

const wordCount = computed(() => answerContent.value.length)

const handleInput = () => {
  if (wordCount.value > 200) {
    uni.showToast({ title: '超过200字限制', icon: 'none' })
  }
}

const handleSubmit = async () => {
  if (!answerContent.value.trim()) {
    uni.showToast({ title: '请输入回答内容', icon: 'none' })
    return
  }
  if (wordCount.value > 200) {
    uni.showToast({ title: '回答内容不能超过200字', icon: 'none' })
    return
  }
  if (!getToken()) {
    uni.showToast({ title: '请先登录', icon: 'none', duration: 1500 })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/index' })
    }, 1000)
    return
  }
  if (submitting.value) return
  submitting.value = true
  uni.showLoading({ title: '提交中...' })
  try {
    await request({
      url: `/questions/${questionId.value}/answers`,
      method: 'POST',
      data: {
        content: answerContent.value,
      },
    })
    uni.showToast({ title: '已提交，待审核', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e: any) {
    console.error('submit error', e)
    if (e.message !== 'Unauthorized') {
      uni.showToast({ title: e.message || '提交失败，请重试', icon: 'none' })
    }
  } finally {
    uni.hideLoading()
    submitting.value = false
  }
}

const handleBack = () => {
  safeNavigateBack()
}
</script>

<style lang="scss" scoped>
.answer-page {
  min-height: 100vh;
  background-color: #ffffff;
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
  font-weight: 400;
  line-height: 1;
}

.nav-title {
  font-size: 32rpx;
  color: var(--text, #333333);
  font-weight: 400;
  text-align: center;
}

// ===== 页面主体 =====
.page-body {
  padding: 0 32rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

// ===== 问题标题 =====
.question-area {
  padding: 24rpx 0;
}

.question-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #000000;
  line-height: 1.4;
  word-break: break-all;
}

// ===== 输入区 =====
.textarea-wrapper {
  border-bottom: 1rpx solid #f0f0f0;
}

.answer-textarea {
  width: 100%;
  min-height: 260rpx;
  font-size: 28rpx;
  color: var(--text, #333333);
  line-height: 1.6;
  box-sizing: border-box;
}

// ===== 字数统计（输入框内右下角） =====
.word-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: var(--text-secondary, #999999);
  padding: 8rpx 0 4rpx;
}

// ===== 提交按钮 =====
.submit-btn {
  margin-top: 24rpx;
  height: 80rpx;
  background-color: var(--primary, #FF6B9D);
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 28rpx;
    font-weight: bold;
    color: #ffffff;
  }
}
</style>
