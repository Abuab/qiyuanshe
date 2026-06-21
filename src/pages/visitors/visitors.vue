<template>
  <view class="visitors-page">
    <!-- 顶部 Tab -->
    <view class="tab-bar">
      <view
        v-for="(tab, index) in tabs"
        :key="index"
        class="tab-item"
        :class="{ active: currentTab === index }"
        @tap="switchTab(index)"
      >
        <text class="tab-text">{{ tab }}</text>
        <view
          v-if="index === 1 && newLikeCount > 0"
          class="tab-red-dot"
        />
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
        <VisitorCard
          v-for="item in list"
          :key="item.id"
          :visitor="item"
          :type="currentTab === 0 ? 'all' : 'like'"
          :current-user-is-vip="isVip"
          @go-vip="goVip"
        />
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <uni-icons type="person" size="200rpx" color="#DDDDDD"></uni-icons>
        <text class="empty-text">暂无访客</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'
import VisitorCard from '@/components/VisitorCard/VisitorCard.vue'

interface Visitor {
  id: number
  nickname: string
  avatar: string
  createdAt: string
  isVip: boolean
}

const userStore = useUserStore()
const isVip = ref(false)
const tabs = ['全部访客', '心动访客']
const currentTab = ref(0)
const list = ref<Visitor[]>([])
const newLikeCount = ref(0)
const isRefreshing = ref(false)

function switchTab(index: number) {
  if (currentTab.value === index) return
  currentTab.value = index
  loadData()
}

async function loadData() {
  try {
    const type = currentTab.value === 0 ? 'all' : 'like'
    const res: any = await request({ url: `/api/users/visitors?type=${type}`, method: 'GET' })
    if (res.code === 0 && res.data) {
      list.value = res.data.list || []
      if (res.data.total !== undefined) {
        newLikeCount.value = currentTab.value === 1 ? res.data.total : newLikeCount.value
      }
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function fetchVipStatus() {
  try {
    isVip.value = userStore.isVip || false
  } catch {}
}

async function onRefresh() {
  isRefreshing.value = true
  await loadData()
  isRefreshing.value = false
}

function goVip() {
  uni.navigateTo({ url: '/pages/vip/vip' })
}

onMounted(() => {
  fetchVipStatus()
  loadData()
})
</script>

<style lang="scss" scoped>
.visitors-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.tab-bar {
  height: 88rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #eeeeee;
  display: flex;
  position: sticky;
  top: 0;
  z-index: 10;
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
  line-height: 88rpx;
  position: relative;
}

.tab-item.active .tab-text {
  color: #ff6b6b;
  font-weight: bold;
}

.tab-red-dot {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #ff4d4f;
  z-index: 2;
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
  height: calc(100vh - 88rpx);
}

.list-area {
  background: #ffffff;
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
