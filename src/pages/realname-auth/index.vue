<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <text class="nav-title">实名认证</text>
        <!-- 右侧留给微信原生胶囊按钮 -->
        <view class="nav-right" />
      </view>
    </view>

    <!-- 页面内容区 -->
    <scroll-view
      class="content"
      scroll-y
      :enhanced="true"
      :show-scrollbar="false"
      :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }"
    >
      <!-- ========== 头部区域 ========== -->
      <view class="header">
        <view class="header-left">
          <text class="header-title">完善认证</text>
          <text class="header-desc">获取专属认证标识，更受异性信任，牵手成功率更高</text>
        </view>
      </view>

      <!-- ========== 认证列表 ========== -->
      <view class="card-list">
        <!-- 第1项：实名认证 -->
        <view class="auth-card" @tap="handleItemTap('realname')">
          <view class="card-left">
            <view class="card-text">
              <text class="card-title">实名认证</text>
              <text class="card-desc">腾讯实名认证，远离骗子与婚托</text>
            </view>
          </view>
          <view class="card-right">
            <text class="card-action">去认证</text>
            <text class="card-arrow">></text>
          </view>
        </view>

        <!-- 第2项：单身承诺 -->
        <view class="auth-card" @tap="handleItemTap('single')">
          <view class="card-left">
            <view class="card-text">
              <text class="card-title">单身承诺</text>
              <text class="card-desc">单身承诺，真心诚信寻找爱情</text>
            </view>
          </view>
          <view class="card-right">
            <text class="card-action" :class="singlePromiseActionClass">{{ singlePromiseAction }}</text>
            <text class="card-arrow">></text>
          </view>
        </view>

        <!-- 第3项：学历认证 -->
        <view class="auth-card" @tap="handleItemTap('education')">
          <view class="card-left">
            <view class="card-text">
              <text class="card-title">学历认证</text>
              <text class="card-desc">支持毕业证、学信网截图等认证方式</text>
            </view>
          </view>
          <view class="card-right">
            <text class="card-action">去认证</text>
            <text class="card-arrow">></text>
          </view>
        </view>

        <!-- 第4项：房产认证 -->
        <view class="auth-card" @tap="handleItemTap('house')">
          <view class="card-left">
            <view class="card-text">
              <text class="card-title">房产认证</text>
              <text class="card-desc">让你的优势被更多人发现</text>
            </view>
          </view>
          <view class="card-right">
            <text class="card-action">去认证</text>
            <text class="card-arrow">></text>
          </view>
        </view>

        <!-- 第5项：车产认证 -->
        <view class="auth-card" @tap="handleItemTap('car')">
          <view class="card-left">
            <view class="card-text">
              <text class="card-title">车产认证</text>
              <text class="card-desc">让你的优势被更多人发现</text>
            </view>
          </view>
          <view class="card-right">
            <text class="card-action">去认证</text>
            <text class="card-arrow">></text>
          </view>
        </view>

        <!-- 第6项：到店认证 -->
        <view class="auth-card" @tap="handleItemTap('store')">
          <view class="card-left">
            <view class="card-text">
              <text class="card-title">到店认证</text>
              <text class="card-desc">让我们更了解你，更好地为你服务</text>
            </view>
          </view>
          <view class="card-right">
            <text class="card-action">去认证</text>
            <text class="card-arrow">></text>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="bottom-spacer" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { safeNavigateBack } from '@/utils/navigate'
import { get } from '@/utils/request'

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)

// 单身承诺状态
const singlePromiseAction = ref('去签署')
const singlePromiseActionClass = ref('')

onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  await fetchSinglePromiseStatus()
})

async function fetchSinglePromiseStatus() {
  try {
    const res: any = await get('/single-promise/status')
    const data = res?.data || res
    if (data?.exists) {
      if (data.status === 1) {
        singlePromiseAction.value = '已签署'
        singlePromiseActionClass.value = 'done'
      } else if (data.status === 0) {
        singlePromiseAction.value = '待审核'
        singlePromiseActionClass.value = 'pending'
      } else if (data.status === 2) {
        singlePromiseAction.value = '去签署'
        singlePromiseActionClass.value = ''
      }
    }
  } catch (_) {
    // 接口失败时保持默认"去签署"
  }
}

function handleBack() {
  safeNavigateBack()
}

function handleItemTap(type: string) {
  if (type === 'realname') {
    uni.navigateTo({ url: '/pages/realname-auth-input/index' })
    return
  }
  if (type === 'single') {
    uni.navigateTo({ url: '/pages/single-promise/index' })
    return
  }
  uni.showToast({ title: '功能开发中', icon: 'none' })
}</script>

<style lang="scss" scoped>
// ===== 全局 =====
.page {
  min-height: 100vh;
  background: #FFF5F7;
}

// ===== 导航栏 =====
.nav-wrap {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: #fff;
  border-bottom: 1px solid #E5E5E5;
}
.nav-bar {
  height: 88rpx; display: flex; align-items: center;
  justify-content: space-between; padding: 0 32rpx;
}
.nav-left {
  width: 100rpx; display: flex; align-items: center;
}
.back-icon {
  font-size: 40rpx; color: #333;
}
.nav-title {
  font-size: 32rpx; font-weight: 600; color: #333;
  position: absolute; left: 50%; transform: translateX(-50%);
}
.nav-right {
  width: 100rpx;
}

// ===== 内容区 =====
.content {
  height: 100vh;
  box-sizing: border-box;
}

// ===== 头部区域 =====
.header {
  display: flex; align-items: center;
  padding: 48rpx 32rpx;
  background: linear-gradient(135deg, #FFF0F5 0%, #FFF8F8 100%);
  margin: 0;
}
.header-left {
  flex: 1; display: flex; flex-direction: column;
}
.header-title {
  font-size: 56rpx; font-weight: bold; color: #333;
  margin-bottom: 16rpx;
}
.header-desc {
  font-size: 28rpx; color: #999; line-height: 1.6;
  max-width: 440rpx;
}

// ===== 认证卡片列表 =====
.card-list {
  padding: 24rpx 32rpx 0;
}

.auth-card {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
  transition: opacity 0.15s;
  &:active {
    opacity: 0.9;
  }
}

.card-left {
  display: flex; align-items: center; flex: 1; min-width: 0;
}

.card-text {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column;
}
.card-title {
  font-size: 32rpx; font-weight: bold; color: #333;
  margin-bottom: 8rpx;
}
.card-desc {
  font-size: 26rpx; color: #999; line-height: 1.5;
}

.card-right {
  display: flex; align-items: center; flex-shrink: 0; margin-left: 16rpx;
}
.card-action {
  font-size: 28rpx; color: #FF6B8A;
  &.done { color: #07C160; }
  &.pending { color: #FF9F43; }
}
.card-arrow {
  font-size: 28rpx; color: #CCC; margin-left: 8rpx;
}

// ===== 底部留白 =====
.bottom-spacer {
  height: 60rpx;
}
</style>
