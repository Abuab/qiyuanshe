<template>
  <view class="page">
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">实名认证</text>
        <view class="nav-right"></view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }">
      <view class="auth-card">
        <view class="status-icon">{{ isAuthed ? '✅' : '🔒' }}</view>
        <text class="status-text">{{ isAuthed ? '已实名认证' : '未实名认证' }}</text>
        <text class="status-desc">{{ isAuthed ? '您的账号已通过实名认证' : '实名认证后可享受更多服务，提高交友可信度' }}</text>
        <button v-if="!isAuthed" class="auth-btn" @tap="handleAuth">立即认证</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { safeNavigateBack } from '@/utils/navigate'

const userStore = useUserStore()
const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const isAuthed = ref(false)

onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  isAuthed.value = !!(userStore.userInfo as any)?.isRealName
})

function handleBack() { safeNavigateBack() }
function handleAuth() {
  // 获取微信手机号授权
  uni.showToast({ title: '请使用微信一键认证', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.content { height: 100vh; padding: 32rpx; box-sizing: border-box; }
.auth-card { background: #fff; border-radius: 16rpx; padding: 60rpx 40rpx; text-align: center; }
.status-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.status-text { display: block; font-size: 34rpx; font-weight: bold; color: #333; }
.status-desc { display: block; font-size: 26rpx; color: #999; margin-top: 16rpx; line-height: 1.6; }
.auth-btn { margin-top: 40rpx; background: #e7412b; color: #fff; border-radius: 40rpx; height: 80rpx; line-height: 80rpx; font-size: 30rpx; width: 400rpx; }
</style>
