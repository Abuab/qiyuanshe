<template>
  <view v-if="visible" class="vip-guide-mask" @tap="close">
    <view class="vip-guide-content" @tap.stop>
      <!-- 关闭按钮 -->
      <view class="close-btn" @tap="close">
        <uni-icons type="closeempty" size="40rpx" color="#999999"></uni-icons>
      </view>

      <!-- 星星图标 -->
      <view class="icon-area">
        <uni-icons type="star-filled" size="64rpx" color="#FFD93D"></uni-icons>
      </view>

      <!-- 标题 -->
      <text class="title-text">开通会员查看心动访客</text>

      <!-- 副标题 -->
      <text class="subtitle-text">看看是谁偷偷关注了你</text>

      <!-- 主按钮 -->
      <view class="btn-primary" @tap="goVip">立即开通</view>

      <!-- 底部小字 -->
      <text class="footer-text">已有 128 位用户通过此功能脱单</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)

function open() {
  visible.value = true
}

function close() {
  visible.value = false
}

function goVip() {
  visible.value = false
  uni.navigateTo({ url: '/pages/vip/vip' })
}

defineExpose({ open, close })
</script>

<style lang="scss" scoped>
.vip-guide-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.vip-guide-content {
  width: 640rpx;
  border-radius: 32rpx;
  background: #ffffff;
  position: relative;
  padding-bottom: 48rpx;
}

.close-btn {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
}

.icon-area {
  margin-top: 48rpx;
  text-align: center;
}

.title-text {
  display: block;
  margin-top: 24rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
  padding: 0 48rpx;
}

.subtitle-text {
  display: block;
  margin-top: 16rpx;
  text-align: center;
  font-size: 24rpx;
  color: #999999;
}

.btn-primary {
  margin: 48rpx 48rpx 0;
  height: 88rpx;
  border-radius: 40rpx;
  background: #ff6b6b;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 32rpx;
  color: #ffffff;
}

.footer-text {
  display: block;
  margin-top: 48rpx;
  text-align: center;
  font-size: 24rpx;
  color: #999999;
}
</style>
