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
            <text class="card-action" :class="realnameActionClass">{{ realnameAction }}</text>
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
            <text class="card-action" :class="educationActionClass">{{ educationAction }}</text>
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
            <text class="card-action" :class="propertyActionClass">{{ propertyAction }}</text>
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
            <text class="card-action" :class="carActionClass">{{ carAction }}</text>
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
            <text class="card-action" :class="storeCertActionClass">{{ storeCertAction }}</text>
            <text class="card-arrow">></text>
          </view>
        </view>

      </view>

      <!-- 底部留白 -->
      <view class="bottom-spacer" />
    </scroll-view>

    <!-- 到店认证弹窗 -->
    <store-cert-popup :show="storeCertPopupShow" @close="storeCertPopupShow = false" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { safeNavigateBack } from '@/utils/navigate'
import { get } from '@/utils/request'
import StoreCertPopup from './store-cert-popup.vue'

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const storeCertPopupShow = ref(false)

// 单身承诺状态
const singlePromiseAction = ref('去签署')
const singlePromiseActionClass = ref('')

// 实名 / 学历 / 房产 / 车产 认证状态
const realnameAction = ref('去认证')
const realnameActionClass = ref('')
const educationAction = ref('去认证')
const educationActionClass = ref('')
const propertyAction = ref('去认证')
const propertyActionClass = ref('')
const carAction = ref('去认证')
const carActionClass = ref('')

// 到店认证状态
const storeCertAction = ref('去认证')
const storeCertActionClass = ref('')

onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  await Promise.all([
    fetchSinglePromiseStatus(),
    fetchRealnameStatus(),
    fetchAuthStatus('/education-auth/status', educationAction, educationActionClass),
    fetchAuthStatus('/property-auth/status', propertyAction, propertyActionClass),
    fetchAuthStatus('/car-auth/status', carAction, carActionClass),
    fetchStoreCertStatus(),
  ])
})

// 学历/房产/车产：返回 { exists, status }（0待审核 / 1已通过 / 2已拒绝）
async function fetchAuthStatus(url: string, actionRef: any, classRef: any) {
  try {
    const res: any = await get(url)
    const d = res?.data || res
    if (d?.exists) {
      if (d.status === 1) { actionRef.value = '已认证'; classRef.value = 'done' }
      else if (d.status === 0) { actionRef.value = '待审核'; classRef.value = 'pending' }
    }
  } catch (_) {
    // 失败时保持默认"去认证"
  }
}

// 实名认证状态以 E证通结果(eidCertStatus)为准：2已认证 / 1认证中，不再依赖旧的 isRealName 标记
async function fetchRealnameStatus() {
  try {
    const res: any = await get('/auth/profile')
    const p = res?.data || res
    const s = Number(p?.eidCertStatus) || 0
    if (s === 2) {
      realnameAction.value = '已认证'
      realnameActionClass.value = 'done'
    } else if (s === 1) {
      realnameAction.value = '认证中'
      realnameActionClass.value = 'pending'
    }
  } catch (_) {
    // 失败时保持默认"去认证"
  }
}

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

// 到店认证状态：从 /auth/profile 中获取 storeCertified 字段
async function fetchStoreCertStatus() {
  try {
    const res: any = await get('/auth/profile')
    const p = res?.data || res
    if (Number(p?.storeCertified) === 1) {
      storeCertAction.value = '已认证'
      storeCertActionClass.value = 'done'
    }
  } catch (_) {
    // 失败时保持默认"去认证"
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
  if (type === 'education') {
    uni.navigateTo({ url: '/pages/education-auth/index' })
    return
  }
  if (type === 'house' || type === 'property') {
    uni.navigateTo({ url: '/pages/property-auth/index' })
    return
  }
  if (type === 'car') {
    uni.navigateTo({ url: '/pages/car-auth/index' })
    return
  }
  if (type === 'store') {
    storeCertPopupShow.value = true
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
