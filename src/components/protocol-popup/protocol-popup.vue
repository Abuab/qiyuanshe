<template>
  <view v-if="visible" class="protocol-popup">
    <view class="protocol-overlay" @tap="handleClose"></view>
    <view class="protocol-card">
      <view class="protocol-header">
        <text class="protocol-title">用户协议与隐私政策</text>
      </view>

      <scroll-view class="protocol-content" scroll-y>
        <text class="protocol-text">
          欢迎使用产品及相关服务。

          您需要同意《用户协议》和《隐私政策》才可以继续使用，我们将严格按照您同意的各项条款保护您的个人信息，请点击同意以继续。

          【用户协议】

          一、服务说明
          栖缘社是一款婚恋交友平台，旨在帮助用户找到合适的伴侣。我们不对用户发布的内容真实性负责，请用户自行判断。

          二、用户注册
          1. 您需要提供真实的个人信息进行注册
          2. 您必须年满18周岁方可使用本服务
          3. 您需对账户安全负责，因个人原因导致的账户被盗用，责任自负

          三、用户行为
          1. 不得发布虚假信息、诈骗信息
          2. 不得骚扰、辱骂其他用户
          3. 不得发布违法、违规内容
          4. 不得利用本平台进行商业营销

          四、隐私保护
          我们承诺保护您的个人信息，不会未经您的同意向第三方透露您的个人信息。

          【隐私政策】

          一、信息收集
          1. 我们会收集您主动提供的信息（手机号、头像等）
          2. 我们会收集您使用服务时自动产生的信息（登录日志、操作记录等）
          3. 我们会获取您的地理位置信息用于匹配功能

          二、信息使用
          1. 用于提供和改进我们的服务
          2. 用于向您推送个性化内容
          3. 用于账号安全保护

          三、信息共享
          未经您的同意，我们不会与任何第三方共享您的个人信息，法律要求除外。

          四、信息安全
          我们采用行业标准的安全措施保护您的个人信息。
        </text>
      </scroll-view>

      <view class="protocol-buttons">
        <button class="btn-agree" @tap="handleAgree">同意</button>
        <button class="btn-disagree" @tap="handleClose">不同意</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'agree'): void
  (e: 'close'): void
}>()

const visible = ref(false)
let pendingCallback: (() => void) | null = null

watch(
  () => props.show,
  (newVal) => {
    visible.value = newVal
  },
  { immediate: true }
)

const handleClose = () => {
  visible.value = false
  emit('update:show', false)
  emit('close')
}

const handleAgree = () => {
  visible.value = false
  emit('update:show', false)
  emit('agree')

  if (pendingCallback) {
    pendingCallback()
    pendingCallback = null
  }
}

const open = (callback?: () => void) => {
  pendingCallback = callback || null
  visible.value = true
  emit('update:show', true)
}

const close = () => {
  handleClose()
}

defineExpose({
  open,
  close,
})
</script>

<style lang="scss" scoped>
.protocol-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.protocol-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.protocol-card {
  position: relative;
  width: 640rpx;
  max-height: 80vh;
  background-color: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  margin: 40rpx;
}

.protocol-header {
  padding: 40rpx 32rpx 24rpx;
  text-align: center;
}

.protocol-title {
  font-size: 36rpx;
  font-weight: bold;
  color: var(--text);
}

.protocol-content {
  padding: 0 32rpx;
  max-height: 50vh;
}

.protocol-text {
  font-size: 26rpx;
  color: var(--text);
  line-height: 1.8;
}

.protocol-buttons {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.btn-agree {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #FF6B9D 0%, #FF8FB0 100%);
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    border: none;
  }

  &:active {
    opacity: 0.9;
  }
}

.btn-disagree {
  width: 100%;
  height: 88rpx;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 28rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    border: none;
  }
}
</style>
