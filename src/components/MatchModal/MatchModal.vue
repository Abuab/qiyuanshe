<template>
  <view v-if="visible" class="match-modal-mask" @tap="close">
    <view class="match-modal-content" @tap.stop>
      <view class="close-btn" @tap="close">
        <uni-icons type="closeempty" size="40rpx" color="#999999"></uni-icons>
      </view>

      <view class="title">互相心动！</view>

      <view class="avatar-area">
        <image class="avatar-img" :src="currentAvatar" mode="aspectFill" />
        <view class="heart-anim">
          <uni-icons type="heart-filled" size="48rpx" color="#FF6B6B"></uni-icons>
        </view>
        <image class="avatar-img" :src="matchUser?.avatar || '/static/default-avatar.png'" mode="aspectFill" />
      </view>

      <view class="tip-text">你们互相喜欢了对方，现在可以无限畅聊啦</view>

      <view class="btn-area">
        <view class="btn-chat" @tap="goChat">立即聊天</view>
        <view class="btn-later" @tap="close">再看看</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface MatchUser {
  id: number
  nickname: string
  avatar?: string
}

const visible = ref(false)
const matchUser = ref<MatchUser | null>(null)
const currentAvatar = ref('/static/default-avatar.png')

onMounted(() => {
  try {
    const app = getApp()
    currentAvatar.value = app?.globalData?.userInfo?.avatar || '/static/default-avatar.png'
  } catch {}

  uni.$on('match:success', (data: unknown) => {
    const user = data as MatchUser
    if (user && user.id) {
      show(user)
    }
  })
})

onUnmounted(() => {
  uni.$off('match:success')
})

function show(user: MatchUser) {
  matchUser.value = user
  visible.value = true
}

function close() {
  visible.value = false
}

function goChat() {
  if (!matchUser.value) return
  visible.value = false
  uni.navigateTo({ url: `/pages/chat/index?userId=${matchUser.value.id}` })
}
</script>

<style lang="scss" scoped>
.match-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.match-modal-content {
  width: 600rpx;
  border-radius: 32rpx;
  background: #ffffff;
  position: relative;
  padding-bottom: 48rpx;
}

.close-btn {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
}

.title {
  margin-top: 48rpx;
  text-align: center;
  font-size: 48rpx;
  font-weight: bold;
  color: #ff6b6b;
}

.avatar-area {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 40rpx;
}

.avatar-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid #ff6b6b;
  background-color: #f5f5f5;
}

.heart-anim {
  margin: 0 24rpx;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.tip-text {
  margin-top: 32rpx;
  text-align: center;
  font-size: 28rpx;
  color: #666666;
  padding: 0 48rpx;
}

.btn-area {
  padding: 0 48rpx;
  margin-top: 48rpx;
}

.btn-chat {
  width: 100%;
  height: 88rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 32rpx;
  color: #ffffff;
}

.btn-later {
  margin-top: 24rpx;
  width: 100%;
  height: 88rpx;
  border-radius: 40rpx;
  background: #ffffff;
  border: 2rpx solid #dddddd;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 32rpx;
  color: #666666;
}
</style>
