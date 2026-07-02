<template>
  <view class="account-cancel-page">
    <!-- 自定义导航栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <text class="back-btn" @tap="handleBack">←</text>
        <text class="nav-title">注销账号</text>
        <text class="nav-placeholder"></text>
      </view>
    </view>

    <!-- 内容区 -->
    <view class="content" :style="{ paddingTop: navTopPx + 'px' }">
      <view class="main-area">
        <!-- 红色感叹号图标 -->
        <view class="icon-wrap">
          <text class="icon-text">!</text>
        </view>

        <!-- 标题 -->
        <text class="main-title">注销后，各类数据和权益处理如下</text>

        <!-- 白色卡片 -->
        <view class="info-card">
          <view class="card-item">
            <text class="item-title">1、资料被删除</text>
            <text class="item-desc">注销后账户相关资料将被删除</text>
          </view>
          <view class="card-item">
            <text class="item-title">2、权益被清零</text>
            <text class="item-desc">注销后账户相关权益将被清零</text>
          </view>
        </view>
      </view>

      <!-- 底部操作区 -->
      <view class="bottom-area">
        <!-- 复选框 -->
        <view class="checkbox-row" @tap="toggleCheck">
          <view class="checkbox" :class="{ checked: isChecked }">
            <text v-if="isChecked" class="check-mark">✓</text>
          </view>
          <text class="checkbox-label">我已知晓并接受，注销后各类数据、权益的处理结果</text>
        </view>

        <!-- 双按钮 -->
        <view class="btn-row">
          <view class="btn cancel-btn" @tap="handleBack">
            <text>放弃注销</text>
          </view>
          <view
            class="btn"
            :class="isChecked ? 'confirm-btn-active' : 'confirm-btn-disabled'"
            @tap="handleConfirm"
          >
            <text>继续注销</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 二次确认弹窗 -->
    <view v-if="showModal" class="modal-overlay">
      <view
        class="modal-box"
        :class="{ 'modal-in': modalAnim }"
      >
        <text class="modal-title">注销账号</text>
        <text class="modal-subtitle">是否确定注销账号？</text>
        <view class="modal-btns">
          <view class="modal-btn modal-cancel" @tap="cancelModal">
            <text>取消</text>
          </view>
          <view class="modal-btn modal-confirm" @tap="submitCancel">
            <text>确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 注销成功 Toast -->
    <view v-if="showToast" class="toast-wrap">
      <view class="toast-box" :class="{ 'toast-in': toastAnim }">
        <text class="toast-text">注销成功</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { post } from '@/utils/request'
import { useUserStore } from '@/store/user'

// ========== 导航相关 ==========
const statusBarHeight = ref(20)
const navTopPx = ref(0)

onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navTopPx.value = (sysInfo.statusBarHeight || 20) + 44
})

const handleBack = () => {
  uni.navigateBack()
}

// ========== 复选框状态 ==========
const isChecked = ref(false)

const toggleCheck = () => {
  isChecked.value = !isChecked.value
}

// ========== 弹窗状态 ==========
const showModal = ref(false)
const modalAnim = ref(false)

const handleConfirm = () => {
  if (!isChecked.value) return
  showModal.value = true
  // 下一帧触发动画
  setTimeout(() => {
    modalAnim.value = true
  }, 20)
}

const cancelModal = () => {
  modalAnim.value = false
  setTimeout(() => {
    showModal.value = false
  }, 200)
}

// ========== Toast 状态 ==========
const showToast = ref(false)
const toastAnim = ref(false)

// ========== 提交注销 ==========
const submitCancel = async () => {
  modalAnim.value = false
  setTimeout(async () => {
    showModal.value = false

    try {
      // 调用注销 API
      await post('/user/cancel')

      // 显示成功 Toast
      showToast.value = true
      setTimeout(() => {
        toastAnim.value = true
      }, 20)

      // 1.5秒后清除登录态并跳转
      setTimeout(() => {
        // 清除 Pinia store 响应式状态
        const userStore = useUserStore()
        userStore.token = ''
        userStore.userInfo = null
        userStore.isVip = false
        userStore.vipExpireTime = ''

        // 清除持久化存储
        uni.removeStorageSync('token')
        uni.removeStorageSync('userInfo')
        try {
          uni.removeStorageSync('_qys_tk')
          uni.removeStorageSync('_qys_ui')
          uni.removeStorageSync('_qys_rt')
        } catch (_) { /* ignore */ }

        // 跳转到首页（游客态）
        uni.reLaunch({ url: '/pages/index/index' })
      }, 1500)
    } catch (err: any) {
      uni.showToast({
        title: err?.msg || err?.message || '注销失败，请重试',
        icon: 'none',
      })
    }
  }, 200)
}
</script>

<style lang="scss" scoped>
.account-cancel-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

// ========== 导航栏 ==========
.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
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
  font-weight: 500;
  width: 80rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.nav-placeholder {
  width: 80rpx;
}

// ========== 内容区 ==========
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.main-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 60rpx;
  flex: 1;
}

// ========== 红色感叹号图标 ==========
.icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: #ff4d6a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-text {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
}

// ========== 标题文字 ==========
.main-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-top: 24rpx;
  text-align: center;
}

// ========== 白色卡片 ==========
.info-card {
  width: calc(100% - 64rpx);
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx 28rpx;
  margin-top: 40rpx;
}

.card-item {
  &:first-child {
    margin-bottom: 28rpx;
  }
}

.item-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.item-desc {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-top: 8rpx;
}

// ========== 底部操作区 ==========
.bottom-area {
  padding: 0 32rpx 40rpx;
}

.checkbox-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #ccc;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;

  &.checked {
    background-color: #ff4d6a;
    border-color: #ff4d6a;
  }
}

.check-mark {
  font-size: 22rpx;
  color: #fff;
  font-weight: bold;
}

.checkbox-label {
  font-size: 26rpx;
  color: #666;
}

// ========== 按钮行 ==========
.btn-row {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
}

.btn {
  flex: 1;
  height: 88rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 30rpx;
    font-weight: bold;
  }
}

.cancel-btn {
  background-color: #fff;
  border: 1rpx solid #ff4d6a;

  text {
    color: #ff4d6a;
  }
}

.confirm-btn-active {
  background-color: #ff4d6a;

  text {
    color: #fff;
  }
}

.confirm-btn-disabled {
  background-color: #e0e0e0;

  text {
    color: #fff;
  }
}

// ========== 二次确认弹窗 ==========
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 35%;
}

.modal-box {
  width: 560rpx;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 48rpx 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: scale(0.95);
  opacity: 0;
  transition: all 0.2s ease-out;

  &.modal-in {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.modal-subtitle {
  font-size: 28rpx;
  color: #666;
  margin-top: 16rpx;
  margin-bottom: 40rpx;
}

.modal-btns {
  display: flex;
  width: 100%;
  padding: 0 32rpx 32rpx;
  gap: 24rpx;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 30rpx;
    font-weight: bold;
  }
}

.modal-cancel {
  background-color: #fff;
  border: 1rpx solid #ff4d6a;

  text {
    color: #ff4d6a;
  }
}

.modal-confirm {
  background-color: #ff4d6a;

  text {
    color: #fff;
  }
}

// ========== Toast ==========
.toast-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: none;
}

.toast-box {
  background: rgba(0, 0, 0, 0.7);
  border-radius: 12rpx;
  padding: 24rpx 48rpx;
  transform: scale(0.9);
  opacity: 0;
  transition: all 0.2s ease-out;

  &.toast-in {
    transform: scale(1);
    opacity: 1;
  }
}

.toast-text {
  font-size: 28rpx;
  color: #fff;
  white-space: nowrap;
}
</style>
