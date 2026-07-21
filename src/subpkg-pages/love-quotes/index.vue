<template>
  <view class="love-quotes-page">
    <!-- 导航栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <text class="back-btn" @tap="handleBack">←</text>
        <text class="nav-title">爱情语录</text>
        <text class="nav-placeholder"></text>
      </view>
    </view>

    <scroll-view class="content-scroll" scroll-y :scroll-top="scrollToVal" @scroll="onScroll" :style="{ paddingTop: navTopPx + 'px' }">
      <!-- 展示当前语录的卡片 -->
      <view class="quote-card">
        <view class="quote-content">
          <text class="quote-text">{{ currentQuote }}</text>
        </view>
      </view>

      <!-- 换一个按钮（椭圆形胶囊，粉色描边，无填充） -->
      <view class="refresh-row">
        <view class="refresh-btn" @tap="shuffleQuote">
          <image v-if="pageIcons.refreshIcon" class="refresh-icon" :src="pageIcons.refreshIcon" mode="aspectFit" />
          <text v-else class="refresh-icon-emoji">🔄</text>
          <text class="refresh-text">换一个</text>
        </view>
      </view>

      <!-- 提交按钮（浓粉色大椭圆形） -->
      <view class="submit-section">
        <view class="submit-btn" @tap="handleSubmit">
          <text>提交</text>
        </view>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>
    <BackTop :show="showBackTop" @click="scrollToTop" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSystemStore } from '@/store/system'
import BackTop from '@/components/back-top/back-top.vue'
import { get, put } from '@/utils/request'

const systemStore = useSystemStore()
const statusBarHeight = ref(20)
const navTopPx = ref(0)
const scrollToVal = ref(0)
const showBackTop = ref(false)
const onScroll = (e: any) => { showBackTop.value = e.detail.scrollTop > 600 }
const scrollToTop = () => { scrollToVal.value = scrollToVal.value ? 0 : 0.001; showBackTop.value = false }
const quotes = ref<string[]>([])
const currentIndex = ref(0)

const pageIcons = computed(() => systemStore.icons?.page || {})

const currentQuote = computed(() => {
  if (quotes.value.length === 0) return '缘分天注定，爱情需要主动争取。'
  return quotes.value[currentIndex.value] || quotes.value[0]
})

onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navTopPx.value = (sysInfo.statusBarHeight || 20) + 44
})

// 从系统配置加载爱情语录
const loadQuotes = async () => {
  try {
    const res: any = await get('/system/config')
    // loveQuotes 可能为空数组 [], 需用 length 判断而非 truthy
    if (res?.loveQuotes && Array.isArray(res.loveQuotes) && res.loveQuotes.length > 0) {
      quotes.value = res.loveQuotes.filter((q: string) => q && q.trim())
    }
    // 如果后端未配置或为空，使用默认语录
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
      uni.navigateBack()
    }, 1500)
  } catch {
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

const handleBack = () => {
  uni.navigateBack()
}

loadQuotes()
</script>

<style lang="scss" scoped>
.love-quotes-page {
  min-height: 100vh;
  background-color: #FFF8FA;
}

.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(180deg, #FFE4EC 0%, #FFE4EC 70%, #FFF0F5 100%);
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
  font-weight: bold;
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

.content-scroll {
  height: 100vh;
  padding: 0 32rpx;
}

.quote-card {
  margin-top: 60rpx;
  padding: 48rpx 40rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(255, 107, 157, 0.08);
}

.quote-content {
  min-height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quote-text {
  font-size: 34rpx;
  color: #333;
  line-height: 1.8;
  text-align: center;
}

.refresh-row {
  display: flex;
  justify-content: center;
  margin-top: 40rpx;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 40rpx;
  border: 2rpx solid #FF6B9D;
  border-radius: 50rpx;
  background: transparent;
}

.refresh-icon {
  width: 32rpx;
  height: 32rpx;
}

.refresh-icon-emoji {
  font-size: 28rpx;
}

.refresh-text {
  font-size: 28rpx;
  color: #FF6B9D;
}

.submit-section {
  display: flex;
  justify-content: center;
  margin-top: 60rpx;
}

.submit-btn {
  width: 400rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FF4081;
  border-radius: 50rpx;

  text {
    font-size: 32rpx;
    color: #fff;
    font-weight: bold;
  }
}

.bottom-safe {
  height: 60rpx;
}
</style>
