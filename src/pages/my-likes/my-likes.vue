<template>
  <view class="my-likes-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <uni-icons type="arrowleft" size="40rpx" color="#333333"></uni-icons>
      </view>
      <text class="nav-title">我的喜欢</text>
      <view class="nav-right" />
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view
        v-for="(tab, index) in tabs"
        :key="index"
        class="tab-item"
        :class="{ active: currentTab === index }"
        @tap="switchTab(index)"
      >
        <text class="tab-text">{{ tab }}</text>
        <view v-if="currentTab === index" class="tab-underline" />
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view
      class="content-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length > 0" class="list-area">
        <view
          v-for="item in list"
          :key="item.id"
          class="like-card"
        >
          <image
            class="like-avatar"
            :src="item.avatar || '/static/default-avatar.png'"
            mode="aspectFill"
          />
          <view class="like-info">
            <text class="like-nickname">{{ item.nickname }}</text>
            <text class="like-meta" v-if="item.age || item.location">
              {{ [item.age ? item.age + '岁' : '', item.location || ''].filter(Boolean).join(' · ') }}
            </text>
          </view>
          <view class="like-actions">
            <view
              v-if="currentTab === 1 && item.isMutual"
              class="action-btn chat-btn"
              @tap="goChat(item)"
            >发消息</view>
            <view
              v-else-if="currentTab === 1"
              class="action-btn like-back-btn"
              @tap="handleLikeBack(item)"
            >回喜欢</view>
            <view
              v-if="currentTab === 2"
              class="action-btn chat-btn"
              @tap="goChat(item)"
            >发消息</view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <uni-icons type="heart" size="200rpx" color="#DDDDDD"></uni-icons>
        <text class="empty-text">{{ emptyText }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import request from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'

interface LikeUser {
  id: number
  nickname: string
  avatar: string
  location?: string
  age?: number
  gender?: number
  createdAt?: string
  isMutual?: boolean
}

const tabs = ['我喜欢的', '喜欢我的', '互相喜欢']
const currentTab = ref(0)
const list = ref<LikeUser[]>([])
const isRefreshing = ref(false)

const emptyText = computed(() => {
  const texts = ['还没有喜欢的人哦', '暂时没有人喜欢你', '还没有互相喜欢的人']
  return texts[currentTab.value] || '暂无数据'
})

function goBack() {
  uni.navigateBack()
}

function switchTab(index: number) {
  if (currentTab.value === index) return
  currentTab.value = index
  loadData()
}

async function loadData() {
  try {
    const type = ['liked', 'likedBy', 'mutual'][currentTab.value]
    const res: any = await request({ url: `/users/likes?type=${type}`, method: 'GET' })
    const rawList = res?.list || res || []
    list.value = rawList.map((item: any) => ({
      ...item,
      avatar: getFullImageUrl(item.avatar),
    }))
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function onRefresh() {
  isRefreshing.value = true
  await loadData()
  isRefreshing.value = false
}

async function handleLikeBack(item: LikeUser) {
  try {
    await request({ url: `/users/${item.id}/like`, method: 'POST' })
    uni.showToast({ title: '已回喜欢', icon: 'success' })
    loadData()
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function goChat(item: LikeUser) {
  const name = encodeURIComponent(item.nickname)
  const avatar = encodeURIComponent(item.avatar || '')
  uni.navigateTo({
    url: `/pages/chat/index?userId=${item.id}&nickname=${name}&avatar=${avatar}`,
  })
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.my-likes-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nav-bar {
  height: 88rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #eeeeee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
}

.nav-left,
.nav-right {
  width: 80rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
}

.nav-left { justify-content: flex-start; }

.nav-title {
  font-size: 32rpx;
  color: #333333;
  font-weight: 500;
}

.tab-bar {
  height: 88rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #eeeeee;
  display: flex;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.tab-text {
  font-size: 28rpx;
  color: #999999;
}

.tab-item.active .tab-text {
  color: #ff6b6b;
  font-weight: bold;
}

.tab-underline {
  width: 40rpx;
  height: 4rpx;
  background: #ff6b6b;
  border-radius: 2rpx;
  position: absolute;
  bottom: 4rpx;
}

.content-scroll {
  height: calc(100vh - 176rpx);
}

.list-area {
  background: #ffffff;
}

.like-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.like-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: #f5f5f5;
}

.like-info {
  margin-left: 24rpx;
  flex: 1;
  min-width: 0;
}

.like-nickname {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.like-meta {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #999999;
}

.like-actions {
  flex-shrink: 0;
}

.action-btn {
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  font-size: 24rpx;
}

.like-back-btn {
  background: #fff0f3;
  color: #ff6b6b;
  border: 1rpx solid #ff6b6b;
}

.chat-btn {
  background: #ff6b6b;
  color: #ffffff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.empty-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: #999999;
}
</style>
