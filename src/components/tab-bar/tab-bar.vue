<template>
  <view class="tab-bar">
    <view class="tab-bar-inner" :style="{ paddingBottom: safeAreaBottom + 'px' }">
      <view
        v-for="tab in tabs"
        :key="tab.pagePath"
        class="tab-item"
        @tap="switchTab(tab.pagePath)"
      >
        <view class="icon-wrapper">
          <image
            class="tab-icon"
            :src="currentPath === tab.pagePath ? tab.activeIcon : tab.defaultIcon"
            mode="aspectFit"
          ></image>
          <view v-if="tab.name === 'message' && unreadCount > 0" class="badge">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </view>
        </view>
        <text class="tab-text" :class="{ active: currentPath === tab.pagePath }">
          {{ tab.name === 'message' ? '消息' : tab.label }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'

interface TabItem {
  label: string
  pagePath: string
  defaultIcon: string
  activeIcon: string
  name: string
}

const tabs: TabItem[] = [
  {
    label: '首页',
    pagePath: '/pages/index/index',
    defaultIcon: '/static/tabbar/tab-home-default.png',
    activeIcon: '/static/tabbar/tab-home-active.png',
    name: 'home',
  },
  {
    label: '动态',
    pagePath: '/pages/questions/index',
    defaultIcon: '/static/tabbar/tab-dynamic-default.png',
    activeIcon: '/static/tabbar/tab-dynamic-active.png',
    name: 'dynamic',
  },
  {
    label: '会员',
    pagePath: '/pages/vip/index',
    defaultIcon: '/static/tabbar/tab-vip-default.png',
    activeIcon: '/static/tabbar/tab-vip-active.png',
    name: 'vip',
  },
  {
    label: '消息',
    pagePath: '/pages/message-list/index',
    defaultIcon: '/static/tabbar/tab-message-default.png',
    activeIcon: '/static/tabbar/tab-message-active.png',
    name: 'message',
  },
  {
    label: '我的',
    pagePath: '/pages/my/index',
    defaultIcon: '/static/tabbar/tab-my-default.png',
    activeIcon: '/static/tabbar/tab-my-active.png',
    name: 'my',
  },
]

const currentPath = ref('/pages/index/index')
const unreadCount = ref(0)
const safeAreaBottom = ref(0)

const updateCurrentTab = () => {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    const currentPage = pages[pages.length - 1]
    currentPath.value = `/${currentPage.route}`
  }
}

const switchTab = (pagePath: string) => {
  if (currentPath.value === pagePath) return

  uni.switchTab({
    url: pagePath,
  })
}

const loadUnreadCount = () => {
  const messageCount = uni.getStorageSync('unreadMessageCount')
  unreadCount.value = messageCount || 0
}

onMounted(() => {
  updateCurrentTab()
  loadUnreadCount()

  const systemInfo = uni.getSystemInfoSync()
  safeAreaBottom.value = systemInfo.safeAreaInsets?.bottom || 0
})

onShow(() => {
  updateCurrentTab()
  loadUnreadCount()
})

defineExpose({
  updateUnreadCount: (count: number) => {
    unreadCount.value = count
    uni.setStorageSync('unreadMessageCount', count)
  },
})
</script>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  border-top: 1px solid #eee;
  z-index: 999;
}

.tab-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 100rpx;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
}

.icon-wrapper {
  position: relative;
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 4rpx;
}

.tab-icon {
  width: 48rpx;
  height: 48rpx;
}

.badge {
  position: absolute;
  top: -8rpx;
  right: -16rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  background-color: #ff4d4f;
  color: #fff;
  font-size: 20rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateX(50%);
}

.tab-text {
  font-size: 20rpx;
  color: #999;

  &.active {
    color: #FF6B9D;
  }
}
</style>
