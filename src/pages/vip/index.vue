<template>
  <view class="vip-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">开通会员</view>
      <view class="nav-right"></view>
    </view>

    <scroll-view class="page-content" scroll-y>
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
              <text class="benefit-desc">VIP尊贵标识</text>
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

      <view class="packages-section">
        <text class="section-title">选择套餐</text>

        <scroll-view class="packages-scroll" scroll-x>
          <view
            v-for="pkg in packages"
            :key="pkg.level"
            class="package-card"
            :class="{ selected: selectedLevel === pkg.level }"
            @tap="selectPackage(pkg)"
          >
            <view class="package-tag" :class="pkg.tagClass">
              <text>{{ pkg.tag }}</text>
            </view>

            <text class="package-name">{{ pkg.name }}</text>

            <view class="package-price">
              <text class="price-symbol">¥</text>
              <text class="price-value">{{ pkg.price }}</text>
            </view>

            <text class="package-original">¥{{ pkg.original }}</text>

            <view v-if="pkg.discount" class="package-save">
              <text>省¥{{ pkg.discount }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="payment-section">
        <text class="section-title">支付方式</text>

        <view class="payment-method">
          <view class="method-item selected">
            <image class="wechat-icon" src="/static/wechat-pay.png" mode="aspectFit" />
            <text class="method-name">微信支付</text>
            <view class="check-icon">✓</view>
          </view>
        </view>
      </view>

      <view class="agreement-section">
        <text class="agreement-text">开通即表示同意</text>
        <text class="agreement-link" @tap="showAgreement">《会员服务协议》</text>
      </view>
    </scroll-view>

    <view class="fixed-bottom">
      <view class="submit-btn" @tap="handleSubmit">
        <text>立即开通</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'

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

    uni.hideLoading()

    if (res.payParams) {
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
  } catch (e: any) {
    uni.hideLoading()
    console.error('create order error', e)

    if (e.statusCode === 401) {
      uni.showToast({ title: '请先登录', icon: 'none' })
    } else {
      uni.showToast({ title: '创建订单失败', icon: 'none' })
    }
  }
}

const showAgreement = () => {
  uni.navigateTo({
    url: '/pages/agreement/index?type=vip',
  })
}

const handleBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.vip-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background-color: #fff;
  z-index: 100;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
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

.page-content {
  height: calc(100vh - 88rpx - 140rpx);
  padding-top: 108rpx;
}

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
  margin-bottom: 32rpx;
}

.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.benefit-item {
  display: flex;
  align-items: center;
}

.benefit-icon {
  width: 80rpx;
  height: 80rpx;
  background-color: #FFF0F3;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-right: 20rpx;
}

.benefit-text {
  flex: 1;
}

.benefit-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 4rpx;
}

.benefit-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.packages-section {
  padding: 32rpx;
  background-color: #fff;
  margin-bottom: 16rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}

.packages-scroll {
  display: flex;
  white-space: nowrap;
}

.package-card {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 220rpx;
  padding: 24rpx 16rpx;
  background-color: #fff;
  border: 4rpx solid #eee;
  border-radius: 16rpx;
  margin-right: 20rpx;
  position: relative;
  transition: all 0.3s;

  &.selected {
    border-color: #FF6B9D;
    background-color: #FFF0F3;
    transform: scale(1.05);
  }
}

.package-tag {
  position: absolute;
  top: -12rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 20rpx;

  text {
    color: #fff;
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

.package-name {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  margin-top: 8rpx;
}

.package-price {
  display: flex;
  align-items: baseline;
  margin-bottom: 8rpx;
}

.price-symbol {
  font-size: 24rpx;
  color: #FF6B9D;
}

.price-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #FF6B9D;
}

.package-original {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
  margin-bottom: 8rpx;
}

.package-save {
  padding: 4rpx 12rpx;
  background-color: #FF6B9D;
  border-radius: 8rpx;

  text {
    font-size: 20rpx;
    color: #fff;
  }
}

.payment-section {
  padding: 32rpx;
  background-color: #fff;
  margin-bottom: 16rpx;
}

.payment-method {
  background-color: #fff;
  border-radius: 16rpx;
}

.method-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border: 2rpx solid #eee;
  border-radius: 16rpx;

  &.selected {
    border-color: #FF6B9D;
    background-color: #FFF0F3;
  }
}

.wechat-icon {
  width: 48rpx;
  height: 48rpx;
  margin-right: 16rpx;
}

.method-name {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.check-icon {
  width: 40rpx;
  height: 40rpx;
  background-color: #FF6B9D;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 24rpx;
    color: #fff;
  }
}

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

.fixed-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.submit-btn {
  height: 96rpx;
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 34rpx;
    font-weight: bold;
    color: #fff;
  }
}
</style>
