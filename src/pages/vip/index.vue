<template>
  <view class="vip-page">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px', height: (44 + statusBarHeight) + 'px' }">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">开通会员</view>
      <view class="nav-right"></view>
    </view>

    <scroll-view class="page-content" scroll-y enable-flex :style="{ paddingTop: (44 + statusBarHeight) + 'px' }">
      <!-- 头部标题 + 特权列表 -->
      <view class="header-section">
        <text class="header-title">开通会员，享受专属特权</text>

        <view class="benefits-list">
          <view class="benefit-item">
            <view class="benefit-icon">💬</view>
            <view class="benefit-text">
              <text class="benefit-title">无限畅聊</text>
              <text class="benefit-desc">解锁全部聊天功能</text>
            </view>
          </view>

          <view class="benefit-item">
            <view class="benefit-icon">🔥</view>
            <view class="benefit-text">
              <text class="benefit-title">优先推荐</text>
              <text class="benefit-desc">首页优先展示曝光</text>
            </view>
          </view>

          <view class="benefit-item">
            <view class="benefit-icon">👁</view>
            <view class="benefit-text">
              <text class="benefit-title">查看访客</text>
              <text class="benefit-desc">谁看过我的资料</text>
            </view>
          </view>

          <view class="benefit-item">
            <view class="benefit-icon">👑</view>
            <view class="benefit-text">
              <text class="benefit-title">专属标识</text>
              <text class="benefit-desc">VIP 尊贵标识</text>
            </view>
          </view>

          <view class="benefit-item">
            <view class="benefit-icon">❤️</view>
            <view class="benefit-text">
              <text class="benefit-title">红娘服务</text>
              <text class="benefit-desc">专属红娘牵线</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 选择套餐 -->
      <view class="packages-section">
        <text class="section-title">选择套餐</text>

        <scroll-view class="packages-scroll" scroll-x enable-flex :show-scrollbar="false">
          <view class="packages-row">
            <view
              v-for="pkg in packages"
              :key="pkg.level"
              class="package-card"
              :class="{ selected: selectedLevel === pkg.level }"
              @tap="selectPackage(pkg)"
            >
            <!-- 顶部标签 -->
            <view class="package-tag" :class="pkg.tagClass">
              <text>{{ pkg.tag }}</text>
            </view>

            <!-- 套餐名称 -->
            <text class="package-name">{{ pkg.name }}</text>

            <!-- 现价 -->
            <view class="package-price">
              <text class="price-symbol">¥</text>
              <text class="price-value">{{ pkg.price }}</text>
            </view>

            <!-- 原价 -->
            <text class="package-original">¥{{ pkg.original }}</text>

            <!-- 节省标签 -->
            <view v-if="pkg.discount" class="package-save">
              <text>省¥{{ pkg.discount }}</text>
            </view>

            <!-- 无节省时占位保持卡面高度一致 -->
            <view v-else class="package-save-placeholder"></view>
          </view>
          </view>
        </scroll-view>
      </view>

      <!-- 支付方式 -->
      <view class="payment-section">
        <text class="section-title">支付方式</text>

        <view class="payment-method">
          <view class="method-item selected">
            <view class="wechat-pay-icon-wrap">
              <text class="wechat-pay-icon-text">微</text>
            </view>
            <text class="method-name">微信支付</text>
            <view class="check-icon">✓</view>
          </view>
        </view>
      </view>

      <!-- 协议 -->
      <view style="height:40rpx"></view>

      <!-- 底部安全区占位 -->
      <view class="bottom-placeholder" style="height:200rpx"></view>
    </scroll-view>

    <!-- 底部固定按钮 -->
    <view class="fixed-bottom">
      <view class="agreement-inline">
        <text class="agreement-text">开通即表示同意</text>
        <text class="agreement-link" @tap="showAgreement">《会员服务协议》</text>
      </view>
      <view class="submit-btn" @tap="handleSubmit">
        <text>立即开通</text>
      </view>
    </view>
  </view>

  <tab-bar />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'
import { safeNavigateBack } from '@/utils/navigate'

interface VipPackage {
  level: number
  name: string
  price: number
  original: number
  discount: number | null
  tag: string
  tagClass: string
  months: number
}

const userStore = useUserStore()
const selectedLevel = ref(1)
const statusBarHeight = ref(0)

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
})

const packages: VipPackage[] = [
  {
    level: 1,
    name: '黄金会员',
    price: 99,
    original: 99,
    discount: null,
    tag: '推荐',
    tagClass: 'tag-recommend',
    months: 1,
  },
  {
    level: 2,
    name: '钻石会员',
    price: 249,
    original: 297,
    discount: 48,
    tag: '热销',
    tagClass: 'tag-hot',
    months: 3,
  },
  {
    level: 3,
    name: '至尊VIP',
    price: 799,
    original: 1188,
    discount: 389,
    tag: '最佳价值',
    tagClass: 'tag-best',
    months: 12,
  },
]

const selectPackage = (pkg: VipPackage) => {
  selectedLevel.value = pkg.level
}

const handleSubmit = async () => {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  const selectedPkg = packages.find(p => p.level === selectedLevel.value)
  if (!selectedPkg) return

  try {
    uni.showLoading({ title: '创建订单...' })

    const res = await request({
      url: '/payment/create-order',
      method: 'POST',
      data: {
        vipLevel: selectedLevel.value,
      },
    })

    if (res.payParams) {
      // 测试模式：微信支付未配置，直接模拟支付成功
      if (res.payParams.paySign === '__MOCK__') {
        await request({
          url: '/payment/mock-pay',
          method: 'POST',
          data: { orderNo: res.orderNo },
        })
        uni.hideLoading()
        uni.redirectTo({
          url: `/pages/pay-result/index?orderNo=${res.orderNo}&status=success`,
        })
        return
      }

      uni.requestPayment({
        provider: 'wxpay',
        timeStamp: res.payParams.timeStamp,
        nonceStr: res.payParams.nonceStr,
        package: res.payParams.package,
        signType: res.payParams.signType,
        paySign: res.payParams.paySign,
        success: () => {
          uni.redirectTo({
            url: `/pages/pay-result/index?orderNo=${res.orderNo}&status=success`,
          })
        },
        fail: (err) => {
          console.error('payment failed', err)
          uni.redirectTo({
            url: `/pages/pay-result/index?orderNo=${res.orderNo}&status=fail&reason=${encodeURIComponent('用户取消支付')}`,
          })
        },
        complete: () => {
          uni.hideLoading()
        },
      })
    } else {
      uni.showToast({ title: '创建订单失败', icon: 'none' })
    }
  } catch (e: unknown) {
    const err = e as Error
    console.error('create order error', err)
    if (err.message !== 'Unauthorized') {
      uni.showToast({ title: '创建订单失败', icon: 'none' })
    }
  } finally {
    uni.hideLoading()
  }
}

const showAgreement = () => {
  uni.navigateTo({
    url: '/pages/agreement/index?type=vip',
  })
}

const handleBack = () => {
  safeNavigateBack()
}
</script>

<style lang="scss" scoped>
// ========== 全局 ==========
.vip-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF0F3 0%, #FFF5F5 25%, #FFFFFF 50%, #f5f5f5 100%);
  display: flex;
  flex-direction: column;
}

// ========== 顶部导航 ==========
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background-color: transparent;
  z-index: 100;
  box-shadow: none;
}

.nav-left,
.nav-right {
  width: 100rpx;
}

.nav-right {
  display: flex;
  justify-content: flex-end;
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

// ========== 可滚动内容 ==========
.page-content {
  flex: 1;
  padding-bottom: 120rpx;
}

// ========== 头部标题 + 特权 ==========
.header-section {
  padding: 32rpx;
  background-color: #fff;
  margin-bottom: 16rpx;
}

.header-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 40rpx;
  text-align: center;
}

// ========== 特权列表 ==========
.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.benefit-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
}

.benefit-icon {
  width: 64rpx;
  height: 64rpx;
  min-width: 64rpx;
  background-color: #FFF0F3;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  margin-right: 24rpx;
}

.benefit-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.benefit-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.4;
}

.benefit-desc {
  font-size: 24rpx;
  color: #999;
  line-height: 1.4;
}

// ========== 套餐选择 ==========
.packages-section {
  padding: 32rpx 24rpx;
  background-color: #fff;
  margin-bottom: 16rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 28rpx;
  padding-left: 8rpx;
}

// 横向可滚动套餐卡片
.packages-scroll {
  width: 100%;
  white-space: nowrap;
  padding-top: 16rpx;
}

.packages-row {
  display: inline-flex;
  gap: 16rpx;
  padding: 4rpx 8rpx 0;
}

// 三列等宽网格，无横向滚动
// .packages-grid 已废弃，保留注释

.package-card {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 210rpx;
  padding: 36rpx 12rpx 24rpx;
  background-color: #fff;
  border: 4rpx solid #eee;
  border-radius: 16rpx;
  position: relative;
  transition: all 0.25s ease;
  box-sizing: border-box;
  flex-shrink: 0;
  vertical-align: top;

  &.selected {
    border-color: #FF6B9D;
    background-color: #FFF0F3;
    transform: scale(1.04);
  }
}

// 顶部标签 — 居中悬浮于卡片上边缘
.package-tag {
  position: absolute;
  top: -8rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 4rpx 20rpx;
  border-radius: 20rpx;
  white-space: nowrap;
  z-index: 1;

  text {
    font-size: 20rpx;
    color: #fff;
    font-weight: 500;
  }

  &.tag-recommend {
    background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  }

  &.tag-hot {
    background: linear-gradient(135deg, #FF9500, #FFB347);
  }

  &.tag-best {
    background: linear-gradient(135deg, #722ED1, #9B59B6);
  }
}

// 套餐名称
.package-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  text-align: center;
}

// 现价 — 粉色大字号居中
.package-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 6rpx;
}

.price-symbol {
  font-size: 22rpx;
  color: #FF6B9D;
  font-weight: bold;
}

.price-value {
  font-size: 44rpx;
  font-weight: bold;
  color: #FF6B9D;
  line-height: 1;
}

// 原价 — 灰色删除线居中
.package-original {
  font-size: 22rpx;
  color: #999;
  text-decoration: line-through;
  margin-bottom: 10rpx;
  text-align: center;
}

// 节省标签 — 底部居中
.package-save {
  padding: 4rpx 14rpx;
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  border-radius: 8rpx;

  text {
    font-size: 20rpx;
    color: #fff;
    font-weight: 500;
  }
}

// 无节省时保持高度一致
.package-save-placeholder {
  height: 36rpx; // 与 .package-save 实际高度对齐
}

// ========== 支付方式 ==========
.payment-section {
  padding: 32rpx 24rpx;
  background-color: #fff;
  margin-bottom: 16rpx;
}

.payment-method {
  padding: 0 8rpx;
}

.method-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border: 3rpx solid #FF6B9D;
  border-radius: 16rpx;
  background-color: #FFF0F3;
}

.wechat-pay-icon-wrap {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background-color: #07C160;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.wechat-pay-icon-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: bold;
}

.method-name {
  flex: 1;
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.check-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: #FF6B9D;
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

// ========== 协议 ==========
.agreement-section {
  padding: 24rpx 32rpx;
  text-align: center;
}

.agreement-text {
  font-size: 24rpx;
  color: #999;
}

.agreement-link {
  font-size: 24rpx;
  color: #FF6B9D;
}

// ========== 底部占位（给 fixed-bottom 让出空间） ==========
.bottom-placeholder {
  height: 160rpx; // fixed-bottom 高度 + safe-area 余量
}

// ========== 底部按钮 ==========
.fixed-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
  z-index: 50;
}

.agreement-inline {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.submit-btn {
  height: 96rpx;
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(255, 107, 157, 0.35);

  text {
    font-size: 34rpx;
    font-weight: bold;
    color: #fff;
    letter-spacing: 4rpx;
  }
}
</style>
