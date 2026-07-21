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
      :scroll-top="scrollToVal" @scroll="onScroll"
      :style="{ paddingTop: navBarTop + 'px' }"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- 页面顶部装饰（纯 CSS 绘制「我们脱单了」氛围区，替代原 Banner 图片） -->
      <view class="hero">
        <!-- 背景模糊圆点 -->
        <view class="bg-blob bg-blob-1"></view>
        <view class="bg-blob bg-blob-2"></view>
        <view class="bg-blob bg-blob-3"></view>
        <!-- 中央更大的模糊光晕（z 更低） -->
        <view class="halo-outer"></view>
        <!-- 中央半透明大圆 -->
        <view class="halo-inner"></view>

        <!-- 黄色五角星 -->
        <view class="deco star-1"><view class="star-shape"></view></view>
        <view class="deco star-2"><view class="star-shape"></view></view>
        <view class="deco star-3"><view class="star-shape"></view></view>
        <view class="deco star-4"><view class="star-shape"></view></view>

        <!-- 粉色小花 -->
        <view class="deco flower-p1"><view class="flower flower-pink">
          <view class="petal petal-0"></view><view class="petal petal-1"></view><view class="petal petal-2"></view><view class="petal petal-3"></view><view class="petal petal-4"></view><view class="flower-core"></view>
        </view></view>
        <view class="deco flower-p2"><view class="flower flower-pink">
          <view class="petal petal-0"></view><view class="petal petal-1"></view><view class="petal petal-2"></view><view class="petal petal-3"></view><view class="petal petal-4"></view><view class="flower-core"></view>
        </view></view>
        <view class="deco flower-p3"><view class="flower flower-pink">
          <view class="petal petal-0"></view><view class="petal petal-1"></view><view class="petal petal-2"></view><view class="petal petal-3"></view><view class="petal petal-4"></view><view class="flower-core"></view>
        </view></view>
        <view class="deco flower-p4"><view class="flower flower-pink">
          <view class="petal petal-0"></view><view class="petal petal-1"></view><view class="petal petal-2"></view><view class="petal petal-3"></view><view class="petal petal-4"></view><view class="flower-core"></view>
        </view></view>
        <view class="deco flower-p5"><view class="flower flower-pink">
          <view class="petal petal-0"></view><view class="petal petal-1"></view><view class="petal petal-2"></view><view class="petal petal-3"></view><view class="petal petal-4"></view><view class="flower-core"></view>
        </view></view>

        <!-- 紫色小花 -->
        <view class="deco flower-a"><view class="flower flower-purple">
          <view class="petal petal-0"></view><view class="petal petal-1"></view><view class="petal petal-2"></view><view class="petal petal-3"></view><view class="petal petal-4"></view><view class="flower-core"></view>
        </view></view>
        <view class="deco flower-b"><view class="flower flower-purple">
          <view class="petal petal-0"></view><view class="petal petal-1"></view><view class="petal petal-2"></view><view class="petal petal-3"></view><view class="petal petal-4"></view><view class="flower-core"></view>
        </view></view>
        <view class="deco flower-c"><view class="flower flower-purple">
          <view class="petal petal-0"></view><view class="petal petal-1"></view><view class="petal petal-2"></view><view class="petal petal-3"></view><view class="petal petal-4"></view><view class="flower-core"></view>
        </view></view>

        <!-- 中央文字 -->
        <view class="hero-center">
          <text class="hero-title">我们脱单了</text>
          <view class="hero-subline">
            <view class="hero-line"></view>
            <text class="hero-en">We fell in love</text>
          </view>
        </view>
      </view>

      <!-- 白色卡片（负margin覆盖装饰区底部，所有内容在一个卡片内） -->
      <view v-if="list.length > 0" class="info-card">
        <view
          v-for="(item, index) in list"
          :key="item.id"
        >
          <!-- 分割线（第一条不显示） -->
          <view v-if="index > 0" class="item-divider"></view>

          <!-- 单条动态内容 -->
          <view class="item-section">
            <!-- 头部：头像 + 昵称 -->
            <view class="card-header">
              <image
                class="avatar"
                :src="item.userAvatar || icons.common.defaultAvatar"
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
              <view v-if="item.photos.length === 1" class="photo-single">
                <image class="photo-single-img" :src="item.photos[0]" mode="widthFix" @tap="previewImage(item.photos, 0)" />
              </view>
              <view v-else-if="item.photos.length === 2" class="photo-grid photo-grid-2">
                <image v-for="(p, idx) in item.photos" :key="idx" class="photo-grid-item" :src="p" mode="aspectFill" @tap="previewImage(item.photos, Number(idx))" />
              </view>
              <view v-else class="photo-grid photo-grid-3">
                <image v-for="(p, idx) in item.photos" :key="idx" class="photo-grid-item" :src="p" mode="aspectFill" @tap="previewImage(item.photos, Number(idx))" />
              </view>
            </view>

            <!-- 底部日期 -->
            <text class="card-date">{{ item.publishDate || '' }}</text>
          </view>
        </view>
      </view>

      <!-- 无内容时的占位 -->
      <view v-else-if="!loading" class="info-card-empty">
        <view class="status-tip"><text>暂无成功案例</text></view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loadingMore && list.length > 0" class="status-tip">
        <text>加载中...</text>
      </view>

      <!-- 没有更多 -->
      <view v-if="noMore && list.length > 0" class="status-tip">
        <text>没有更多了</text>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>
    <BackTop :show="showBackTop" @click="scrollToTop" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { get } from '@/utils/request'
import { safeNavigateBack } from '@/utils/navigate'
import { getFullImageUrl } from '@/utils/common'
import { icons } from '@/config/icons'
import { useSystemStore } from '@/store/system'
import BackTop from '@/components/back-top/back-top.vue'

const systemStore = useSystemStore()
const entryName = computed(() => systemStore.quickEntryNames?.[3] || '佳偶天成')

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)
const navBarTop = computed(() => statusBarHeight.value + navBarHeightPx.value)

const list = ref<any[]>([])
const pageNum = ref(1)
const loading = ref(true)
const loadingMore = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)

const scrollToVal = ref(0)
const showBackTop = ref(false)
const onScroll = (e: any) => { showBackTop.value = e.detail.scrollTop > 600 }
const scrollToTop = () => { scrollToVal.value = scrollToVal.value ? 0 : 0.001; showBackTop.value = false }

onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  await fetchList(true)
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
    const items = (res?.list || []).map((item: any) => ({
      ...item,
      userAvatar: getFullImageUrl(item.userAvatar),
      photos: (item.photos || []).map((p: string) => getFullImageUrl(p)),
    }))
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

async function onLoadMore() {
  if (noMore.value || loadingMore.value) return
  loadingMore.value = true
  pageNum.value++
  await fetchList()
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

// ===== 页面顶部装饰 hero（纯 CSS「我们脱单了」） =====
.hero {
  position: relative;
  width: 100%;
  height: 600rpx;
  background: linear-gradient(160deg, #4A148C 0%, #6A1B9A 40%, #8E24AA 100%);
  overflow: hidden;
}

// 背景模糊圆点
.bg-blob {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  filter: blur(40rpx);
  z-index: 0;
}
.bg-blob-1 {
  width: 200rpx;
  height: 200rpx;
  top: 8%;
  left: -40rpx;
}
.bg-blob-2 {
  width: 160rpx;
  height: 160rpx;
  bottom: 10%;
  right: -30rpx;
}
.bg-blob-3 {
  width: 120rpx;
  height: 120rpx;
  top: 60%;
  left: 30%;
}

// 中央更大的模糊光晕
.halo-outer {
  position: absolute;
  width: 600rpx;
  height: 600rpx;
  left: 50%;
  top: 15%;
  transform: translateX(-50%);
  border-radius: 50%;
  background: rgba(186, 104, 200, 0.2);
  filter: blur(60rpx);
  z-index: 1;
}

// 中央半透明大圆
.halo-inner {
  position: absolute;
  width: 500rpx;
  height: 500rpx;
  left: 50%;
  top: 15%;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 60%, transparent 100%);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  z-index: 2;
}

// 装饰元素通用：绝对定位 + 浮动动画
.deco {
  position: absolute;
  z-index: 4;
  animation: hero-float 3.5s ease-in-out infinite alternate;
}

@keyframes hero-float {
  from { transform: translateY(0); }
  to { transform: translateY(-10rpx); }
}

// ===== 黄色五角星 =====
.star-shape {
  width: 100%;
  height: 100%;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}
.star-1 {
  width: 40rpx;
  height: 40rpx;
  top: 22%;
  right: 15%;
  animation-delay: 0s;
  .star-shape {
    background: #FFD700;
    transform: rotate(15deg);
    filter: drop-shadow(0 0 8rpx rgba(255, 215, 0, 0.6));
  }
}
.star-2 {
  width: 24rpx;
  height: 24rpx;
  top: 28%;
  left: 18%;
  animation-delay: 0.6s;
  .star-shape {
    background: #FFE082;
    transform: rotate(-10deg);
  }
}
.star-3 {
  width: 20rpx;
  height: 20rpx;
  bottom: 35%;
  right: 22%;
  animation-delay: 1.2s;
  .star-shape {
    background: #FFD700;
    transform: rotate(20deg);
  }
}
.star-4 {
  width: 16rpx;
  height: 16rpx;
  bottom: 40%;
  left: 12%;
  animation-delay: 1.8s;
  .star-shape {
    background: #FFF59D;
  }
}

// ===== 小花（粉/紫通用结构） =====
.flower {
  position: relative;
  width: 28rpx;
  height: 28rpx;
}
.petal {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10rpx;
  height: 14rpx;
  border-radius: 50%;
}
.petal-0 { transform: translate(-50%, -50%) rotate(0deg) translateY(-7rpx); }
.petal-1 { transform: translate(-50%, -50%) rotate(72deg) translateY(-7rpx); }
.petal-2 { transform: translate(-50%, -50%) rotate(144deg) translateY(-7rpx); }
.petal-3 { transform: translate(-50%, -50%) rotate(216deg) translateY(-7rpx); }
.petal-4 { transform: translate(-50%, -50%) rotate(288deg) translateY(-7rpx); }
.flower-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%);
  z-index: 1;
}
.flower-pink .petal { background: #FF8FAB; }
.flower-purple .petal { background: #CE93D8; }

// 粉花位置与尺寸（用 scale 控制大小，基准 28rpx）
.flower-p1 { top: 32%; left: 20%; animation-delay: 0.2s; .flower { transform: scale(1); } }        // 28rpx
.flower-p2 { top: 30%; right: 25%; animation-delay: 0.8s; .flower { transform: scale(0.86); } }     // 24rpx
.flower-p3 { top: 55%; left: 16%; animation-delay: 1.4s; .flower { transform: scale(0.71); } }      // 20rpx
.flower-p4 { top: 52%; right: 20%; animation-delay: 2s; .flower { transform: scale(0.86); } }       // 24rpx
.flower-p5 { top: 60%; left: 45%; animation-delay: 2.6s; .flower { transform: scale(0.57); } }      // 16rpx

// 紫花位置与尺寸
.flower-a { top: 38%; left: 14%; animation-delay: 0.5s; .flower { transform: scale(0.71); } }       // 20rpx
.flower-b { top: 48%; right: 18%; animation-delay: 1.1s; .flower { transform: scale(0.64); } }      // 18rpx
.flower-c { top: 58%; left: 28%; animation-delay: 1.7s; .flower { transform: scale(0.57); } }       // 16rpx

// ===== 中央文字 =====
.hero-center {
  position: absolute;
  top: 30%;
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hero-title {
  font-size: 72rpx;
  font-weight: bold;
  letter-spacing: 4rpx;
  color: #FFE4EC;
  text-shadow: 0 4rpx 20rpx rgba(255, 182, 193, 0.4);
}
.hero-subline {
  display: flex;
  align-items: center;
  margin-top: 30rpx;
}
.hero-line {
  width: 200rpx;
  height: 1rpx;
  background: rgba(255, 255, 255, 0.6);
}
.hero-en {
  margin-left: 16rpx;
  font-size: 20rpx;
  font-style: italic;
  letter-spacing: 2rpx;
  color: rgba(255, 255, 255, 0.5);
}

// ===== 白色资料卡片（负margin覆盖Banner底部，参考用户详情页） =====
.info-card {
  background: #fff;
  border-radius: 33rpx 33rpx 0 0;
  margin: -36rpx 0 0;
  padding: 24rpx 30rpx 20rpx;
  position: relative;
  z-index: 10;
}

.info-card-empty {
  background: #fff;
  border-radius: 33rpx 33rpx 0 0;
  margin: -36rpx 0 0;
  padding: 60rpx 30rpx;
  position: relative;
  z-index: 10;
}

// 分割线
.item-divider {
  height: 1rpx;
  background: #EEEEEE;
  margin: 24rpx 0;
}

// 单条内容区域
.item-section {
  // 内容上下间距由分割线控制
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
