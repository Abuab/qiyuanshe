<template>
  <view class="questionnaire-list-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <uni-icons type="arrowleft" size="40rpx" color="#333333"></uni-icons>
      </view>
      <text class="nav-title">三观匹配</text>
      <view class="nav-right" />
    </view>

    <scroll-view class="page-scroll" scroll-y>
      <view
        v-for="item in list"
        :key="item.id"
        class="q-card"
        @tap="goDetail(item.id)"
      >
        <image
          class="q-cover"
          :src="item.cover"
          mode="aspectFill"
          lazy-load
        />
        <view class="q-info">
          <text class="q-title">{{ item.title }}</text>
          <text class="q-subtitle">{{ item.subtitle }}</text>
          <text class="q-meta">{{ item.questionCount }} 道题 · 已有 {{ item.matchCount }} 人匹配</text>
        </view>
      </view>

      <view v-if="list.length === 0" class="empty-state">
        <uni-icons type="paperplane" size="200rpx" color="#DDDDDD"></uni-icons>
        <text class="empty-text">暂无问卷</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

interface Questionnaire {
  id: number
  title: string
  subtitle: string
  cover: string
  questionCount: number
  matchCount: number
}

const list = ref<Questionnaire[]>([])

function goBack() {
  uni.navigateBack()
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/questionnaire/questionnaire-detail?id=${id}` })
}

async function fetchList() {
  try {
    const res: any = await request({ url: '/questionnaire/list', method: 'GET' })
    list.value = res?.list || res || []
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.questionnaire-list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* ===== 导航栏 ===== */
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

/* ===== 列表 ===== */
.page-scroll {
  height: calc(100vh - 88rpx);
}

.q-card {
  margin: 24rpx;
  padding: 24rpx;
  height: 240rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
}

.q-cover {
  width: 180rpx;
  height: 180rpx;
  border-radius: 16rpx;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

.q-info {
  margin-left: 24rpx;
  flex: 1;
  min-width: 0;
}

.q-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.q-subtitle {
  margin-top: 16rpx;
  display: block;
  font-size: 26rpx;
  color: #666666;
}

.q-meta {
  margin-top: 16rpx;
  display: block;
  font-size: 24rpx;
  color: #999999;
}

/* ===== 空状态 ===== */
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
