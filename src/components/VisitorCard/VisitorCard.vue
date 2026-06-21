<template>
  <view class="visitor-card">
    <!-- 左侧头像 -->
    <view v-if="isBlurred" class="avatar-blur-placeholder">
      <uni-icons type="person" size="48rpx" color="#CCCCCC"></uni-icons>
    </view>
    <image
      v-else
      class="avatar-img"
      :src="avatarUrl"
      mode="aspectFill"
    />

    <!-- 右侧信息区 -->
    <view class="card-info">
      <text class="card-nickname">{{ displayNickname }}</text>
      <text class="card-time">{{ formatTime(visitor.createdAt) }}</text>
      <view v-if="isBlurred" class="blur-tag">
        <text>同城异性</text>
      </view>
    </view>

    <!-- 右侧按钮（仅脱敏时显示） -->
    <view v-if="isBlurred" class="btn-vip" @tap="onGoVip">开通VIP查看</view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getFullImageUrl } from '@/utils/common'

interface VisitorData {
  id: number
  nickname: string
  avatar: string
  createdAt: string
  isVip: boolean
}

const props = defineProps<{
  visitor: VisitorData
  type: 'all' | 'like'
  currentUserIsVip: boolean
}>()

const emit = defineEmits<{
  (e: 'go-vip'): void
}>()

const isBlurred = computed(() => props.type === 'like' && !props.currentUserIsVip)

const avatarUrl = computed(() => getFullImageUrl(props.visitor.avatar) || '/static/default-avatar.png')

const displayNickname = computed(() => {
  if (isBlurred.value) return '一位神秘用户'
  return props.visitor.nickname || '未知用户'
})

function formatTime(t: string) {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function onGoVip() {
  emit('go-vip')
}
</script>

<style lang="scss" scoped>
.visitor-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #f5f5f5;
}

.avatar-img {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: #f5f5f5;
}

.avatar-blur-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #eeeeee;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.card-info {
  margin-left: 24rpx;
  flex: 1;
  min-width: 0;
}

.card-nickname {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.card-time {
  margin-top: 8rpx;
  display: block;
  font-size: 24rpx;
  color: #999999;
}

.blur-tag {
  margin-top: 8rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  background: #f5f5f5;
  display: inline-flex;
  font-size: 22rpx;
  color: #999999;
}

.btn-vip {
  width: 176rpx;
  height: 56rpx;
  border-radius: 28rpx;
  background: #ff6b6b;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24rpx;
  color: #ffffff;
  flex-shrink: 0;
}
</style>
