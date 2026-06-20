<template>
  <view v-if="visible" class="protocol-root">
    <!-- 粉色背景 + 插画 -->
    <view class="protocol-bg">
      <view class="illustration-area">
        <image
          v-if="loginIllustration"
          :src="loginIllustration"
          mode="aspectFit"
          class="login-illustration"
        />
        <view v-else class="default-illustration">
          <view class="couple-scene">
            <view class="heart-float heart-1">💕</view>
            <view class="heart-float heart-2">💗</view>
            <view class="heart-float heart-3">💖</view>
            <text class="couple-emoji">👫</text>
          </view>
          <view class="plant-deco plant-left">🌿</view>
          <view class="plant-deco plant-right">🌸</view>
        </view>
      </view>
      <!-- 插画下方阴影 -->
      <view class="illustration-shadow" />
    </view>

    <!-- 协议弹窗卡片 -->
    <view class="protocol-card">
      <text class="card-title">用户协议及隐私协议</text>

      <view class="card-body">
        <text class="card-text">
          欢迎使用产品及相关服务。您需要同意
        </text>
        <text class="link-text" @tap="goToAgreement('user')">《用户协议》</text>
        <text class="card-text">和</text>
        <text class="link-text" @tap="goToAgreement('privacy')">《隐私政策》</text>
        <text class="card-text">才可以继续使用，我们将严格按照您同意的各项条款保护您的个人信息，请点击同意以继续</text>
      </view>

      <view class="card-buttons">
        <view class="btn-agree" @tap="handleAgree">
          <text>同意</text>
        </view>
        <text class="btn-disagree" @tap="handleDisagree">不同意</text>
      </view>
    </view>

    <!-- 暂不授权（卡片外） -->
    <view class="skip-section">
      <text class="skip-text" @tap="handleSkip">暂不授权</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSystemStore } from '@/store/system'

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'agree'): void
  (e: 'close'): void
  (e: 'navigate', url: string): void
}>()

const visible = ref(false)
const systemStore = useSystemStore()
let pendingCallback: (() => void) | null = null

const loginIllustration = computed(() => systemStore.loginIllustration || '')

watch(
  () => props.show,
  (newVal) => { visible.value = newVal },
  { immediate: true }
)

const goToAgreement = (type: string) => {
  const url = `/pages/agreement/index?type=${type}`
  emit('navigate', url)
}

const handleAgree = () => {
  visible.value = false
  emit('update:show', false)
  // 记录用户已同意协议
  uni.setStorageSync('hasAgreedProtocol', true)
  emit('agree')
  if (pendingCallback) {
    pendingCallback()
    pendingCallback = null
  }
}

const handleDisagree = () => {
  uni.showToast({ title: '需要同意才能继续使用', icon: 'none' })
}

const handleSkip = () => {
  visible.value = false
  emit('update:show', false)
  emit('close')
  if (pendingCallback) {
    pendingCallback = null
  }
}

const open = (callback?: () => void) => {
  pendingCallback = callback || null
  visible.value = true
  emit('update:show', true)
}

const close = () => {
  visible.value = false
  emit('update:show', false)
  emit('close')
}

defineExpose({ open, close })
</script>

<style lang="scss" scoped>
.protocol-root {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9999;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}

// ========== 背景 ==========
.protocol-bg {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, #FFF0F5 0%, #FFF8FA 60%, #FFF 100%);
  display: flex; flex-direction: column; align-items: center;
  padding-top: 120rpx;
}

.illustration-area {
  width: 520rpx; height: 460rpx;
  display: flex; align-items: center; justify-content: center;
}
.login-illustration {
  width: 100%; height: 100%;
}
.default-illustration {
  position: relative;
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}

.couple-scene {
  position: relative;
  display: flex; align-items: center; justify-content: center;
}
.couple-emoji { font-size: 160rpx; }

.heart-float {
  position: absolute; font-size: 48rpx;
}
.heart-1 { top: -40rpx; left: -30rpx; animation: floatHeart 2.5s ease-in-out infinite; }
.heart-2 { top: 20rpx; right: -50rpx; animation: floatHeart 3s ease-in-out infinite 0.5s; }
.heart-3 { bottom: -20rpx; left: -20rpx; animation: floatHeart 2.8s ease-in-out infinite 1s; }

@keyframes floatHeart {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-16rpx) scale(1.1); }
}

.plant-deco {
  position: absolute; font-size: 60rpx;
}
.plant-left { bottom: 20rpx; left: 40rpx; }
.plant-right { bottom: 10rpx; right: 40rpx; }

.illustration-shadow {
  width: 400rpx; height: 20rpx;
  background: rgba(0,0,0,0.04); border-radius: 50%;
  margin-top: -10rpx;
}

// ========== 弹窗卡片 ==========
.protocol-card {
  position: relative; z-index: 2;
  width: 85vw; max-width: 680rpx;
  background: #fff; border-radius: 40rpx;
  padding: 48rpx 40rpx 36rpx;
  display: flex; flex-direction: column; align-items: center;
  box-shadow: 0 8rpx 40rpx rgba(0,0,0,0.08);
}

.card-title {
  font-size: 36rpx; font-weight: 700; color: #1A1A1A;
  margin-bottom: 28rpx;
}

.card-body {
  margin-bottom: 36rpx;
  text { font-size: 28rpx; color: #666; line-height: 1.7; }
}
.link-text {
  color: #1989FA; font-size: 28rpx; line-height: 1.7;
}

.card-buttons {
  width: 100%;
  display: flex; flex-direction: column; align-items: center;
  gap: 24rpx;
}

.btn-agree {
  width: 85%; height: 88rpx;
  background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
  border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  text {
    font-size: 32rpx; color: #fff; font-weight: 600;
  }
}

.btn-disagree {
  font-size: 26rpx; color: #999;
  text-decoration: underline;
}

// ========== 暂不授权 ==========
.skip-section {
  position: relative; z-index: 2; margin-top: 32rpx;
}
.skip-text {
  font-size: 26rpx; color: #999; text-decoration: underline;
}
</style>
