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
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { icons } from '@/config/icons'

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
    defaultIcon: icons.tabbar.home.default,
    activeIcon: icons.tabbar.home.active,
    name: 'home',
  },
  {
    label: '动态',
    pagePath: '/pages/dynamic/index',
    defaultIcon: icons.tabbar.dynamic.default,
    activeIcon: icons.tabbar.dynamic.active,
    name: 'dynamic',
  },
  {
    label: '会员',
    pagePath: '/pages/vip/index',
    defaultIcon: icons.tabbar.vip.default,
    activeIcon: icons.tabbar.vip.active,
    name: 'vip',
  },
  {
    label: '消息',
    pagePath: '/pages/message-list/index',
    defaultIcon: icons.tabbar.message.default,
    activeIcon: icons.tabbar.message.active,
    name: 'message',
  },
  {
    label: '我的',
    pagePath: '/pages/my/index',
    defaultIcon: icons.tabbar.my.default,
    activeIcon: icons.tabbar.my.active,
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

  // 使用新版 API 获取安全区域信息
  const windowInfo = uni.getWindowInfo()
  safeAreaBottom.value = windowInfo.safeAreaInsets?.bottom || 0
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
  height: 110rpx;
  box-sizing: content-box;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  position: relative;
}

.icon-wrapper {
  position: relative;
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.tab-icon {
  width: 44rpx;
  height: 44rpx;
  display: block;
}

.badge {
  position: absolute;
  top: -6rpx;
  right: -10rpx;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  background-color: #ff4d4f;
  color: #fff;
  font-size: 18rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.tab-text {
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;

  &.active {
    color: #FF6B9D;
    font-weight: 500;
  }
}
</style>
