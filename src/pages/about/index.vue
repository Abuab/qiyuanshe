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
      <!-- 平台特点（纯 CSS 绘制，无任何图片/emoji） -->
      <view class="feature-section">
        <!-- 顶部波浪装饰 -->
        <view class="waves">
          <view class="wave wave1"></view>
          <view class="wave wave2"></view>
          <view class="wave wave3"></view>
          <view class="star star1 star-blink"></view>
          <view class="star star2"></view>
          <view class="star star3 star-blink"></view>
          <view class="star star4"></view>
          <view class="star star5 star-blink"></view>
          <view class="star star6"></view>
        </view>

        <!-- 中间爱心装饰（替代人物插画） -->
        <view class="hero">
          <view class="big-heart"></view>
          <view class="hero-dots">
            <view class="hero-dot"></view>
            <view class="hero-dot"></view>
          </view>
        </view>

        <!-- 标题 -->
        <view class="feature-title">平台特点</view>
        <view class="title-line"></view>

        <!-- 四个卖点卡片 -->
        <view class="feature-list">
          <!-- 卡片一：小房子 -->
          <view class="feature-card">
            <view class="icon-wrap">
              <view class="ic-house">
                <view class="h-sign"></view>
                <view class="h-roof"></view>
                <view class="h-body"><view class="h-door"></view></view>
              </view>
            </view>
            <text class="feature-text">真实海量本地用户</text>
          </view>

          <!-- 卡片二：奖杯 -->
          <view class="feature-card">
            <view class="icon-wrap">
              <view class="ic-trophy">
                <view class="t-handle t-left"></view>
                <view class="t-handle t-right"></view>
                <view class="t-cup"></view>
                <view class="t-base"></view>
              </view>
            </view>
            <text class="feature-text">靠谱本地服务团队</text>
          </view>

          <!-- 卡片三：上升图表 -->
          <view class="feature-card">
            <view class="icon-wrap">
              <view class="ic-chart">
                <view class="c-line c-line1"></view>
                <view class="c-line c-line2"></view>
                <view class="c-node c-node1"></view>
                <view class="c-node c-node2"></view>
                <view class="c-bar c-bar1"></view>
                <view class="c-bar c-bar2"></view>
                <view class="c-bar c-bar3"></view>
              </view>
            </view>
            <text class="feature-text">匹配资源丰富 脱单效率高</text>
          </view>

          <!-- 卡片四：双人+爱心 -->
          <view class="feature-card">
            <view class="icon-wrap">
              <view class="ic-couple">
                <view class="mini-heart"></view>
                <view class="person p-left">
                  <view class="p-head"></view>
                  <view class="p-body"></view>
                </view>
                <view class="person p-right">
                  <view class="p-head"></view>
                  <view class="p-body"></view>
                </view>
              </view>
            </view>
            <text class="feature-text">私人定制专享红娘服务</text>
          </view>
        </view>
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
  const sysInfo = uni.getWindowInfo() as any
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

/* ===== 平台特点（纯 CSS） ===== */
.feature-section {
  position: relative;
  margin: 24rpx 0;
  padding: 40rpx 32rpx 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #D4B8F0, #B8A0E0);
  overflow: hidden;
}

/* 顶部波浪装饰 */
.waves { position: absolute; top: 0; left: 0; right: 0; height: 220rpx; pointer-events: none; }
.wave { position: absolute; border-radius: 50%; }
.wave1 { width: 380rpx; height: 190rpx; background: rgba(150, 110, 200, 0.18); top: -70rpx; left: -50rpx; transform: rotate(-15deg); }
.wave2 { width: 340rpx; height: 170rpx; background: rgba(205, 150, 225, 0.18); top: -55rpx; right: -40rpx; transform: rotate(30deg); }
.wave3 { width: 300rpx; height: 150rpx; background: rgba(175, 135, 215, 0.15); top: -30rpx; left: 130rpx; }

/* 星星（clip-path 五角星） */
.star {
  position: absolute;
  background: #FFD700;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}
.star1 { width: 18rpx; height: 18rpx; top: 24rpx; left: 56rpx; }
.star2 { width: 12rpx; height: 12rpx; top: 60rpx; left: 180rpx; }
.star3 { width: 16rpx; height: 16rpx; top: 30rpx; right: 90rpx; }
.star4 { width: 14rpx; height: 14rpx; top: 70rpx; right: 40rpx; }
.star5 { width: 20rpx; height: 20rpx; top: 100rpx; left: 40rpx; }
.star6 { width: 12rpx; height: 12rpx; top: 110rpx; right: 120rpx; }
.star-blink { animation: star-blink 1.8s ease-in-out infinite; }
@keyframes star-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

/* 中间爱心装饰 */
.hero { position: relative; height: 300rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.big-heart { position: relative; width: 120rpx; height: 108rpx; }
.big-heart::before,
.big-heart::after {
  content: '';
  position: absolute;
  top: 0;
  left: 60rpx;
  width: 60rpx;
  height: 96rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 60rpx 60rpx 0 0;
  transform: rotate(-45deg);
  transform-origin: 0 100%;
}
.big-heart::after { left: 0; transform: rotate(45deg); transform-origin: 100% 100%; }
.hero-dots { display: flex; gap: 24rpx; margin-top: 28rpx; }
.hero-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: rgba(255, 255, 255, 0.25); }

/* 标题 */
.feature-title { position: relative; text-align: center; color: #fff; font-weight: bold; font-size: 40rpx; }
.title-line { width: 80rpx; height: 6rpx; border-radius: 3rpx; background: #FFD700; margin: 12rpx auto 0; }

/* 卖点卡片 */
.feature-list { position: relative; margin-top: 32rpx; }
.feature-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.feature-card + .feature-card { margin-top: 24rpx; }
.feature-text { font-size: 32rpx; font-weight: bold; color: #333; }
.icon-wrap {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFB6C1, #FFD4A0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 24rpx;
}

/* 图标一：小房子 */
.ic-house { position: relative; width: 40rpx; height: 52rpx; }
.h-sign { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 20rpx; height: 4rpx; background: #FFB6C1; border-radius: 2rpx; }
.h-roof { position: absolute; top: 8rpx; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 20rpx solid transparent; border-right: 20rpx solid transparent; border-bottom: 16rpx solid #fff; }
.h-body { position: absolute; top: 24rpx; left: 50%; transform: translateX(-50%); width: 32rpx; height: 24rpx; background: #fff; border-radius: 0 0 4rpx 4rpx; }
.h-door { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 8rpx; height: 12rpx; background: #FF9A56; border-radius: 2rpx 2rpx 0 0; }

/* 图标二：奖杯 */
.ic-trophy { position: relative; width: 40rpx; height: 44rpx; }
.t-cup { position: absolute; top: 4rpx; left: 50%; transform: translateX(-50%); width: 22rpx; height: 0; border-bottom: 26rpx solid #fff; border-left: 6rpx solid transparent; border-right: 6rpx solid transparent; }
.t-base { position: absolute; bottom: 2rpx; left: 50%; transform: translateX(-50%); width: 20rpx; height: 6rpx; background: #fff; border-radius: 2rpx; }
.t-handle { position: absolute; top: 6rpx; width: 12rpx; height: 18rpx; border: 3rpx solid #fff; border-radius: 50%; }
.t-left { left: 2rpx; border-right: none; }
.t-right { right: 2rpx; border-left: none; }

/* 图标三：上升图表 */
.ic-chart { position: relative; width: 42rpx; height: 32rpx; }
.c-bar { position: absolute; bottom: 0; width: 6rpx; background: #fff; border-radius: 3rpx; }
.c-bar1 { left: 4rpx; height: 12rpx; }
.c-bar2 { left: 18rpx; height: 20rpx; }
.c-bar3 { left: 32rpx; height: 16rpx; }
.c-line { position: absolute; height: 2rpx; background: #fff; transform-origin: left center; }
.c-line1 { left: 7rpx; bottom: 12rpx; width: 16rpx; transform: rotate(-27deg); }
.c-line2 { left: 21rpx; bottom: 20rpx; width: 15rpx; transform: rotate(15deg); }
.c-node { position: absolute; width: 5rpx; height: 5rpx; background: #fff; transform: rotate(45deg); }
.c-node1 { left: 19rpx; bottom: 18rpx; }
.c-node2 { left: 33rpx; bottom: 14rpx; }

/* 图标四：双人+爱心 */
.ic-couple { position: relative; width: 52rpx; height: 40rpx; }
.person { position: absolute; bottom: 4rpx; }
.p-left { left: 4rpx; }
.p-right { right: 4rpx; }
.p-head { width: 14rpx; height: 14rpx; border-radius: 50%; background: #fff; margin: 0 auto; }
.p-body { width: 0; height: 0; margin-top: 2rpx; border-left: 5rpx solid transparent; border-right: 5rpx solid transparent; border-bottom: 16rpx solid #fff; }
.mini-heart { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 14rpx; height: 12rpx; }
.mini-heart::before,
.mini-heart::after {
  content: '';
  position: absolute;
  top: 0;
  left: 7rpx;
  width: 7rpx;
  height: 11rpx;
  background: #FF6B9D;
  border-radius: 7rpx 7rpx 0 0;
  transform: rotate(-45deg);
  transform-origin: 0 100%;
}
.mini-heart::after { left: 0; transform: rotate(45deg); transform-origin: 100% 100%; }
</style>
