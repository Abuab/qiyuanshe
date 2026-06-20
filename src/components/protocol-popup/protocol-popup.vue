<template>
  <view v-if="visible" class="protocol-popup">
    <view class="protocol-overlay" @tap="handleClose"></view>
    <view class="protocol-card">
      <view class="protocol-header">
        <text class="protocol-title">{{ agreementTitle }}</text>
      </view>

      <scroll-view class="protocol-content" scroll-y enable-flex>
        <view class="protocol-text">
          <text
            v-for="(line, i) in textLines"
            :key="i"
            :class="line._cls"
            :decode="true"
          >{{ line._txt }}</text>
        </view>
      </scroll-view>

      <view class="protocol-buttons">
        <button class="btn-agree" @tap="handleAgree">同意</button>
        <button class="btn-disagree" @tap="handleClose">不同意</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { get } from '@/utils/request'
import { useSystemStore } from '@/store/system'

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
const systemStore = useSystemStore()
let pendingCallback: (() => void) | null = null

/** HTML 元素是否为块级（会换行） */
const isBlockTag = (tag: string) => /^(p|div|h[1-6]|li|br|hr|section|article|header|footer|tr)$/i.test(tag)

/** HTML 元素是否为标题/加粗 */
const isHeadingTag = (tag: string) => /^(h[1-6]|strong|b|th)$/i.test(tag)

/** 将 HTML 字符串解析为纯文本行数组，每行一个 <text> 组件 */
const htmlToTextLines = (html: string): { _txt: string; _cls: string }[] => {
  if (!html) return []

  // 预处理：在块级标签闭合后加换行符
  let processed = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<hr[^>]*>/gi, '\n')

  // 存储当前位置是否在 bold 标签内
  let inBold = false
  const lines: { text: string; isBold: boolean }[] = []
  let currentLine = { text: '', isBold: false }

  // 逐字符解析，处理开/闭标签和文本
  const chars = processed.split('')
  let i = 0
  while (i < chars.length) {
    if (chars[i] === '<') {
      // 提取标签
      const end = chars.indexOf('>', i)
      if (end === -1) break
      const tagStr = processed.substring(i + 1, end)
      i = end + 1

      if (tagStr.startsWith('/')) {
        // 闭合标签
        const tagName = tagStr.substring(1).split(/\s/)[0].toLowerCase()
        if (tagName === 'strong' || tagName === 'b') {
          inBold = false
          currentLine.isBold = false
        }
      } else {
        // 开放标签
        const tagName = tagStr.split(/\s/)[0].toLowerCase()
        if (tagName === 'strong' || tagName === 'b') {
          inBold = true
          currentLine.isBold = true
        } else if (isBlockTag(tagName)) {
          // 块级标签前先保存当前行
          if (currentLine.text.trim()) {
            lines.push({ ...currentLine, text: currentLine.text.trim() })
          }
          currentLine = { text: '', isBold: inBold }
        } else if (isHeadingTag(tagName)) {
          // 标题标签前先保存当前行
          if (currentLine.text.trim()) {
            lines.push({ ...currentLine, text: currentLine.text.trim() })
          }
          currentLine = { text: '', isBold: true }
        }
      }
    } else if (chars[i] === '\n') {
      // 遇到换行符，保存当前行
      if (currentLine.text.trim()) {
        lines.push({ ...currentLine, text: currentLine.text.trim() })
      }
      currentLine = { text: '', isBold: inBold }
      i++
    } else {
      // 普通文本
      currentLine.text += chars[i]
      i++
    }
  }

  // 最后一行
  if (currentLine.text.trim()) {
    lines.push({ ...currentLine, text: currentLine.text.trim() })
  }

  // 解码 HTML 实体
  const decodeEntities = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')

  return lines.map(l => ({
    _txt: decodeEntities(l.text),
    _cls: l.isBold ? 'text-bold' : 'text-normal',
  }))
}

// 默认兜底内容（纯文本，无需 HTML 解析也能直接显示）
const fallbackText = computed(() => `欢迎使用${systemStore.appName}及相关服务。

您需要同意《用户协议》和《隐私政策》才可以继续使用，我们将严格按照您同意的各项条款保护您的个人信息，请点击同意以继续。

【用户协议】
一、服务说明
${systemStore.appName}是一款婚恋交友平台，旨在帮助用户找到合适的伴侣。我们不对用户发布的内容真实性负责，请用户自行判断。

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
我们采用行业标准的安全措施保护您的个人信息。`)

/** 计算文本行 */
const textLines = computed(() => {
  return htmlToTextLines(agreementContent.value)
})

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
      agreementContent.value = cached
      return
    }

    const res: any = await get('/agreement', { type: 'USER_AGREEMENT' } as any)
    if (res && res.content) {
      agreementTitle.value = res.title || '用户协议与隐私政策'
      agreementContent.value = res.content
      uni.setStorageSync('agreement_content', res.content)
    } else {
      agreementContent.value = fallbackText.value
    }
  } catch (e) {
    console.log('[协议] 接口获取失败，使用兜底内容')
    agreementContent.value = fallbackText.value
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
  height: 75vh;
  max-height: 75vh;
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
  min-height: 0;
  height: 0;
  overflow-y: auto;
}

.protocol-text {
  padding: 10rpx 40rpx 16rpx;
}

.text-normal {
  font-size: 26rpx;
  color: var(--text);
  line-height: 1.8;
  display: block;
  padding: 4rpx 0;
  word-break: break-word;
  white-space: pre-wrap;
}

.text-bold {
  font-size: 28rpx;
  font-weight: bold;
  color: var(--text);
  line-height: 2;
  display: block;
  padding: 12rpx 0 4rpx;
  word-break: break-word;
  white-space: pre-wrap;
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
