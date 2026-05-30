<template>
  <view class="result-page">
    <view class="result-content">
      <view v-if="status === 'success'" class="success-section">
        <view class="icon-wrapper success">
          <text class="icon">✓</text>
        </view>
        <text class="result-title">支付成功</text>
        <text class="result-desc">您已成为{{ vipName }}会员</text>
        <view v-if="expireTime" class="expire-info">
          <text class="expire-label">有效期至</text>
          <text class="expire-time">{{ expireTime }}</text>
        </view>
      </view>

      <view v-else class="fail-section">
        <view class="icon-wrapper fail">
          <text class="icon">✕</text>
        </view>
        <text class="result-title">支付失败</text>
        <text class="result-desc">{{ failReason || '支付过程中出现问题' }}</text>
      </view>

      <view class="action-buttons">
        <view v-if="status === 'fail'" class="retry-btn" @tap="retryPay">
          <text>重新支付</text>
        </view>

        <view class="back-btn" @tap="goHome">
          <text>返回首页</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const status = ref('success')
const failReason = ref('')
const orderNo = ref('')
const vipName = ref('VIP')
const expireTime = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  status.value = options.status || 'fail'
  failReason.value = options.reason ? decodeURIComponent(options.reason) : ''
  orderNo.value = options.orderNo || ''

  if (status.value === 'success') {
    fetchOrderDetail()
  }
})

const fetchOrderDetail = async () => {
  if (!orderNo.value) return

  try {
    const res = await request({
      url: `/payment/orders/${orderNo.value}`,
      method: 'GET',
    })

    if (res.data) {
      vipName.value = getVipName(res.data.vipLevel)
      expireTime.value = res.data.expireTime
        ? formatDate(res.data.expireTime)
        : ''
    }
  } catch (e) {
    console.error('fetch order detail error', e)
  }
}

const getVipName = (level: number) => {
  const names: Record<number, string> = {
    1: '黄金会员',
    2: '钻石会员',
    3: '至尊VIP',
  }
  return names[level] || 'VIP'
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const retryPay = () => {
  uni.redirectTo({
    url: '/pages/vip/index',
  })
}

const goHome = () => {
  uni.switchTab({
    url: '/pages/index/index',
  })
}
</script>

<style lang="scss" scoped>
.result-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-content {
  width: 100%;
  padding: 60rpx 40rpx;
}

.success-section,
.fail-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 80rpx 40rpx;
  margin-bottom: 40rpx;
}

.icon-wrapper {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;

  &.success {
    background-color: #E8F5E9;
    .icon {
      color: #4CAF50;
    }
  }

  &.fail {
    background-color: #FFEBEE;
    .icon {
      color: #F44336;
    }
  }

  .icon {
    font-size: 80rpx;
    font-weight: bold;
  }
}

.result-title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.result-desc {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 32rpx;
}

.expire-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 40rpx;
  background-color: #FFF0F3;
  border-radius: 16rpx;
}

.expire-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.expire-time {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #FF6B9D;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.retry-btn,
.back-btn {
  height: 96rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 34rpx;
    font-weight: bold;
  }
}

.retry-btn {
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);

  text {
    color: #fff;
  }
}

.back-btn {
  background-color: #fff;
  border: 2rpx solid #ddd;

  text {
    color: #666;
  }
}
</style>
