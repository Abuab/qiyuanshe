<template>
  <view class="page">
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">关于我们</text>
        <view class="nav-right"></view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }">
      <view class="info-card">
        <image class="logo" src="/static/logo.png" mode="aspectFit" />
        <text class="app-name">{{ appName }}</text>
        <text class="version">版本 1.0.0</text>
      </view>
      <view class="links">
        <view class="link-item" @tap="goToAgreement('user')">
          <text>用户协议</text>
          <text class="arrow">></text>
        </view>
        <view class="link-item" @tap="goToAgreement('privacy')">
          <text>隐私政策</text>
          <text class="arrow">></text>
        </view>
        <view class="link-item" @tap="goToAgreement('vip')">
          <text>会员服务协议</text>
          <text class="arrow">></text>
        </view>
      </view>
      <view class="bottom-safe"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSystemStore } from '@/store/system'
import { safeNavigateBack } from '@/utils/navigate'

const systemStore = useSystemStore()
const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const appName = ref('栖缘社')

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  appName.value = systemStore.appName || '栖缘社'
})

function handleBack() { safeNavigateBack() }
function goToAgreement(type: string) { uni.navigateTo({ url: `/pages/agreement/index?type=${type}` }) }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.content { height: 100vh; padding: 32rpx; box-sizing: border-box; }
.info-card { background: #fff; border-radius: 16rpx; padding: 60rpx 40rpx; text-align: center; margin-bottom: 24rpx; }
.logo { width: 120rpx; height: 120rpx; border-radius: 24rpx; }
.app-name { display: block; font-size: 36rpx; font-weight: bold; color: #333; margin-top: 24rpx; }
.version { display: block; font-size: 26rpx; color: #999; margin-top: 8rpx; }
.links { background: #fff; border-radius: 16rpx; }
.link-item { display: flex; justify-content: space-between; padding: 32rpx; border-bottom: 1rpx solid #f0f0f0; font-size: 28rpx; color: #333; }
.link-item:last-child { border-bottom: none; }
.arrow { color: #ccc; }
.bottom-safe { height: 60rpx; }
</style>
