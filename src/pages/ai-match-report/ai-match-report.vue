<template>
  <view class="ai-match-report-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <uni-icons type="arrowleft" size="40rpx" color="#333333"></uni-icons>
      </view>
      <text class="nav-title">AI 匹配报告</text>
      <view class="nav-right" />
    </view>

    <scroll-view v-if="loaded" class="page-scroll" scroll-y>
      <!-- 大分数区 -->
      <view class="score-area">
        <text class="score-num">{{ score }}</text>
        <text class="score-unit">匹配度</text>
      </view>

      <!-- 进度条 -->
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: score + '%' }" />
      </view>

      <!-- 分析文字 -->
      <view class="analysis-text">{{ analysis }}</view>

      <!-- 标签区 -->
      <view class="tags-area" v-if="tags.length > 0">
        <text v-for="tag in tags" :key="tag" class="match-tag">{{ tag }}</text>
      </view>

      <!-- 底部按钮栏 -->
      <view class="btn-area">
        <view class="btn-back" @tap="goBack">返回</view>
        <view class="btn-chat" @tap="goChat">去聊天</view>
      </view>

      <!-- AI 合规声明 -->
      <view class="ai-disclaimer">匹配分析由 AI 生成，仅供参考</view>
    </scroll-view>

    <view v-else class="loading-container">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const loaded = ref(false)
const score = ref(0)
const analysis = ref('')
const tags = ref<string[]>([])
const targetUserId = ref(0)

onMounted(() => {
  const pages = getCurrentPages()
  const opts = (pages[pages.length - 1] as any)?.options || {}
  if (opts.targetUserId) {
    targetUserId.value = parseInt(opts.targetUserId)
  }
  fetchReport()
})

async function fetchReport() {
  try {
    const res: any = await request({
      url: `/api/ai/match-report?targetUserId=${targetUserId.value}`,
      method: 'GET',
    })
    if (res.code === 0 && res.data) {
      score.value = res.data.score || 0
      analysis.value = res.data.analysis || ''
      tags.value = res.data.tags || []
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loaded.value = true
  }
}

function goBack() {
  uni.navigateBack()
}

function goChat() {
  uni.navigateTo({ url: `/pages/chat/chat?userId=${targetUserId.value}` })
}
</script>

<style lang="scss" scoped>
.ai-match-report-page {
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

.nav-left {
  justify-content: flex-start;
}

.nav-title {
  font-size: 32rpx;
  color: #333333;
  font-weight: 500;
}

/* ===== 大分数区 ===== */
.score-area {
  margin-top: 80rpx;
  text-align: center;
}

.score-num {
  font-size: 120rpx;
  font-weight: bold;
  color: #ff6b6b;
}

.score-unit {
  display: block;
  margin-top: 16rpx;
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

/* ===== 分析文字 ===== */
.analysis-text {
  margin: 48rpx 48rpx 0;
  font-size: 28rpx;
  color: #666666;
  line-height: 1.8;
}

/* ===== 标签区 ===== */
.tags-area {
  margin: 32rpx 48rpx 0;
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
  margin: 48rpx 48rpx 0;
  display: flex;
  justify-content: space-between;
}

.btn-back {
  width: 48%;
  height: 88rpx;
  border-radius: 40rpx;
  background: #f5f5f5;
  border: 1rpx solid #dddddd;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 28rpx;
  color: #666666;
}

.btn-chat {
  width: 48%;
  height: 88rpx;
  border-radius: 40rpx;
  background: #ff6b6b;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 28rpx;
  color: #ffffff;
}

/* ===== AI 合规声明 ===== */
.ai-disclaimer {
  margin: 48rpx 24rpx;
  text-align: center;
  font-size: 20rpx;
  color: #999999;
}

/* ===== 加载中 ===== */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  font-size: 28rpx;
  color: #999999;
}
</style>
