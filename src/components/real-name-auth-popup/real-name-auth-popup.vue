<template>
  <view v-if="show" class="rap-overlay" @tap="close">
    <view class="rap-container" @tap.stop>
      <!-- 关闭按钮 -->
      <view class="rap-close" @tap="close">
        <text class="rap-close-x">X</text>
      </view>

      <!-- 装饰元素 -->
      <view class="rap-deco deco-star-blue" />
      <view class="rap-deco deco-ring-yellow" />
      <view class="rap-deco deco-triangle-pink" />
      <view class="rap-deco deco-star-purple" />

      <!-- 中心图标区域 -->
      <view class="rap-icon-area">
        <!-- 倾斜卡片 -->
        <view class="rap-card">
          <view class="rap-card-line" />
          <view class="rap-card-line" />
          <view class="rap-card-line" />
        </view>
        <!-- 红色星形徽章 + 对勾 -->
        <view class="rap-badge-star">
          <view class="rap-checkmark" />
        </view>
        <!-- 红色圆形警告标 + 感叹号 -->
        <view class="rap-badge-circle">
          <view class="rap-exclaim">
            <view class="rap-exclaim-bar" />
            <view class="rap-exclaim-dot" />
          </view>
        </view>
      </view>

      <!-- 文字区域 -->
      <view class="rap-text-area">
        <text class="rap-title">实名认证</text>
        <view class="rap-desc-line">
          <text class="rap-desc">你当前处于</text><text class="rap-desc-highlight">未实名</text><text class="rap-desc">阶段</text>
        </view>
        <text class="rap-desc">暂时无法查看心仪人的信息哦～</text>
      </view>

      <!-- 底部按钮 -->
      <view class="rap-btn" @tap="goToAuth">
        <text class="rap-btn-text">去实名认证</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'goToAuth'): void
}>()

const close = () => emit('close')
const goToAuth = () => emit('goToAuth')
</script>

<style lang="scss" scoped>
// ===== 遮罩层 =====
.rap-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

// ===== 弹窗容器 =====
.rap-container {
  position: relative;
  width: 640rpx; // 320px
  border-radius: 48rpx; // 24px
  background-color: #FFF0F3;
  padding: 64rpx 48rpx 56rpx; // 上32px 下28px 左右24px
  box-sizing: border-box;
}

// ===== 关闭按钮 =====
.rap-close {
  position: absolute;
  top: 32rpx;  // 16px
  right: 32rpx; // 16px
  z-index: 10;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rap-close-x {
  font-size: 40rpx; // 20px
  color: #999999;
  line-height: 1;
  font-weight: 300;
}

// ===== 装饰元素（绝对定位） =====
.rap-deco {
  position: absolute;
  pointer-events: none;
}

// 左上角：蓝色四角星
.deco-star-blue {
  top: 40rpx;   // 20px
  left: 30rpx;  // 15px
  width: 24rpx; // 12px
  height: 24rpx; // 12px
  background: #A0C4FF;
  opacity: 0.7;
  transform: rotate(15deg);
  clip-path: polygon(50% 0%, 60% 35%, 100% 50%, 60% 65%, 50% 100%, 40% 65%, 0% 50%, 40% 35%);
}

// 右上偏中：黄色空心圆环
.deco-ring-yellow {
  top: 56rpx;   // 28px
  right: 80rpx; // 40px
  width: 28rpx;  // 14px
  height: 28rpx; // 14px
  border: 4rpx solid #FFD93D; // 2px
  border-radius: 50%;
  background: transparent;
}

// 左侧中部：粉色小三角形（向下指向）
.deco-triangle-pink {
  top: 240rpx;  // 120px
  left: 20rpx;  // 10px
  width: 0;
  height: 0;
  border-left: 10rpx solid transparent;
  border-right: 10rpx solid transparent;
  border-top: 18rpx solid #FFB6C1;
}

// 右侧中部：紫色四角星
.deco-star-purple {
  top: 230rpx;  // 115px
  right: 26rpx; // 13px
  width: 24rpx; // 12px
  height: 24rpx; // 12px
  background: #C77DFF;
  opacity: 0.7;
  transform: rotate(-12deg);
  clip-path: polygon(50% 0%, 60% 35%, 100% 50%, 60% 65%, 50% 100%, 40% 65%, 0% 50%, 40% 35%);
}

// ===== 中心图标区域 =====
.rap-icon-area {
  position: relative;
  width: 240rpx; // 120px
  height: 200rpx; // 100px
  margin: 16rpx auto 0; // 距顶部约8px
  margin-bottom: 48rpx; // 距标题24px
}

// 倾斜卡片
.rap-card {
  position: absolute;
  top: 10rpx;
  left: 50rpx;
  width: 200rpx; // 100px
  height: 160rpx; // 80px
  border-radius: 24rpx; // 12px
  background: #FFD1DC;
  transform: rotate(12deg);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding-left: 28rpx; // 14px
  gap: 16rpx; // 8px
}

// 卡片上的三条横线
.rap-card-line {
  width: 120rpx; // 60px
  height: 12rpx; // 6px
  border-radius: 6rpx; // 3px
  background: #FFB6C1;
}

// 红色星形徽章（五角星）
.rap-badge-star {
  position: absolute;
  top: -12rpx;
  left: 28rpx; // ~14px from left edge of icon area
  width: 64rpx; // 32px
  height: 64rpx; // 32px
  background: #FF4757;
  clip-path: polygon(50% 0%, 61% 38%, 100% 38%, 68% 60%, 79% 100%, 50% 75%, 21% 100%, 32% 60%, 0% 38%, 39% 38%);
  display: flex;
  align-items: center;
  justify-content: center;
}

// 黄色对勾（CSS border 技巧）
.rap-checkmark {
  width: 18rpx;  // 9px
  height: 30rpx; // 15px
  border-right: 4rpx solid #FFD700;  // 2px
  border-bottom: 4rpx solid #FFD700; // 2px
  transform: rotate(45deg) translateY(-4rpx);
  margin-top: 4rpx;
}

// 红色圆形警告标
.rap-badge-circle {
  position: absolute;
  bottom: 0;
  right: 24rpx; // 12px
  width: 72rpx;  // 36px
  height: 72rpx; // 36px
  border-radius: 50%;
  background: #FF4757;
  display: flex;
  align-items: center;
  justify-content: center;
}

// 白色感叹号
.rap-exclaim {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx; // 3px
}

.rap-exclaim-bar {
  width: 6rpx;   // 3px
  height: 26rpx;  // 13px
  border-radius: 3rpx;
  background: #fff;
}

.rap-exclaim-dot {
  width: 6rpx;   // 3px
  height: 6rpx;  // 3px
  border-radius: 50%;
  background: #fff;
}

// ===== 文字区域 =====
.rap-text-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 56rpx; // 28px 距按钮顶部
}

.rap-title {
  font-size: 40rpx; // 20px
  font-weight: bold;
  color: #1A1A1A;
  margin-bottom: 24rpx; // 12px
}

.rap-desc-line {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx; // 4px
}

.rap-desc {
  font-size: 28rpx; // 14px
  color: #666666;
  line-height: 1.5;
}

.rap-desc-highlight {
  font-size: 28rpx; // 14px
  color: #FF4757;
  font-weight: 500;
}

// ===== 底部按钮 =====
.rap-btn {
  width: 520rpx; // 260px
  height: 96rpx; // 48px
  border-radius: 48rpx; // 24px 胶囊形
  background: linear-gradient(90deg, #FF6B81, #FF4757);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.rap-btn-text {
  font-size: 32rpx; // 16px
  color: #fff;
  font-weight: 500;
}
</style>
