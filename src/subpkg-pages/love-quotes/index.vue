<template>
  <view class="page">
    <!-- 导航栏 — 白底深色，与 about/my-follows 统一的 nav 风格 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">{{ appName }}</text>
        <view class="nav-right"></view>
      </view>
    </view>

    <!-- 内容区 — 语录卡片 + 换一个 -->
    <scroll-view
      class="content-scroll"
      scroll-y
      :show-scrollbar="false"
      :scroll-top="scrollToVal"
      @scroll="onScroll"
      :style="{ paddingTop: navTopPx + 'px' }"
    >
      <!-- 语录卡片 — 顶部对齐，白底圆角，文字左对齐 -->
      <view class="quote-card">
        <text class="quote-text">{{ currentQuote }}</text>
        <view class="quote-text-bottom"></view>
      </view>

      <!-- 换一个按钮 — 胶囊形，白底粉色描边，unicode 刷新图标 -->
      <view class="refresh-row">
        <view class="refresh-btn" @tap="shuffleQuote">
          <text class="refresh-icon-text">↻</text>
          <text class="refresh-text">换一个</text>
        </view>
      </view>

      <!-- 给内容区留出底部按钮的高度 -->
      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- 提交按钮 — 固定于底部，全宽大圆角粉色 -->
    <view class="submit-bar">
      <view class="submit-btn" @tap="handleSubmit">
        <text>提交</text>
      </view>
      <view class="safe-bottom"></view>
    </view>

    <BackTop :show="showBackTop" @click="scrollToTop" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSystemStore } from '@/store/system'
import BackTop from '@/components/back-top/back-top.vue'
import { useBackTop } from '@/composables/useBackTop'
import { get, put } from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'

const systemStore = useSystemStore()
const { appName } = storeToRefs(systemStore)
const statusBarHeight = ref(20)
const navTopPx = ref(0)
const { showBackTop, onScroll, scrollToTop, scrollToVal } = useBackTop()
const quotes = ref<string[]>([])
const currentIndex = ref(0)

const currentQuote = computed(() => {
  if (quotes.value.length === 0) return '缘分天注定，爱情需要主动争取。'
  return quotes.value[currentIndex.value] || quotes.value[0]
})

onMounted(() => {
  const sysInfo = uni.getWindowInfo()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navTopPx.value = (sysInfo.statusBarHeight || 20) + 44
})

// 从系统配置加载爱情语录
const loadQuotes = async () => {
  try {
    const res: any = await get('/system/config')
    if (res?.loveQuotes && Array.isArray(res.loveQuotes) && res.loveQuotes.length > 0) {
      quotes.value = res.loveQuotes.filter((q: string) => q && q.trim())
    }
    if (quotes.value.length === 0) {
      quotes.value = [
        '缘分天注定，爱情需要主动争取。',
        '最好的爱情，是彼此成就，共同成长。',
        '真爱不是寻找完美的人，而是学会用完美的眼光看待不完美的人。',
        '爱情不是轰轰烈烈的誓言，而是平平淡淡的陪伴。',
        '遇见你，是我今生最美的意外。',
        '愿得一人心，白首不分离。',
      ]
    }
    currentIndex.value = Math.floor(Math.random() * quotes.value.length)
  } catch {
    quotes.value = ['缘分天注定，爱情需要主动争取。']
  }
}

// 随机换一条语录
const shuffleQuote = () => {
  if (quotes.value.length <= 1) return
  let newIndex: number
  do {
    newIndex = Math.floor(Math.random() * quotes.value.length)
  } while (newIndex === currentIndex.value && quotes.value.length > 1)
  currentIndex.value = newIndex
}

// 提交语录
const handleSubmit = async () => {
  try {
    await put('/users/profile', { loveQuote: currentQuote.value })
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      safeNavigateBack()
    }, 1500)
  } catch {
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

const handleBack = () => {
  safeNavigateBack()
}

loadQuotes()
</script>

<style lang="scss" scoped>
// ========== 页面背景：浅灰 ==========
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

// ========== 导航栏：纯白底，深色元素 ==========
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

.nav-left,
.nav-right {
  width: 100rpx;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

// ========== 内容滚动区 ==========
.content-scroll {
  height: 100vh;
  padding: 32rpx;
  box-sizing: border-box;

  // 隐藏滚动条
  ::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }
}

// ========== 语录卡片：顶部对齐，白底圆角，左对齐 ==========
.quote-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-top: 20rpx;
}

.quote-text {
  font-size: 30rpx;
  color: #333;
  line-height: 1.8;
  text-align: left;
}

// 文字下方额外留白（<text> 组件 padding 不可靠，改用占位 view）
.quote-text-bottom {
  height: 100rpx;
}

// ========== 换一个按钮：胶囊形，白底 + 粉色描边 + 粉色文字 ==========
.refresh-row {
  display: flex;
  justify-content: center;
  margin-top: 32rpx;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 40rpx;
  border: 2rpx solid #FF6B9D;
  border-radius: 50rpx;
  background: #fff;

  &:active {
    opacity: 0.7;
  }
}

// 刷新图标 — unicode ↻ (U+21BB 顺时针开口圆弧箭头)
.refresh-icon-text {
  font-size: 32rpx;
  color: #FF6B9D;
  font-weight: bold;
  line-height: 1;
}

.refresh-text {
  font-size: 28rpx;
  color: #FF6B9D;
}

// ========== 底部提交按钮：固定于底部，全宽大圆角粉色 ==========
.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #f5f5f5;
  padding: 20rpx 40rpx 0;
}

.submit-btn {
  height: 96rpx;
  background: #FF4D6A;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 32rpx;
    font-weight: bold;
    color: #fff;
  }

  &:active {
    opacity: 0.85;
  }
}

// 底部安全区域
.safe-bottom {
  height: calc(40rpx + constant(safe-area-inset-bottom));
  height: calc(40rpx + env(safe-area-inset-bottom));
}

// 内容区底部占位，确保不会被固定按钮遮挡
.bottom-placeholder {
  height: 200rpx;
}
</style>
