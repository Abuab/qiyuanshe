<template>
  <view class="page">
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">成功故事</text>
        <view class="nav-right"></view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :scroll-top="scrollToVal" @scroll="onScroll" :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }">
      <view v-if="loading" class="loading">加载中...</view>
      <template v-else-if="item">
        <image v-if="item.cover" class="cover" :src="item.cover" mode="aspectFill" />
        <text class="title">{{ item.title }}</text>
        <view class="story">
          <text class="story-text">{{ item.storyContent }}</text>
        </view>
        <view v-if="item.photos?.length" class="photos">
          <image v-for="(p, idx) in item.photos" :key="idx" :src="p" mode="widthFix" class="photo" />
        </view>
      </template>
      <view class="bottom-safe"></view>
    </scroll-view>
    <BackTop :show="showBackTop" @click="scrollToTop" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import BackTop from '@/components/back-top/back-top.vue'

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const loading = ref(true)
const item = ref<any>(null)

const scrollToVal = ref(0)
const showBackTop = ref(false)
const onScroll = (e: any) => { showBackTop.value = e.detail.scrollTop > 600 }
const scrollToTop = () => { scrollToVal.value = scrollToVal.value ? 0 : 0.001; showBackTop.value = false }

onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  const pages = getCurrentPages()
  const id = +(pages[pages.length - 1] as any).options?.id || 0
  try { item.value = await get<any>(`/success-cases/${id}`) } catch (e) { console.error(e) }
  loading.value = false
})

function handleBack() { safeNavigateBack() }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.content { height: 100vh; padding: 32rpx; box-sizing: border-box; }
.cover { width: 100%; height: 400rpx; border-radius: 16rpx; }
.title { display: block; font-size: 36rpx; font-weight: bold; color: #333; margin: 24rpx 0; text-align: center; }
.story { background: #fff; border-radius: 16rpx; padding: 32rpx; }
.story-text { font-size: 30rpx; color: #666; line-height: 1.8; white-space: pre-wrap; }
.photos { margin-top: 24rpx; }
.photo { width: 100%; border-radius: 16rpx; margin-bottom: 16rpx; }
.loading { text-align: center; padding: 100rpx 0; color: #999; font-size: 28rpx; }
.bottom-safe { height: 60rpx; }
</style>
