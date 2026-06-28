<template>
  <view class="page">
    <!-- ========== 顶部导航栏 ========== -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">{{ entryName }}</text>
        <view class="nav-right"></view>
      </view>
    </view>

    <!-- ========== 内容区 ========== -->
    <scroll-view
      class="content-scroll"
      scroll-y
      :style="{ paddingTop: navBarTop + 'px' }"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- 页面 Banner -->
      <image
        v-if="pageBanner"
        class="page-banner"
        :src="pageBanner"
        mode="aspectFill"
      />

      <!-- 朋友圈动态卡片 -->
      <view
        v-for="item in list"
        :key="item.id"
        class="feed-card"
      >
        <!-- 头部：头像 + 昵称 -->
        <view class="card-header">
          <image
            class="avatar"
            :src="item.userAvatar || '/static/default-avatar.png'"
            mode="aspectFill"
            @error="onAvatarError($event)"
          />
          <text class="nickname">{{ item.displayNickname || '幸福恋人' }}</text>
        </view>

        <!-- 标题行（粉色大字） -->
        <text class="pink-title">{{ item.title }}</text>

        <!-- 正文内容 -->
        <text v-if="item.storyContent" class="story-text">{{ item.storyContent }}</text>

        <!-- 图片区 -->
        <view v-if="item.photos && item.photos.length > 0" class="photos-area" @tap.stop>
          <!-- 单张图片 -->
          <view v-if="item.photos.length === 1" class="photo-single">
            <image
              class="photo-single-img"
              :src="item.photos[0]"
              mode="widthFix"
              @tap="previewImage(item.photos, 0)"
            />
          </view>

          <!-- 两张图片：2列 -->
          <view v-else-if="item.photos.length === 2" class="photo-grid photo-grid-2">
            <image
              v-for="(p, idx) in item.photos"
              :key="idx"
              class="photo-grid-item"
              :src="p"
              mode="aspectFill"
              @tap="previewImage(item.photos, Number(idx))"
            />
          </view>

          <!-- 三张及以上：3列 -->
          <view v-else class="photo-grid photo-grid-3">
            <image
              v-for="(p, idx) in item.photos"
              :key="idx"
              class="photo-grid-item"
              :src="p"
              mode="aspectFill"
              @tap="previewImage(item.photos, Number(idx))"
            />
          </view>
        </view>

        <!-- 底部日期 -->
        <text class="card-date">{{ item.publishDate || '' }}</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="loadingMore" class="status-tip">
        <text>加载中...</text>
      </view>

      <!-- 没有更多 -->
      <view v-if="noMore && list.length > 0" class="status-tip">
        <text>没有更多了</text>
      </view>

      <!-- 空状态 -->
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text>暂无成功案例</text>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { get } from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import { useSystemStore } from '@/store/system'

const systemStore = useSystemStore()
const entryName = computed(() => systemStore.quickEntryNames?.[3] || '佳偶天成')

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const navBarTop = computed(() => statusBarHeight.value + navBarHeightPx.value)

const list = ref<any[]>([])
const pageBanner = ref('')
const pageNum = ref(1)
const loading = ref(true)
const loadingMore = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)

onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  await fetchList(true)
  fetchPageBanner()
})

async function fetchList(reset = false) {
  if (reset) {
    pageNum.value = 1
    noMore.value = false
    loading.value = true
  }
  try {
    const res = await get<any>('/success-cases', {
      page: pageNum.value,
      limit: 10,
    })
    const items = res?.list || []
    if (reset) {
      list.value = items
    } else {
      list.value = [...list.value, ...items]
    }
    if (items.length < 10) {
      noMore.value = true
    }
  } catch (e) {
    console.error('[SuccessCases] fetchList error:', e)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function onRefresh() {
  isRefreshing.value = true
  fetchList(true).then(() => {
    isRefreshing.value = false
  })
}

async function fetchPageBanner() {
  try {
    const res = await get<any>('/success-cases/banner')
    pageBanner.value = res?.bannerImage || ''
  } catch (e) {
    console.error('[SuccessCases] fetchPageBanner error:', e)
  }
}

function onLoadMore() {
  if (noMore.value || loadingMore.value) return
  loadingMore.value = true
  pageNum.value++
  fetchList()
}

function handleBack() {
  safeNavigateBack()
}

function previewImage(urls: string[], current: number) {
  uni.previewImage({ urls, current })
}

function onAvatarError(e: any) {
  // 头像加载失败时使用默认占位
}


</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #F5F5F5;
}

// ===== 导航 =====
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
.nav-left, .nav-right {
  width: 100rpx;
}
.back-icon {
  font-size: 40rpx;
  color: #333;
  font-weight: 300;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 400;
  color: #333;
}

// ===== 滚动区 =====
.content-scroll {
  height: 100vh;
  box-sizing: border-box;
}

// ===== 页面 Banner =====
.page-banner {
  width: 100%;
  height: 35vh;
  display: block;
}

// ===== 朋友圈动态卡片 =====
.feed-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  margin: 20rpx 24rpx;
}

// 头部：头像 + 昵称
.card-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #f0f0f0;
}
.nickname {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
}

// 粉色标题
.pink-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #FF4D6A;
  line-height: 1.4;
  margin-bottom: 16rpx;
}

// 正文
.story-text {
  display: block;
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
  margin-bottom: 20rpx;
  white-space: pre-wrap;
  word-break: break-all;
}

// ===== 图片区 =====
.photos-area {
  margin-bottom: 24rpx;
}

// 单张图片
.photo-single {
  display: flex;
  justify-content: flex-start;
}
.photo-single-img {
  max-width: 60%;
  border-radius: 12rpx;
  display: block;
}

// 多图网格
.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.photo-grid-2 .photo-grid-item {
  width: calc((100% - 8rpx) / 2);
  height: 0;
  padding-bottom: calc((100% - 8rpx) / 2);
  position: relative;
  overflow: hidden;
  border-radius: 8rpx;
}
.photo-grid-3 .photo-grid-item {
  width: calc((100% - 16rpx) / 3);
  height: 0;
  padding-bottom: calc((100% - 16rpx) / 3);
  position: relative;
  overflow: hidden;
  border-radius: 8rpx;
}
.photo-grid-item {
  display: block;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

// 底部日期
.card-date {
  display: block;
  font-size: 24rpx;
  color: #999;
}

// 状态提示
.status-tip {
  text-align: center;
  padding: 40rpx 0;
  font-size: 26rpx;
  color: #999;
}

// 空状态
.empty-state {
  display: flex;
  justify-content: center;
  padding: 200rpx 0;
  font-size: 28rpx;
  color: #999;
}

// 底部安全区
.bottom-safe {
  height: 60rpx;
}
</style>
