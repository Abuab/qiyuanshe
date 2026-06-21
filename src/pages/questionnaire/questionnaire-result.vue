<template>
  <view class="questionnaire-result-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <uni-icons type="arrowleft" size="40rpx" color="#333333"></uni-icons>
      </view>
      <text class="nav-title">匹配结果</text>
      <view class="nav-right" />
    </view>

    <scroll-view class="page-scroll" scroll-y>
      <!-- 对特定用户的提示 -->
      <text v-if="targetUserId" class="match-hint">你与 TA 的三观匹配度</text>

      <!-- 大分数 -->
      <view class="score-area">
        <text class="score-num">{{ score }}</text>
        <text class="score-unit">匹配度</text>
      </view>

      <!-- 进度条 -->
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: score + '%' }" />
      </view>

      <!-- 结果标题 -->
      <text class="result-title">{{ resultTitle }}</text>

      <!-- 结果描述 -->
      <text class="result-desc">{{ description }}</text>

      <!-- 共同标签 -->
      <view class="tags-area" v-if="tags.length > 0">
        <text v-for="tag in tags" :key="tag" class="match-tag">{{ tag }}</text>
      </view>

      <!-- 底部按钮 -->
      <view class="btn-area">
        <view class="btn-share" @tap="onShare">分享</view>
        <view class="btn-home" @tap="goHome">返回首页</view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const targetUserId = ref(0)
const score = ref(0)
const resultTitle = ref('')
const description = ref('')
const tags = ref<string[]>([])

onMounted(() => {
  const pages = getCurrentPages()
  const opts = (pages[pages.length - 1] as any)?.options || {}
  if (opts.targetUserId) targetUserId.value = parseInt(opts.targetUserId)

  fetchResult(opts.id)
})

async function fetchResult(resultId: string) {
  try {
    const res: any = await request({
      url: `/api/questionnaire/result/${resultId}`,
      method: 'GET',
    })
    if (res.code === 0 && res.data) {
      score.value = res.data.score || 0
      resultTitle.value = res.data.title || ''
      description.value = res.data.description || ''
      tags.value = res.data.tags || []
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function onShare() {
  // 触发小程序分享
}
</script>

<style lang="scss" scoped>
.questionnaire-result-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* ===== 导航栏 ===== */
.nav-bar {
  height: 88rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #eeeeee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
}

.nav-left,
.nav-right {
  width: 80rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
}

.nav-left { justify-content: flex-start; }

.nav-title {
  font-size: 32rpx;
  color: #333333;
  font-weight: 500;
}

/* ===== 提示文字 ===== */
.match-hint {
  display: block;
  margin-top: 48rpx;
  text-align: center;
  font-size: 28rpx;
  color: #666666;
}

/* ===== 大分数 ===== */
.score-area {
  margin-top: 32rpx;
  text-align: center;
}

.score-num {
  font-size: 72rpx;
  font-weight: bold;
  color: #ff6b6b;
}

.score-unit {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999999;
}

/* ===== 进度条 ===== */
.progress-bar {
  margin: 48rpx auto 0;
  width: 80%;
  height: 16rpx;
  border-radius: 8rpx;
  background: #eeeeee;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 8rpx;
  background: #ff6b6b;
  transition: width 800ms ease;
}

/* ===== 结果标题 ===== */
.result-title {
  display: block;
  margin-top: 48rpx;
  text-align: center;
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
}

/* ===== 结果描述 ===== */
.result-desc {
  display: block;
  margin: 48rpx;
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}

/* ===== 标签区 ===== */
.tags-area {
  margin: 0 48rpx;
  display: flex;
  flex-wrap: wrap;
}

.match-tag {
  margin-right: 16rpx;
  margin-bottom: 16rpx;
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
  background: #fff0f3;
  font-size: 24rpx;
  color: #ff6b6b;
}

/* ===== 按钮栏 ===== */
.btn-area {
  margin: 48rpx;
  display: flex;
  justify-content: space-between;
}

.btn-share {
  width: 48%;
  height: 88rpx;
  border-radius: 40rpx;
  border: 1rpx solid #ff6b6b;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 28rpx;
  color: #ff6b6b;
  background: #ffffff;
}

.btn-home {
  width: 48%;
  height: 88rpx;
  border-radius: 40rpx;
  background: #f5f5f5;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 28rpx;
  color: #666666;
}
</style>
