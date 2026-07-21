<template>
  <view class="block-list-page">
    <!-- 导航栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <text class="back-btn" @tap="handleBack">←</text>
        <text class="nav-title">黑名单</text>
        <text class="nav-placeholder"></text>
      </view>
    </view>

    <scroll-view class="content-scroll" scroll-y :scroll-top="scrollToVal" @scroll="onScroll" :style="{ paddingTop: navTopPx + 'px' }">
      <!-- 空状态 -->
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无拉黑的用户</text>
      </view>

      <!-- 用户列表 -->
      <view v-for="item in list" :key="item.blockedUserId" class="block-item">
        <view class="user-info" @tap="goToUserDetail(item.blockedUserId)">
          <image
            class="user-avatar"
            :src="resolveAvatar(item.avatar)"
            mode="aspectFill"
          />
          <view class="user-detail">
            <view class="user-name-row">
              <text class="user-nickname">{{ item.nickname }}</text>
              <view v-if="item.isRealName" class="realname-tag">
                <text class="realname-icon">✓</text>
                <text>已实名</text>
              </view>
              <view v-else class="unrealname-tag">
                <text>未实名</text>
              </view>
            </view>
            <view class="join-time-row">
              <text class="join-label">加入时间</text>
              <text class="join-time">{{ formatTime(item.createdAt) }}</text>
            </view>
          </view>
        </view>

        <!-- 移出按钮（椭圆形浓粉色） -->
        <view class="remove-btn" @tap="handleRemove(item)">
          <text>移出</text>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>
    <BackTop :show="showBackTop" @click="scrollToTop" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get, del } from '@/utils/request'
import BackTop from '@/components/back-top/back-top.vue'
import { getFullImageUrl } from '@/utils/common'
import { icons } from '@/config/icons'

interface BlockItem {
  id: number
  blockedUserId: number
  nickname: string
  avatar: string
  isRealName: number
  createdAt: string
}

const list = ref<BlockItem[]>([])
const loading = ref(true)
const statusBarHeight = ref(20)
const navTopPx = ref(0)
const scrollToVal = ref(0)
const showBackTop = ref(false)
const onScroll = (e: any) => { showBackTop.value = e.detail.scrollTop > 600 }
const scrollToTop = () => { scrollToVal.value = scrollToVal.value ? 0 : 0.001; showBackTop.value = false }

onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navTopPx.value = (sysInfo.statusBarHeight || 20) + 44
  loadList()
})

const resolveAvatar = (avatar: string) => {
  if (!avatar) return icons.common.defaultAvatar
  if (avatar.startsWith('http') || avatar.startsWith('/static/')) return avatar
  return getFullImageUrl(avatar)
}

const loadList = async () => {
  loading.value = true
  try {
    const res: any = await get('/users/my-blocks')
    if (Array.isArray(res)) {
      list.value = res
    } else if (res?.data && Array.isArray(res.data)) {
      list.value = res.data
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const handleRemove = (item: BlockItem) => {
  uni.showModal({
    title: '提示',
    content: `确定将 ${item.nickname} 移出黑名单？`,
    confirmColor: '#FF4081',
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/users/${item.blockedUserId}/block`)
          list.value = list.value.filter(b => b.blockedUserId !== item.blockedUserId)
          uni.showToast({ title: '已移出', icon: 'success' })
        } catch {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

const goToUserDetail = (userId: number) => {
  uni.navigateTo({ url: `/pages/user-detail/index?id=${userId}` })
}

const handleBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.block-list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
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
}

.block-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  margin-bottom: 2rpx;
  padding: 24rpx 32rpx;
}

.user-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #f5f5f5;
  flex-shrink: 0;
  margin-right: 16rpx;
}

.user-detail {
  flex: 1;
  min-width: 0;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 6rpx;
}

.user-nickname {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.realname-tag {
  display: flex;
  align-items: center;
  background: #E8F5E9;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;

  text {
    font-size: 20rpx;
    color: #4CAF50;
  }
}

.realname-icon {
  color: #4CAF50;
  font-size: 18rpx;
  margin-right: 4rpx;
}

.unrealname-tag {
  display: flex;
  align-items: center;
  background: #FFF3E0;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;

  text {
    font-size: 20rpx;
    color: #FF9800;
  }
}

.join-time-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.join-label {
  font-size: 22rpx;
  color: #999;
}

.join-time {
  font-size: 22rpx;
  color: #666;
}

.remove-btn {
  flex-shrink: 0;
  padding: 12rpx 32rpx;
  background: #FF4081;
  border-radius: 50rpx;

  text {
    font-size: 26rpx;
    color: #fff;
  }
}

.empty-state {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;

  text {
    font-size: 26rpx;
    color: #999;
  }
}

.bottom-safe {
  height: 60rpx;
}
</style>
