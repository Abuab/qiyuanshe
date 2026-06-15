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
            :src="getTabbarIcon(tab.name, currentPath === tab.pagePath)"
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
import { useIcon } from '@/composables/useIcon'

interface TabItem {
  label: string
  pagePath: string
  name: 'home' | 'dynamic' | 'vip' | 'message' | 'my'
}

const { getTabbarIcon } = useIcon()

const tabs: TabItem[] = [
  { label: '首页', pagePath: '/pages/index/index', name: 'home' },
  { label: '动态', pagePath: '/pages/dynamic/index', name: 'dynamic' },
  { label: '会员', pagePath: '/pages/vip/index', name: 'vip' },
  { label: '消息', pagePath: '/pages/message-list/index', name: 'message' },
  { label: '我的', pagePath: '/pages/my/index', name: 'my' },
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
  height: 120rpx;
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
  padding-top: 10rpx;
}

.icon-wrapper {
  position: relative;
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-icon {
  width: 52rpx;
  height: 52rpx;
  display: block;
}

.badge {
  position: absolute;
  top: -6rpx;
  right: -10rpx;
  min-width: 34rpx;
  height: 34rpx;
  padding: 0 8rpx;
  background-color: #ff4d4f;
  color: #fff;
  font-size: 20rpx;
  font-weight: 500;
  border-radius: 17rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  white-space: nowrap;
}

.tab-text {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;

  &.active {
    color: #FF6B9D;
    font-weight: 500;
  }
}
</style>
