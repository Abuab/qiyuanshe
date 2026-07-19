<template>
  <view class="guide-page">
    <!-- 顶部装饰：LOVE 水印 -->
    <text class="love-watermark">LOVE</text>

    <!-- 标语区 -->
    <view class="slogan-area">
      <text class="slogan-sub">让属于你我的缘</text>
      <text class="slogan-main">不期而遇</text>
      <!-- CSS 小爱心 -->
      <view class="hearts-row">
        <view class="heart" v-for="i in 5" :key="i"></view>
      </view>
    </view>

    <!-- 飘落花瓣 -->
    <view class="petals">
      <view class="petal" v-for="p in petals" :key="p.id" :style="p.style"></view>
    </view>

    <!-- 中部主视觉区 -->
    <view class="main-visual">
      <!-- 后台配置图片 -->
      <image v-if="visualImage" class="visual-img" :src="visualImage" mode="aspectFit" />
      <!-- CSS 占位：两颗交叠爱心 -->
      <view v-else class="overlap-hearts">
        <view class="big-heart"></view>
        <view class="big-heart big-heart-right"></view>
      </view>
    </view>

    <!-- 底部按钮区 -->
    <view class="bottom-area">
      <view class="primary-btn" @tap="handleStart">
        <text>开启缘分</text>
      </view>
      <text class="link-text" @tap="handleBrowse">先逛逛吧 >></text>
    </view>

    <!-- 底部气球 -->
    <view class="balloon balloon-pink"></view>
    <view class="balloon balloon-blue"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'

interface PetalItem {
  id: number
  style: string
}

const visualImage = ref('')
const petals = ref<PetalItem[]>([])

onMounted(async () => {
  // 生成随机花瓣
  const ps: PetalItem[] = []
  for (let i = 0; i < 12; i++) {
    const left = 5 + Math.random() * 90
    const top = 15 + Math.random() * 35
    const delay = Math.random() * 3
    const size = 14 + Math.random() * 10
    const rotate = Math.random() * 360
    const opacity = 0.3 + Math.random() * 0.5
    const colors = ['#f48fb1', '#f06292', '#ec407a', '#e91e63', '#f8bbd0']
    const color = colors[Math.floor(Math.random() * colors.length)]
    ps.push({
      id: i,
      style: `left:${left}%;top:${top}%;animation-delay:${delay}s;width:${size}rpx;height:${size * 1.3}rpx;transform:rotate(${rotate}deg);opacity:${opacity};background:${color};`,
    })
  }
  petals.value = ps

  // 加载管理后台配置的主视觉图片
  try {
    const res: any = await get('/system/config')
    if (res?.data?.guestGuideImage) {
      visualImage.value = res.data.guestGuideImage
    }
  } catch { /* 无配置则使用 CSS 占位 */ }
})

const handleStart = () => {
  uni.switchTab({ url: '/pages/index/index' })
}

const handleBrowse = () => {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.guide-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fce4ec 0%, #f8bbd0 30%, #f48fb1 60%, #fce4ec 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding-bottom: 200rpx;
}

// ===== LOVE 水印 =====
.love-watermark {
  position: absolute;
  top: 8%;
  font-size: 160rpx;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.15);
  letter-spacing: 20rpx;
  z-index: 0;
}

// ===== 标语区 =====
.slogan-area {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20%;
}

.slogan-sub {
  font-size: 28rpx;
  color: #A33A4A;
  letter-spacing: 8rpx;
}

.slogan-main {
  font-size: 90rpx;
  font-weight: bold;
  color: #8E2438;
  letter-spacing: 16rpx;
  margin-top: 16rpx;
}

// ===== CSS 小爱心 =====
.hearts-row {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}

.heart {
  position: relative;
  width: 20rpx;
  height: 20rpx;
}

.heart::before,
.heart::after {
  content: '';
  position: absolute;
  width: 10rpx;
  height: 16rpx;
  background: #D6325C;
  border-radius: 10rpx 10rpx 0 0;
}

.heart::before {
  left: 5rpx;
  transform: rotate(-45deg);
  transform-origin: 0 100%;
}

.heart::after {
  left: 5rpx;
  transform: rotate(45deg);
  transform-origin: 100% 100%;
}

// ===== 飘落花瓣 =====
.petals {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.petal {
  position: absolute;
  border-radius: 50% 0 50% 50%;
}

// ===== 中部主视觉区 =====
.main-visual {
  position: relative;
  z-index: 1;
  width: 70%;
  height: 400rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 80rpx;
}

.visual-img {
  width: 100%;
  height: 100%;
}

// ===== CSS 占位：交叠爱心 =====
.overlap-hearts {
  position: relative;
  width: 160rpx;
  height: 150rpx;
}

.big-heart {
  position: absolute;
  top: 0;
  width: 100rpx;
  height: 100rpx;
}

.big-heart::before,
.big-heart::after {
  content: '';
  position: absolute;
  width: 50rpx;
  height: 80rpx;
  background: #f06292;
  border-radius: 50rpx 50rpx 0 0;
}

.big-heart::before {
  left: 25rpx;
  transform: rotate(-45deg);
  transform-origin: 0 100%;
}

.big-heart::after {
  left: 25rpx;
  transform: rotate(45deg);
  transform-origin: 100% 100%;
}

.big-heart-right {
  left: 60rpx;
  top: 10rpx;

  &::before,
  &::after {
    background: #e91e63;
  }
}

// ===== 底部按钮区 =====
.bottom-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
}

.primary-btn {
  width: 86%;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(90deg, #D6325C, #E8608A);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 32rpx;
    font-weight: bold;
    color: #ffffff;
  }

  &:active {
    opacity: 0.85;
  }
}

.link-text {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #C0405A;

  &:active {
    opacity: 0.7;
  }
}

// ===== 底部气球 =====
.balloon {
  position: absolute;
  bottom: -20rpx;
  z-index: 0;
}

.balloon::after {
  content: '';
  position: absolute;
  width: 1px;
  height: 80rpx;
  background: rgba(0, 0, 0, 0.15);
  top: 100%;
  left: 50%;
}

.balloon-pink {
  left: 10%;
  width: 80rpx;
  height: 100rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #f8bbd0, #f06292);
}

.balloon-blue {
  right: 10%;
  width: 70rpx;
  height: 90rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #bbdefb, #90caf9);
}
</style>
