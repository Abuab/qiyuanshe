<template>
  <view class="notice-detail-page">
    <!-- 自定义导航栏（含状态栏占位） -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <text class="back-btn" @tap="handleBack">←</text>
        <text class="nav-title">公告详情</text>
        <text class="nav-placeholder"></text>
      </view>
    </view>
    <scroll-view v-if="detail" class="detail-scroll" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }">
      <text class="detail-title">{{ detail.title }}</text>
      <text class="detail-time">{{ detail.createdAt }}</text>
      <rich-text class="detail-content" :nodes="detail.content" />
    </scroll-view>
    <view v-else class="loading-tip">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'

const detail = ref<any>(null)
const statusBarHeight = ref(20)
const navBarHeightPx = ref(44) // 88rpx ≈ 44px on 2x screen

onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  // 88rpx 转 px: rpx = screenWidth/750, 88 * screenWidth / 750
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)

  const pages = getCurrentPages()
  const options = (pages[pages.length - 1] as any)?.options || {}
  if (options.id) {
    try {
      const res: any = await get(`/notices/${options.id}`)
      detail.value = res?.data || res
    } catch (e) {
      console.log('[公告详情] 接口调用失败', e)
    }
  }
})

const handleBack = () => {
  uni.navigateBack({ delta: 1 })
}
</script>

<style lang="scss" scoped>
.notice-detail-page {
  min-height: 100vh;
  background-color: #fff;
}

.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #fff;
  border-bottom: 1rpx solid #f5f5f5;
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

.detail-scroll {
  height: 100vh;
  padding-left: 32rpx;
  padding-right: 32rpx;
  padding-bottom: 60rpx;
  box-sizing: border-box;
}

.detail-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  line-height: 1.4;
  margin-top: 32rpx;
}

.detail-time {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 32rpx;
}

.detail-content {
  font-size: 30rpx;
  color: #333;
  line-height: 1.8;
}

.loading-tip {
  display: flex;
  justify-content: center;
  margin-top: 200rpx;
  font-size: 28rpx;
  color: #999;
}
</style>
