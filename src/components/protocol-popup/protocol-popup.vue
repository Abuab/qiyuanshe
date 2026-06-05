<template>
  <view v-if="visible" class="protocol-popup">
    <view class="protocol-overlay" @tap="handleClose"></view>
    <view class="protocol-card">
      <view class="protocol-header">
        <text class="protocol-title">{{ agreementTitle }}</text>
      </view>

      <scroll-view class="protocol-content" scroll-y enable-flex>
        <view class="protocol-text" v-html="agreementContent"></view>
      </scroll-view>

      <view class="protocol-buttons">
        <button class="btn-agree" @tap="handleAgree">同意</button>
        <button class="btn-disagree" @tap="handleClose">不同意</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { get } from '@/utils/request'

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
const agreementTitle = ref('用户协议与隐私政策')
const agreementContent = ref('')
const rawAgreementHtml = ref('')
let pendingCallback: (() => void) | null = null

/** 清洗富文本 HTML：剥离可能导致不换行的内联样式，rpx→px 转换 */
const cleanHtmlForWrap = (html: string): string => {
  if (!html) return ''
  return html
    // rpx → px（微信小程序 rich-text 不支持 rpx 单位，会导致内联样式失效、元素失去块级特性）
    .replace(/(\d+)rpx/gi, (_, num) => Math.round(Number(num) / 2) + 'px')
    // 移除 white-space 相关
    .replace(/\bwhite-space\s*:\s*[^;"']+;?/gi, '')
    // 移除 word-break 相关
    .replace(/\bword-break\s*:\s*[^;"']+;?/gi, '')
    // 移除 word-wrap / overflow-wrap
    .replace(/\b(?:word|overflow)-wrap\s*:\s*[^;"']+;?/gi, '')
    // 移除固定宽度
    .replace(/\bwidth\s*:\s*\d+(?:px|em|rem|%)\s*(?:!important)?\s*;?/gi, '')
    // 清理 style 属性中可能残留的空引号
    .replace(/\sstyle\s*=\s*""/gi, '')
    .replace(/\sstyle\s*=\s*''/gi, '')
}

// 默认兜底内容（纯 p/strong 标签，无内联样式——微信小程序 rich-text 不支持 rpx 内联样式）
const fallbackContent = `
<p>欢迎使用栖缘社及相关服务。</p>
<p>您需要同意《用户协议》和《隐私政策》才可以继续使用，我们将严格按照您同意的各项条款保护您的个人信息，请点击同意以继续。</p>
<p style="font-size:15px;font-weight:bold;margin-top:16px;margin-bottom:10px;">【用户协议】</p>
<p style="font-size:14px;font-weight:bold;margin-top:12px;margin-bottom:6px;">一、服务说明</p>
<p>栖缘社是一款婚恋交友平台，旨在帮助用户找到合适的伴侣。我们不对用户发布的内容真实性负责，请用户自行判断。</p>
<p style="font-size:14px;font-weight:bold;margin-top:12px;margin-bottom:6px;">二、用户注册</p>
<p>1. 您需要提供真实的个人信息进行注册</p>
<p>2. 您必须年满18周岁方可使用本服务</p>
<p>3. 您需对账户安全负责，因个人原因导致的账户被盗用，责任自负</p>
<p style="font-size:14px;font-weight:bold;margin-top:12px;margin-bottom:6px;">三、用户行为</p>
<p>1. 不得发布虚假信息、诈骗信息</p>
<p>2. 不得骚扰、辱骂其他用户</p>
<p>3. 不得发布违法、违规内容</p>
<p>4. 不得利用本平台进行商业营销</p>
<p style="font-size:14px;font-weight:bold;margin-top:12px;margin-bottom:6px;">四、隐私保护</p>
<p>我们承诺保护您的个人信息，不会未经您的同意向第三方透露您的个人信息。</p>
<p style="font-size:15px;font-weight:bold;margin-top:16px;margin-bottom:10px;">【隐私政策】</p>
<p style="font-size:14px;font-weight:bold;margin-top:12px;margin-bottom:6px;">一、信息收集</p>
<p>1. 我们会收集您主动提供的信息（手机号、头像等）</p>
<p>2. 我们会收集您使用服务时自动产生的信息（登录日志、操作记录等）</p>
<p>3. 我们会获取您的地理位置信息用于匹配功能</p>
<p style="font-size:14px;font-weight:bold;margin-top:12px;margin-bottom:6px;">二、信息使用</p>
<p>1. 用于提供和改进我们的服务</p>
<p>2. 用于向您推送个性化内容</p>
<p>3. 用于账号安全保护</p>
<p style="font-size:14px;font-weight:bold;margin-top:12px;margin-bottom:6px;">三、信息共享</p>
<p>未经您的同意，我们不会与任何第三方共享您的个人信息，法律要求除外。</p>
<p style="font-size:14px;font-weight:bold;margin-top:12px;margin-bottom:6px;">四、信息安全</p>
<p>我们采用行业标准的安全措施保护您的个人信息。</p>
`

watch(
  () => props.show,
  (newVal) => {
    visible.value = newVal
  },
  { immediate: true }
)

const fetchAgreement = async () => {
  try {
    const cached = uni.getStorageSync('agreement_content')
    if (cached) {
      rawAgreementHtml.value = cached
      agreementContent.value = cleanHtmlForWrap(cached)
      return
    }

    const res: any = await get('/agreement', { type: 'USER_AGREEMENT' } as any)
    if (res && res.content) {
      agreementTitle.value = res.title || '用户协议与隐私政策'
      rawAgreementHtml.value = res.content
      const cleaned = cleanHtmlForWrap(res.content)
      agreementContent.value = cleaned
      uni.setStorageSync('agreement_content', res.content)
    } else {
      agreementContent.value = cleanHtmlForWrap(fallbackContent)
    }
  } catch (e) {
    console.log('[协议] 接口获取失败，使用兜底内容')
    agreementContent.value = cleanHtmlForWrap(fallbackContent)
  }
}

onMounted(() => {
  fetchAgreement()
})

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
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-width: calc(100vw - 80rpx);
}

.protocol-header {
  padding: 40rpx 40rpx 20rpx;
  text-align: center;
  flex-shrink: 0;
}

.protocol-title {
  font-size: 36rpx;
  font-weight: bold;
  color: var(--text);
}

.protocol-content {
  flex: 1;
  padding: 0 40rpx;
  min-height: 0;
  white-space: normal !important;
  word-break: break-word !important;
}

.protocol-text {
  padding: 10rpx 0 16rpx;
  font-size: 26rpx;
  color: var(--text);
  line-height: 1.8;
  white-space: normal !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
}

.protocol-buttons {
  padding: 24rpx 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  flex-shrink: 0;
  background-color: #fff;
  border-top: 1rpx solid #f0f0f0;
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
  background-color: #fff;
  color: #666;
  font-size: 28rpx;
  border: 1px solid #dcdfe6;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    border: none;
  }

  &:active {
    background-color: #f5f5f5;
  }
}
</style>
