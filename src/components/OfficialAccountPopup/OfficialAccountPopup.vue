<template>
  <view v-if="visible" class="oa-popup">
    <!-- 黑色半透明遮罩 -->
    <view class="oa-overlay" @tap="handleClose"></view>

    <!-- 弹窗内容 -->
    <view class="oa-body">
      <!-- 弹窗卡片 -->
      <view class="oa-card">
        <!-- 顶部花瓣装饰 -->
        <view class="oa-petal oa-petal-left"></view>
        <view class="oa-petal oa-petal-right"></view>
        <view class="oa-petal oa-petal-center"></view>

        <!-- 二维码区域 -->
        <view class="oa-qrcode-wrap">
          <image
            v-if="fullQrcodeUrl"
            class="oa-qrcode"
            :src="fullQrcodeUrl"
            mode="aspectFit"
            show-menu-by-longpress
            @error="onQrcodeError"
          />
          <view v-else class="oa-qrcode-placeholder">
            <text class="placeholder-text">二维码加载中...</text>
          </view>
        </view>

        <!-- 引导文字 -->
        <view class="oa-guide-text">
          <text>长按识别关注公众号</text>
          <text>脱单快人一步！</text>
        </view>

        <!-- 分隔线 -->
        <view class="oa-divider"></view>

        <!-- 底部 4 个功能按钮 -->
        <view class="oa-features">
          <view class="oa-feature-item">
            <view class="oa-feature-icon">
              <AppIcon name="icon-chat-teardrop-dots" size="36" color="#FFFFFF" />
            </view>
            <text class="oa-feature-label">有缘人通知</text>
          </view>
          <view class="oa-feature-item">
            <view class="oa-feature-icon">
              <AppIcon name="icon-shield-check-thin" size="36" color="#FFFFFF" />
            </view>
            <text class="oa-feature-label">信息审核</text>
          </view>
          <view class="oa-feature-item">
            <view class="oa-feature-icon">
              <AppIcon name="icon-calendar-heart-thin" size="36" color="#FFFFFF" />
            </view>
            <text class="oa-feature-label">活动通知</text>
          </view>
          <view class="oa-feature-item">
            <view class="oa-feature-icon">
              <AppIcon name="icon-heart" size="36" color="#FFFFFF" />
            </view>
            <text class="oa-feature-label">嘉宾推荐</text>
          </view>
        </view>
      </view>

      <!-- 关闭按钮（卡片外部下方居中） -->
      <view class="oa-close-btn" @tap="handleClose">
        <text class="oa-close-x">✕</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import { getFullImageUrl } from '@/utils/common'

interface Props {
  show: boolean
  qrcodeUrl?: string
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  qrcodeUrl: '',
})
const emit = defineEmits<Emits>()

const visible = ref(false)
const qrcodeError = ref(false)

const fullQrcodeUrl = computed(() => {
  if (!props.qrcodeUrl) return ''
  // 已是完整 URL 直接返回，否则走 COS 网关转换
  return props.qrcodeUrl.startsWith('http') ? props.qrcodeUrl : getFullImageUrl(props.qrcodeUrl)
})

watch(() => props.show, (val) => {
  visible.value = val
  if (val) {
    qrcodeError.value = false
  }
}, { immediate: true })

const handleClose = () => {
  visible.value = false
  emit('update:show', false)
  emit('close')
}

const onQrcodeError = () => {
  qrcodeError.value = true
}
</script>

<style lang="scss" scoped>
// ===== 弹窗容器 =====
.oa-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.oa-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
}

.oa-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

// ===== 弹窗卡片 =====
.oa-card {
  position: relative;
  width: 620rpx;
  border-radius: 32rpx;
  background: linear-gradient(180deg, #FFE8EC 0%, #FFD5D5 100%);
  padding: 60rpx 40rpx 40rpx 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

// ===== 花瓣装饰 =====
.oa-petal {
  position: absolute;
  border-radius: 50%;
}
.oa-petal-left {
  width: 120rpx;
  height: 60rpx;
  background: rgba(255, 150, 170, 0.3);
  top: -20rpx;
  left: 30rpx;
  transform: rotate(-30deg);
}
.oa-petal-right {
  width: 100rpx;
  height: 50rpx;
  background: rgba(255, 130, 150, 0.25);
  top: -15rpx;
  right: 40rpx;
  transform: rotate(25deg);
}
.oa-petal-center {
  width: 140rpx;
  height: 70rpx;
  background: rgba(255, 160, 180, 0.28);
  top: -10rpx;
  left: 50%;
  transform: translateX(-50%);
}

// ===== 二维码区域 =====
.oa-qrcode-wrap {
  width: 360rpx;
  height: 360rpx;
  background: #FFFFFF;
  border-radius: 8rpx;
  margin: 0 auto;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.oa-qrcode {
  width: 320rpx;
  height: 320rpx;
}

.oa-qrcode-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.placeholder-text {
  font-size: 26rpx;
  color: #999;
}

// ===== 引导文字 =====
.oa-guide-text {
  text-align: center;
  margin-top: 32rpx;
}

.oa-guide-text text {
  display: block;
  color: #FF6B6B;
  font-size: 28rpx;
  line-height: 1.6;
}

// ===== 分隔线 =====
.oa-divider {
  height: 1rpx;
  background: rgba(0, 0, 0, 0.08);
  margin: 28rpx 0;
}

// ===== 底部功能按钮 =====
.oa-features {
  display: flex;
  justify-content: space-around;
}

.oa-feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.oa-feature-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  background: #FF85A2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.oa-feature-label {
  font-size: 24rpx;
  color: #999999;
  margin-top: 12rpx;
}

// ===== 关闭按钮 =====
.oa-close-btn {
  margin-top: 40rpx;
  width: 64rpx;
  height: 64rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.oa-close-x {
  color: #FFFFFF;
  font-size: 32rpx;
  line-height: 1;
}
</style>
