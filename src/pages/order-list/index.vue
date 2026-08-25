<template>
  <view class="order-list-page">
    <!-- 加载中 -->
    <view v-if="loading && orders.length === 0" class="state-wrap">
      <text class="state-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="orders.length === 0" class="state-wrap">
      <text class="state-text">暂无订单</text>
    </view>

    <!-- 订单列表 -->
    <view v-else class="order-list">
      <view v-for="order in orders" :key="order.id" class="order-item">
        <view class="order-header">
          <text class="order-no">{{ order.orderNo }}</text>
          <text class="order-status" :class="statusClass(order.status)">{{ statusText(order.status) }}</text>
        </view>

        <view class="order-body">
          <text class="order-name">{{ order.vipName || '会员套餐' }}</text>
          <text class="order-amount">¥{{ amountText(order.amount) }}</text>
        </view>

        <view class="order-footer">
          <text class="order-time">下单时间 {{ formatDateTime(order.createdAt) }}</text>
          <text v-if="order.status === 1 && order.expireTime" class="order-expire">
            有效期至 {{ formatDate(order.expireTime) }}
          </text>
        </view>
      </view>

      <!-- 触底加载状态 -->
      <view v-if="orders.length > 0" class="load-more">
        <text class="load-more-text">{{ loadingMore ? '加载中...' : (hasMore ? '上拉加载更多' : '没有更多了') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import { get } from '@/utils/request'
import { formatDate, formatDateTime } from '@/utils/common'
import { logger } from '@/utils/logger'
import { useUserStore } from '@/store/user'

interface OrderItem {
  id: number
  orderNo: string
  vipLevel: number
  vipName: string
  amount: number
  status: number
  paidAt: string | null
  expireTime: string | null
  createdAt: string
}

const userStore = useUserStore()
const orders = ref<OrderItem[]>([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)

const PAGE_SIZE = 20

const statusText = (status: number): string => {
  const map: Record<number, string> = {
    0: '待支付',
    1: '已支付',
    2: '已退款',
    3: '已取消',
  }
  return map[status] ?? '未知'
}

const statusClass = (status: number): string => {
  if (status === 1) return 'status-paid'
  if (status === 0) return 'status-pending'
  return 'status-closed'
}

const amountText = (amount: number): string => {
  const num = Number(amount)
  return Number.isFinite(num) ? num.toFixed(2) : '0.00'
}

const fetchOrders = async (reset: boolean) => {
  if (!userStore.isLoggedIn) {
    loading.value = false
    return
  }

  if (reset) {
    page.value = 1
    hasMore.value = true
  }

  const currentPage = page.value
  if (reset) {
    loading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const res: any = await get('/payment/orders', {
      page: currentPage,
      limit: PAGE_SIZE,
    })

    const list = (res?.list || []) as OrderItem[]
    total.value = Number(res?.total || 0)

    if (reset) {
      orders.value = list
    } else {
      orders.value = orders.value.concat(list)
    }

    hasMore.value = orders.value.length < total.value
  } catch (e: any) {
    logger.error('[order-list] 加载订单失败:', e?.message || e)
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

onLoad(() => {
  fetchOrders(true)
})

onReachBottom(() => {
  if (!loadingMore.value && hasMore.value && !loading.value) {
    page.value += 1
    fetchOrders(false)
  }
})

onPullDownRefresh(() => {
  fetchOrders(true).finally(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<style lang="scss" scoped>
.order-list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
  box-sizing: border-box;
}

.state-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.state-text {
  font-size: 28rpx;
  color: #999;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.order-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.order-no {
  font-size: 24rpx;
  color: #999;
}

.order-status {
  font-size: 26rpx;
  font-weight: bold;

  &.status-pending {
    color: #FF9800;
  }

  &.status-paid {
    color: #4CAF50;
  }

  &.status-closed {
    color: #999;
  }
}

.order-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.order-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.order-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: #FF6B9D;
}

.order-footer {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.order-time,
.order-expire {
  font-size: 24rpx;
  color: #999;
}

.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
}

.load-more-text {
  font-size: 24rpx;
  color: #bbb;
}
</style>
