<template>
  <view class="my-answers-page">
    <!-- 自定义导航栏（含状态栏占位） -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <text class="back-btn" @tap="handleBack">←</text>
        <text class="nav-title">我的回答</text>
        <text class="nav-placeholder"></text>
      </view>
    </view>
    <scroll-view class="answer-scroll" scroll-y :scroll-top="scrollToVal" @scroll="onScroll" :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }">
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text class="empty-text">还没有回答过问题</text>
      </view>
      <view v-for="item in list" :key="item.id" class="answer-item" @tap="goToDetail(item)">
        <view class="answer-header">
          <text class="question-title">{{ item.questionTitle }}</text>
          <text class="answer-status" :class="'status-' + (item.status || 0)">
            {{ item.status === 1 ? '已通过' : item.status === 2 ? '已拒绝' : '待审核' }}
          </text>
        </view>
        <text class="answer-content">{{ item.content }}</text>
      </view>
      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>
    </scroll-view>
    <BackTop :show="showBackTop" @click="scrollToTop" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import BackTop from '@/components/back-top/back-top.vue'

const list = ref<any[]>([])
const loading = ref(true)
const statusBarHeight = ref(20)
const navBarHeightPx = ref(44) // 88rpx ≈ 44px on 2x screen

const scrollToVal = ref(0)
const showBackTop = ref(false)
const onScroll = (e: any) => { showBackTop.value = e.detail.scrollTop > 600 }
const scrollToTop = () => { scrollToVal.value = scrollToVal.value ? 0 : 0.001; showBackTop.value = false }

onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  // 88rpx 转 px: rpx = screenWidth/750, 88 * screenWidth / 750
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)

  fetchAnswers()
})

const fetchAnswers = async () => {
  try {
    const res: any = await request({ url: '/users/answers', method: 'GET', skipToast: true })
    const data = res?.data || res?.list || res || []
    list.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.log('[我的回答] 接口获取失败', (e as any)?.message)
  } finally {
    loading.value = false
  }
}

const goToDetail = (item: any) => {
  uni.navigateTo({
    url: `/subpkg-pages/question-detail/index?id=${item.questionId || item.id}&title=${encodeURIComponent(item.questionTitle || '')}`,
  })
}

const handleBack = () => {
  uni.navigateBack({ delta: 1 })
}
</script>

<style lang="scss" scoped>
.my-answers-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
}

.back-btn {
  font-size: 36rpx;
  color: #FF6B9D;
  font-weight: bold;
  width: 80rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.nav-placeholder {
  width: 80rpx;
}

.answer-scroll {
  height: 100vh;
}

.answer-item {
  background-color: #fff;
  padding: 24rpx 32rpx;
  margin-bottom: 16rpx;
  margin-left: 16rpx;
  margin-right: 16rpx;
  border-radius: 12rpx;
  margin-top: 16rpx;
}

.answer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.question-title {
  font-size: 26rpx;
  color: #FF6B9D;
  font-weight: 500;
}

.answer-status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;

  &.status-0 {
    color: #FF9800;
    background-color: #FFF3E0;
  }

  &.status-1 {
    color: #4CAF50;
    background-color: #E8F5E9;
  }

  &.status-2 {
    color: #F44336;
    background-color: #FFEBEE;
  }
}

.answer-content {
  font-size: 30rpx;
  color: #333;
  line-height: 1.6;
}

.empty-state {
  display: flex;
  justify-content: center;
  padding: 200rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.loading-tip {
  text-align: center;
  padding: 24rpx 0;
  font-size: 24rpx;
  color: #999;
}
</style>
