<template>
  <view class="daily-recommend-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <uni-icons type="arrowleft" size="40rpx" color="#333333"></uni-icons>
      </view>
      <text class="nav-title">每日缘分</text>
      <view class="nav-right">
        <uni-icons type="share" size="40rpx" color="#333333"></uni-icons>
      </view>
    </view>

    <!-- 提示条 -->
    <view class="tip-bar">
      <text class="tip-text">每天0点更新，每人仅推荐3位</text>
    </view>

    <!-- 内容区 -->
    <view class="content-area" v-if="list.length > 0">
      <view
        v-for="(item, index) in list"
        :key="item.id"
        class="user-card"
        :class="{ 'swipe-out': item._removing }"
      >
        <!-- 卡片上半部分：图片轮播 -->
        <view class="card-top">
          <swiper
            v-if="item.photos && item.photos.length > 0"
            class="photo-swiper"
            indicator-dots
            indicator-active-color="#FF6B6B"
            indicator-color="#DDDDDD"
          >
            <swiper-item v-for="(photo, pIndex) in item.photos" :key="pIndex">
              <image
                class="photo-img"
                :src="photo"
                mode="aspectFill"
                lazy-load
              ></image>
            </swiper-item>
          </swiper>
          <view v-else class="no-photo">
            <uni-icons type="image" size="80rpx" color="#DDDDDD"></uni-icons>
          </view>
        </view>

        <!-- 卡片下半部分：信息区 -->
        <view class="card-bottom">
          <text class="nickname">{{ item.nickname }}</text>

          <view class="tags-row">
            <text
              v-for="tag in getTags(item)"
              :key="tag"
              class="tag-item"
            >{{ tag }}</text>
          </view>

          <text class="intro-text">{{ item.intro || item.matchmakerComment || '' }}</text>

          <view class="action-bar">
            <view class="btn-dislike" @tap="onDislike(item, index)">不感兴趣</view>
            <view class="btn-like" @tap="onLike(item, index)">心动</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-text">今日缘分已看完，明天再来吧~</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

interface UserInfo {
  id: number
  nickname: string
  avatar?: string
  age?: number
  height?: number
  education?: string
  occupation?: string
  intro?: string
  matchmakerComment?: string
  photos?: string[]
  _removing?: boolean
}

const list = ref<UserInfo[]>([])

function getTags(user: UserInfo): string[] {
  const tags: string[] = []
  if (user.age) tags.push(`${user.age}岁`)
  if (user.height) tags.push(`${user.height}cm`)
  if (user.education) tags.push(user.education)
  if (user.occupation) tags.push(user.occupation)
  return tags.slice(0, 4)
}

function goBack() {
  uni.navigateBack()
}

async function fetchData() {
  try {
    const res: any = await request({ url: '/users/daily-recommend', method: 'GET' })
    if (res.code === 0 && res.data) {
      list.value = (res.data.list || []).map((item: UserInfo) => ({
        ...item,
        _removing: false,
      }))
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function onDislike(_item: UserInfo, index: number) {
  list.value[index]._removing = true
  setTimeout(() => {
    list.value.splice(index, 1)
  }, 300)
}

async function onLike(item: UserInfo, index: number) {
  uni.showLoading({ title: '心动中...', mask: true })
  try {
    const res: any = await request({ url: `/api/users/${item.id}/like`, method: 'POST' })
    if (res.code === 0 && res.data) {
      if (res.data.isMatched && res.data.matchUser) {
        uni.$emit('match:success', res.data.matchUser)
      } else {
        uni.showToast({ title: '已心动', icon: 'none' })
      }
      // 卡片滑出
      list.value[index]._removing = true
      setTimeout(() => {
        list.value.splice(index, 1)
      }, 300)
    }
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.daily-recommend-page {
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
  position: sticky;
  top: 0;
  z-index: 10;
}

.nav-left,
.nav-right {
  width: 80rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
}

.nav-left {
  justify-content: flex-start;
}

.nav-right {
  justify-content: flex-end;
}

.nav-title {
  font-size: 32rpx;
  color: #333333;
  font-weight: 500;
}

/* ===== 提示条 ===== */
.tip-bar {
  margin: 24rpx;
  padding: 24rpx;
  background: #fff8e1;
  border-radius: 16rpx;
}

.tip-text {
  font-size: 28rpx;
  color: #ff6b6b;
}

/* ===== 内容区 ===== */
.content-area {
  padding: 0 0 48rpx;
}

/* ===== 用户卡片 ===== */
.user-card {
  width: 702rpx;
  margin: 0 24rpx 24rpx;
  height: 880rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: transform 300ms, opacity 300ms;

  &.swipe-out {
    transform: translateX(-100%);
    opacity: 0;
  }
}

/* 卡片上半部分 */
.card-top {
  width: 100%;
  height: 60%;
  background: #f0f0f0;
}

.photo-swiper {
  width: 100%;
  height: 100%;
}

.photo-img {
  width: 100%;
  height: 100%;
}

.no-photo {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

/* 卡片下半部分 */
.card-bottom {
  height: 40%;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
}

.nickname {
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
}

.tags-row {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
}

.tag-item {
  margin-right: 12rpx;
  margin-bottom: 8rpx;
  padding: 8rpx 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #666666;
}

.intro-text {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: #666666;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  flex: 1;
}

/* 操作栏 */
.action-bar {
  margin-top: 24rpx;
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
}

.btn-dislike {
  width: 180rpx;
  height: 72rpx;
  border-radius: 36rpx;
  background: #f5f5f5;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 26rpx;
  color: #999999;
}

.btn-like {
  width: 180rpx;
  height: 72rpx;
  border-radius: 36rpx;
  background: #ff6b6b;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 26rpx;
  color: #ffffff;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 200rpx;
}

.empty-text {
  font-size: 48rpx;
  font-weight: bold;
  color: #999999;
  text-align: center;
}
</style>
