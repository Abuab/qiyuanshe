<template>
  <view class="page">
    <!-- ========== 顶部导航栏 ========== -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack">
          <view class="back-arrow" />
        </view>
        <text class="nav-title">实名认证</text>
        <view class="nav-capsule">
          <view class="capsule-dots">
            <view class="capsule-dot" />
            <view class="capsule-dot" />
            <view class="capsule-dot" />
          </view>
          <view class="capsule-divider" />
          <view class="capsule-circle" />
        </view>
      </view>
    </view>

    <!-- ========== 页面内容 ========== -->
    <scroll-view
      class="content"
      scroll-y
      :enhanced="true"
      :show-scrollbar="false"
      :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }"
    >
      <!-- 标题区（完善认证） -->
      <view class="header">
        <view class="header-left">
          <text class="header-title">完善认证</text>
          <view class="header-underline" />
          <text class="header-desc">获取专属认证标识，更受异性信任</text>
          <text class="header-desc">牵手成功率更高</text>
        </view>
      </view>

      <!-- ========== 认证卡片列表 ========== -->
      <view class="card-list">
        <!-- 1. 实名认证 -->
        <view class="auth-card" @tap="handleItemTap('realname')">
          <view class="card-icon" style="background: #F5F5F5;">
            <image class="card-icon-img" src="/static/icons/auth/realname.png" mode="aspectFit" />
          </view>
          <view class="card-text">
            <text class="card-title">实名认证</text>
            <text class="card-desc">腾讯实名认证，远离骗子与婚托</text>
          </view>
          <view class="card-right">
            <text class="card-action" :class="realnameActionClass">{{ realnameAction }}</text>
          </view>
        </view>

        <!-- 2. 单身承诺 -->
        <view class="auth-card" @tap="handleItemTap('single')">
          <view class="card-icon" style="background: #F5F5F5;">
            <image class="card-icon-img" src="/static/icons/auth/single.png" mode="aspectFit" />
          </view>
          <view class="card-text">
            <text class="card-title">单身承诺</text>
            <text class="card-desc">单身承诺，真心诚信寻找爱情</text>
          </view>
          <view class="card-right">
            <text class="card-action" :class="singlePromiseActionClass">{{ singlePromiseAction }}</text>
          </view>
        </view>

        <!-- 3. 学历认证 -->
        <view class="auth-card" @tap="handleItemTap('education')">
          <view class="card-icon" style="background: #F5F5F5;">
            <image class="card-icon-img" src="/static/icons/auth/education.png" mode="aspectFit" />
          </view>
          <view class="card-text">
            <text class="card-title">学历认证</text>
            <text class="card-desc">支持毕业证、学信网截图等认证方式</text>
          </view>
          <view class="card-right">
            <text class="card-action" :class="educationActionClass">{{ educationAction }}</text>
          </view>
        </view>

        <!-- 4. 房产认证 -->
        <view class="auth-card" @tap="handleItemTap('house')">
          <view class="card-icon" style="background: #F5F5F5;">
            <image class="card-icon-img" src="/static/icons/auth/property.png" mode="aspectFit" />
          </view>
          <view class="card-text">
            <text class="card-title">房产认证</text>
            <text class="card-desc">让你的优势被更多人发现</text>
          </view>
          <view class="card-right">
            <text class="card-action" :class="propertyActionClass">{{ propertyAction }}</text>
          </view>
        </view>

        <!-- 5. 车产认证 -->
        <view class="auth-card" @tap="handleItemTap('car')">
          <view class="card-icon" style="background: #F5F5F5;">
            <image class="card-icon-img" src="/static/icons/auth/car.png" mode="aspectFit" />
          </view>
          <view class="card-text">
            <text class="card-title">车产认证</text>
            <text class="card-desc">让你的优势被更多人发现</text>
          </view>
          <view class="card-right">
            <text class="card-action" :class="carActionClass">{{ carAction }}</text>
          </view>
        </view>

        <!-- 6. 到店认证 -->
        <view class="auth-card" @tap="handleItemTap('store')">
          <view class="card-icon" style="background: #F5F5F5;">
            <image class="card-icon-img" src="/static/icons/auth/store.png" mode="aspectFit" />
          </view>
          <view class="card-text">
            <text class="card-title">到店认证</text>
            <text class="card-desc">让我们更了解你，更好地为你服务</text>
          </view>
          <view class="card-right">
            <text class="card-action" :class="storeCertActionClass">{{ storeCertAction }}</text>
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
import { onShow } from '@dcloudio/uni-app'
import { requireLogin } from '@/utils/auth'
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
  if (!requireLogin()) return

  const sysInfo = uni.getWindowInfo()
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

let certStatusMounted = false
onShow(() => {
  // 从子页面（单身承诺等）返回时刷新认证状态，避免 onMounted 仅执行一次导致状态滞后
  if (!certStatusMounted) { certStatusMounted = true; return }
  fetchSinglePromiseStatus()
})

// 学历/房产/车产：返回 { exists, status }（0待审核 / 1已通过 / 2已拒绝）
async function fetchAuthStatus(url: string, actionRef: any, classRef: any) {
  try {
    const res: any = await get(url)
    const d = res?.data || res
    if (d?.exists) {
      if (d.status === 1) { actionRef.value = '已认证'; classRef.value = 'done' }
      else if (d.status === 0) { actionRef.value = '待审核'; classRef.value = 'pending' }
      else if (d.status === 2) { actionRef.value = '未通过，重新认证'; classRef.value = '' }
    }
  } catch (_) {
    // 失败时保持默认"去认证"
  }
}

// 实名认证状态以 E证通结果(eidCertStatus)为准：2已认证 / 1认证中，同时校验 isRealName 防止管理后台单独回退
async function fetchRealnameStatus() {
  try {
    const res: any = await get('/auth/profile')
    const p = res?.data || res
    const s = Number(p?.eidCertStatus) || 0
    const isRealName = Number(p?.isRealName) || 0
    if (s === 2 && isRealName === 1) {
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

// 到店认证状态：从 /auth/store-cert-status 获取（原生 SQL，避免 TypeORM 列映射问题）
async function fetchStoreCertStatus() {
  try {
    const res: any = await get('/auth/store-cert-status')
    const p = res?.data || res
    if (Number(p?.certified) === 1) {
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
  // 已认证项不可再次打开
  if (type === 'realname' && realnameActionClass.value === 'done') {
    uni.showToast({ title: '已完成实名认证', icon: 'none' }); return
  }
  if (type === 'single' && singlePromiseActionClass.value === 'done') {
    uni.showToast({ title: '已完成单身承诺', icon: 'none' }); return
  }
  if (type === 'education' && educationActionClass.value === 'done') {
    uni.showToast({ title: '已完成学历认证', icon: 'none' }); return
  }
  if ((type === 'house' || type === 'property') && propertyActionClass.value === 'done') {
    uni.showToast({ title: '已完成房产认证', icon: 'none' }); return
  }
  if (type === 'car' && carActionClass.value === 'done') {
    uni.showToast({ title: '已完成车产认证', icon: 'none' }); return
  }

  if (type === 'realname') {
    uni.navigateTo({ url: '/subpkg-pages/realname-auth-input/index' })
    return
  }
  if (type === 'single') {
    uni.navigateTo({ url: '/subpkg-pages/single-promise/index' })
    return
  }
  if (type === 'education') {
    uni.navigateTo({ url: '/subpkg-pages/education-auth/index' })
    return
  }
  if (type === 'house' || type === 'property') {
    uni.navigateTo({ url: '/subpkg-pages/property-auth/index' })
    return
  }
  if (type === 'car') {
    uni.navigateTo({ url: '/subpkg-pages/car-auth/index' })
    return
  }
  if (type === 'store') {
    storeCertPopupShow.value = true
    return
  }
  uni.showToast({ title: '功能开发中', icon: 'none' })
}</script>

<style lang="scss" scoped>
// ==========================================
//  全局
// ==========================================
.page {
  min-height: 100vh;
  background: #FFF5F7;
}

// ==========================================
//  导航栏
// ==========================================
.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(180deg, #FFE8F0 0%, #FFF5F7 100%);
}

.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  position: relative;
}

/* ---- 左侧返回箭头（纯 CSS） ---- */
.nav-left {
  width: 100rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
}

.back-arrow {
  width: 20rpx;
  height: 20rpx;
  border-left: 4rpx solid #333;
  border-bottom: 4rpx solid #333;
  transform: rotate(45deg);
  margin-left: 4rpx;
}

/* ---- 中间标题 ---- */
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
}

/* ---- 右侧胶囊（模拟微信原生） ---- */
.nav-capsule {
  display: flex;
  align-items: center;
  height: 56rpx;
  padding: 0 16rpx;
  background: #FFF;
  border-radius: 32rpx;
  border: 1rpx solid rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
  flex-shrink: 0;
}

.capsule-dots {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.capsule-dot {
  width: 4rpx;
  height: 4rpx;
  border-radius: 50%;
  background: #333;
}

.capsule-divider {
  width: 1rpx;
  height: 28rpx;
  background: #E0E0E0;
  margin: 0 12rpx;
}

.capsule-circle {
  width: 28rpx;
  height: 28rpx;
  border: 2rpx solid #333;
  border-radius: 50%;
  box-sizing: border-box;
}

// ==========================================
//  内容区
// ==========================================
.content {
  height: 100vh;
  box-sizing: border-box;
}

// ==========================================
//  标题区（完善认证）
// ==========================================
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 48rpx 32rpx 36rpx;
  margin: 0;
}

.header-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-right: 24rpx;
}

.header-title {
  font-size: 52rpx;
  font-weight: bold;
  color: #1A1A1A;
  line-height: 1.1;
  letter-spacing: 2rpx;
}

.header-underline {
  width: 80rpx;
  height: 8rpx;
  background: #FF6B9D;
  border-radius: 4rpx;
  margin-top: 12rpx;
  margin-bottom: 20rpx;
}

.header-desc {
  font-size: 28rpx;
  color: #999;
  line-height: 1.5;
}

// ==========================================
//  认证卡片列表
// ==========================================
.card-list {
  padding: 0 32rpx;
}

.auth-card {
  display: flex;
  align-items: center;
  background: #FFF;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(255, 107, 157, 0.08);
  transition: opacity 0.15s;

  &:active {
    opacity: 0.9;
  }
}

/* ---- 左侧图标容器 ---- */
.card-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 28rpx;
}

.card-icon-img {
  width: 56rpx;
  height: 56rpx;
}

/* ---- 中间文字区 ---- */
.card-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.3;
  margin-bottom: 6rpx;
}

.card-desc {
  font-size: 26rpx;
  color: #999;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- 右侧状态区 ---- */
.card-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.card-action {
  font-size: 28rpx;
  color: #FF6B9D;

  &.done {
    color: #07C160;
  }

  &.pending {
    color: #FF9F43;
  }
}

// ==========================================
//  底部留白
// ==========================================
.bottom-spacer {
  height: 60rpx;
}
</style>
