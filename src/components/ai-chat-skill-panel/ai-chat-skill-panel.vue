<template>
  <view v-if="visible" class="chat-skill-overlay" @tap="close">
    <view class="chat-skill-panel" :class="{ slideUp: animating }" @tap.stop>
      <view class="panel-top">
        <text class="panel-title">AI 帮回</text>
        <text class="panel-sub">选择一条回复，帮你拉近关系</text>
        <view class="close-icon" @tap="close">
          <text>✕</text>
        </view>
      </view>

      <!-- 加载态 -->
      <view v-if="status === 'loading'" class="loading-state">
        <view class="dot-pulse">
          <view class="dot" />
          <view class="dot" />
          <view class="dot" />
        </view>
        <text class="loading-msg">AI 正在生成回复...</text>
      </view>

      <!-- 次数用完 -->
      <view v-else-if="status === 'exhausted'" class="exhausted-state">
        <text class="large-emoji">🔒</text>
        <text class="exhausted-title">今日次数已用完</text>
        <text class="exhausted-desc">开通会员解锁每日50次AI帮回</text>
        <view class="vip-btn" @tap="goVip">
          <text>开通会员</text>
        </view>
      </view>

      <!-- 错误 -->
      <view v-else-if="status === 'error'" class="error-state">
        <text class="error-msg">{{ errorMsg }}</text>
        <view class="retry-btn" @tap="retry">
          <text>重试</text>
        </view>
      </view>

      <!-- 三条建议 -->
      <scroll-view v-else-if="status === 'done'" class="suggestions-scroll" scroll-y :enhanced="true" :show-scrollbar="false">
        <view
          v-for="(item, index) in suggestions"
          :key="index"
          class="suggest-card"
          :class="'card-' + item.style"
        >
          <view class="card-header">
            <view class="card-tag" :class="item.style">
              <text>{{ item.label }}</text>
            </view>
            <view class="card-model-tag">
              <text>AI</text>
            </view>
          </view>
          <text class="card-content">{{ item.text }}</text>
          <view class="card-actions">
            <view class="card-action copy-action" @tap="copyText(item.text)">
              <text>复制</text>
            </view>
            <view class="card-action send-action" @tap="sendText(item.text)">
              <text>发送</text>
            </view>
          </view>
        </view>
        <view class="safe-hint">
          <text>💡 请文明交流，注意个人信息安全</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import request from '@/utils/request'

interface ChatSuggestion {
  style: string
  label: string
  text: string
}

const props = defineProps<{
  show: boolean
  targetUserId: number
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'send': [text: string]
}>()

const visible = ref(false)
const animating = ref(false)
const status = ref<'idle' | 'loading' | 'done' | 'exhausted' | 'error'>('idle')
const suggestions = ref<ChatSuggestion[]>([])
const errorMsg = ref('')

// loading dots animation
const styleMap: Record<string, string> = {
  humorous: '幽默版',
  sincere: '真诚版',
  charming: '撩人版',
}

watch(() => props.show, async (val) => {
  if (val) {
    visible.value = true
    await nextTick()
    animating.value = true
    fetchSuggestions()
  } else {
    animating.value = false
    setTimeout(() => { visible.value = false }, 300)
  }
})

const close = () => emit('update:show', false)

const fetchSuggestions = async () => {
  status.value = 'loading'
  try {
    const res: any = await request({
      url: `/ai/chat-skill/generate/${props.targetUserId}`,
      method: 'POST',
    })
    if (res?.suggestions?.length) {
      suggestions.value = res.suggestions.map((item: any) => ({
        ...item,
        label: styleMap[item.style] || item.style || '建议',
      }))
      status.value = 'done'
    } else {
      errorMsg.value = '暂未生成回复，请稍后再试'
      status.value = 'error'
    }
  } catch (e: any) {
    const msg = e?.message || e?.data?.message || ''
    if (msg.includes('次数') || msg.includes('用完') || msg.includes('LIMITED')) {
      status.value = 'exhausted'
    } else {
      errorMsg.value = msg || '网络异常，请重试'
      status.value = 'error'
    }
  }
}

const retry = () => fetchSuggestions()

const copyText = (text: string) => {
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: '已复制', icon: 'success', duration: 1200 })
    },
  })
}

const sendText = (text: string) => {
  emit('send', text)
  close()
}

const goVip = () => {
  close()
  setTimeout(() => {
    uni.switchTab({ url: '/pages/vip/index' })
  }, 300)
}

function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 30))
}
</script>

<style lang="scss" scoped>
$pink: #FF6B8A;
$pink-light: #FF8FA8;
$purple: #7C3AED;
$blue: #4A90E2;

.chat-skill-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: flex-end;
}

.chat-skill-panel {
  width: 100%; max-height: 72vh;
  background: #fff; border-radius: 32rpx 32rpx 0 0;
  display: flex; flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  &.slideUp { transform: translateY(0); }
}

.panel-top {
  position: relative; padding: 32rpx 32rpx 8rpx;
  text-align: center;
}
.panel-title { font-size: 34rpx; font-weight: bold; color: #1A1A1A; display: block; }
.panel-sub { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }
.close-icon {
  position: absolute; top: 32rpx; right: 32rpx;
  width: 56rpx; height: 56rpx; border-radius: 50%;
  background: #F5F5F5; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; color: #999;
}

// ===== loading =====
.loading-state {
  display: flex; flex-direction: column; align-items: center; padding: 80rpx 32rpx 100rpx;
}
.dot-pulse { display: flex; gap: 12rpx; margin-bottom: 24rpx; }
.dot {
  width: 16rpx; height: 16rpx; border-radius: 50%; background: $pink;
  animation: bounce 1.4s ease-in-out infinite both;
  &:nth-child(1) { animation-delay: -0.32s; }
  &:nth-child(2) { animation-delay: -0.16s; }
  &:nth-child(3) { animation-delay: 0s; }
}
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
.loading-msg { font-size: 26rpx; color: #999; }

// ===== exhausted =====
.exhausted-state, .error-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 60rpx 48rpx 80rpx; text-align: center;
}
.large-emoji { font-size: 72rpx; margin-bottom: 24rpx; }
.exhausted-title { font-size: 30rpx; color: #1A1A1A; font-weight: bold; margin-bottom: 10rpx; }
.exhausted-desc { font-size: 26rpx; color: #999; margin-bottom: 36rpx; }
.vip-btn, .retry-btn {
  padding: 20rpx 60rpx; border-radius: 40rpx;
  background: linear-gradient(135deg, $pink, $pink-light);
  font-size: 28rpx; color: #fff;
}
.error-msg { font-size: 26rpx; color: #999; margin-bottom: 32rpx; }

// ===== suggestions =====
.suggestions-scroll {
  flex: 1; padding: 16rpx 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.suggest-card {
  border-radius: 20rpx; padding: 24rpx; margin-bottom: 20rpx; position: relative; overflow: hidden;
  &.card-humorous { background: #FFF8E1; }
  &.card-sincere { background: #E8F5E9; }
  &.card-charming { background: #FCE4EC; }
}
.card-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 14rpx; }
.card-tag {
  padding: 4rpx 16rpx; border-radius: 8rpx; font-size: 22rpx; font-weight: 500;
  &.humorous { background: #FFF3CD; color: #856404; }
  &.sincere { background: #C8E6C9; color: #2E7D32; }
  &.charming { background: #F8BBD0; color: #C62828; }
}
.card-model-tag {
  padding: 4rpx 12rpx; border-radius: 6rpx; background: rgba($purple, 0.1);
  font-size: 20rpx; color: $purple; font-weight: 500;
}
.card-content {
  font-size: 28rpx; color: #333; line-height: 1.6; display: block; margin-bottom: 18rpx;
}
.card-actions { display: flex; gap: 16rpx; justify-content: flex-end; }
.card-action {
  padding: 10rpx 28rpx; border-radius: 28rpx; font-size: 24rpx;
}
.copy-action { background: #F5F5F5; color: #666; }
.send-action { background: linear-gradient(135deg, $pink, $pink-light); color: #fff; }

.safe-hint {
  text-align: center; padding: 20rpx 0; font-size: 22rpx; color: #ccc;
}
</style>
