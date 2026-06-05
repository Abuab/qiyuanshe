<template>
  <view class="notice-detail-page">
    <view class="nav-bar">
      <text class="back-btn" @tap="handleBack">←</text>
      <text class="nav-title">公告详情</text>
      <text class="nav-placeholder"></text>
    </view>
    <scroll-view v-if="detail" class="detail-scroll" scroll-y>
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

onMounted(async () => {
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
  border-bottom: 1rpx solid #f5f5f5;
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
  padding-top: calc(88rpx + 32rpx);
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
  padding-top: 200rpx;
  font-size: 28rpx;
  color: #999;
}
</style>
