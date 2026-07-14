<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <text class="nav-back" @tap="handleBack">←</text>
        <text class="nav-title">腾讯云E证通授权</text>
        <text class="nav-placeholder"></text>
      </view>
    </view>

    <scroll-view
      class="page-content"
      scroll-y
      :style="{ paddingTop: navTopPx + 'px' }"
    >
      <!-- ========== Logo 区 ========== -->
      <view class="logo-area">
        <view class="logo-wrap">
          <text class="logo-icon">☁</text>
        </view>
      </view>

      <!-- ========== 标题文字 ========== -->
      <view class="title-area">
        <text class="title-main">您正在授权 灵通相亲</text>
        <text class="title-sub">通过腾讯云E证通核验并获取您的身份信息</text>
      </view>

      <!-- ========== 协议勾选区 ========== -->
      <view class="agreement-row" @tap="agree = !agree">
        <view class="checkbox" :class="{ 'checkbox--checked': agree }">
          <text v-if="agree" class="checkbox-icon">✓</text>
        </view>
        <text class="agreement-text">
          已阅读并同意<text class="agreement-link" @tap.stop="openAgreement('eid')">《腾讯云E证通服务使用协议》</text>和<text class="agreement-link" @tap.stop="openAgreement('eid_digital')">《eID数字身份小程序服务协议》</text>
        </text>
      </view>

      <!-- ========== 确认授权按钮 ========== -->
      <view class="confirm-btn-area">
        <view
          class="confirm-btn"
          :class="{ 'confirm-btn--active': agree }"
          @tap="handleConfirm"
        >
          <text>确认授权</text>
        </view>
      </view>

      <!-- 底部安全区 -->
      <view class="safe-bottom" />
    </scroll-view>

    <!-- ========== 跳转 eID 小程序弹窗 ========== -->
    <view v-if="showJumpPopup" class="dialog-overlay" @tap="closeJumpPopup">
      <view class="dialog-box" @tap.stop>
        <text class="dialog-title">即将打开"eID数字身份"小程序</text>
        <view class="dialog-btns">
          <view class="dialog-btn dialog-btn--cancel" @tap="closeJumpPopup">
            <text>取消</text>
          </view>
          <view class="dialog-btn dialog-btn--confirm" @tap="handleJump">
            <text>允许</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast } from '@/utils/common'

// ========== 导航相关 ==========
const statusBarHeight = ref(20)
const navTopPx = ref(64)

onMounted(() => {
  const sysInfo = uni.getWindowInfo()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navTopPx.value = (sysInfo.statusBarHeight || 20) + 44
})

const handleBack = () => {
  uni.navigateBack()
}

// ========== 协议 ==========
const agree = ref(false)

const openAgreement = (_type: string) => {
  // 协议链接（项目内页面或 H5）
  showToast('协议详情页开发中')
}

// ========== 确认授权 ==========
const handleConfirm = () => {
  if (!agree.value) return
  showJumpPopup.value = true
}

// ========== 跳转弹窗 ==========
const showJumpPopup = ref(false)

const closeJumpPopup = () => {
  showJumpPopup.value = false
}

const handleJump = () => {
  closeJumpPopup()
  // FIXME: appId 需从后端接口获取或项目配置，当前为空值会导致跳转失败
  const eidAppId = ''
  if (!eidAppId) {
    showToast('E证通服务暂未配置，请联系管理员')
    return
  }
  // #ifdef MP-WEIXIN
  uni.navigateToMiniProgram({
    appId: eidAppId,
    path: 'pages/index/index',
    success: () => {
      console.log('[eid] navigateToMiniProgram success')
    },
    fail: (err: any) => {
      console.error('[eid] navigateToMiniProgram fail:', err)
      showToast('跳转失败，请稍后再试')
    },
  })
  // #endif
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

// ========== 导航栏 ==========
.nav-wrap {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 100; background: #ffffff;
}
.nav-bar {
  height: 88rpx; display: flex; align-items: center;
  justify-content: space-between; padding: 0 32rpx;
}
.nav-back { font-size: 36rpx; color: #333; width: 80rpx; }
.nav-title { font-size: 34rpx; font-weight: bold; color: #333; }
.nav-placeholder { width: 80rpx; }

.page-content { flex: 1; height: 100vh; box-sizing: border-box; }

// ========== Logo ==========
.logo-area {
  display: flex; justify-content: center;
  padding-top: 120rpx;
}
.logo-wrap {
  width: 160rpx; height: 160rpx; border-radius: 50%;
  background: #E8F4FD;
  display: flex; align-items: center; justify-content: center;
}
.logo-icon { font-size: 64rpx; }

// ========== 标题 ==========
.title-area {
  display: flex; flex-direction: column; align-items: center;
  padding: 40rpx 32rpx 0; gap: 16rpx;
}
.title-main { font-size: 32rpx; font-weight: bold; color: #333333; }
.title-sub { font-size: 28rpx; color: #333333; }

// ========== 协议勾选 ==========
.agreement-row {
  display: flex; align-items: flex-start;
  padding: 60rpx 60rpx 0;
}
.checkbox {
  width: 32rpx; height: 32rpx; margin-top: 4rpx;
  border: 2rpx solid #CCCCCC; border-radius: 50%;
  margin-right: 12rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.checkbox--checked {
  background: #3B82F6; border-color: #3B82F6;
}
.checkbox-icon { font-size: 20rpx; color: #ffffff; font-weight: bold; }
.agreement-text { font-size: 26rpx; color: #333333; line-height: 1.5; }
.agreement-link { color: #3366CC; }

// ========== 确认按钮 ==========
.confirm-btn-area { padding: 40rpx 60rpx 0; }
.confirm-btn {
  height: 88rpx; border-radius: 12rpx;
  background: #F5F5F5;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 30rpx; color: #CCCCCC; }
}
.confirm-btn--active {
  background: #ffffff;
  border: 1rpx solid #333333;
  text { color: #333333; font-weight: bold; }
  &:active { opacity: 0.8; }
}

// 安全区
.safe-bottom {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  min-height: 40rpx;
}

// ========== 跳转弹窗 ==========
.dialog-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  z-index: 1000; background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: center; justify-content: center;
}
.dialog-box {
  width: 560rpx; background: #ffffff; border-radius: 24rpx;
  padding: 48rpx 0 40rpx;
  display: flex; flex-direction: column; align-items: center;
}
.dialog-title {
  font-size: 32rpx; color: #333333; text-align: center;
  padding: 0 32rpx;
}
.dialog-btns {
  display: flex; gap: 24rpx; padding-top: 40rpx;
  width: 100%; padding-left: 48rpx; padding-right: 48rpx;
  box-sizing: border-box;
}
.dialog-btn {
  flex: 1; height: 80rpx; border-radius: 12rpx;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 30rpx; }
}
.dialog-btn--cancel {
  background: #ffffff; border: 1rpx solid #E0E0E0;
  text { color: #333333; }
}
.dialog-btn--confirm {
  background: #07C160;
  text { color: #ffffff; }
}
</style>
