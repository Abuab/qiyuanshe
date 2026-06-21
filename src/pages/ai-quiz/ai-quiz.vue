<template>
  <view class="ai-quiz-page">
    <!-- 顶部标题栏 -->
    <view class="title-bar">
      <text class="title-text">AI 情感助手</text>
    </view>

    <!-- 消息区 -->
    <scroll-view
      class="msg-area"
      scroll-y
      :scroll-into-view="lastMsgId"
      :scroll-with-animation="true"
    >
      <view class="msg-list">
        <view
          v-for="(msg, index) in messages"
          :key="index"
          :id="'msg-' + index"
          class="msg-item"
          :class="msg.type === 'user' ? 'msg-right' : 'msg-left'"
        >
          <view class="msg-bubble" :class="msg.type === 'user' ? 'bubble-user' : 'bubble-ai'">
            <text>{{ msg.content }}</text>
          </view>
        </view>
        <view id="msg-bottom" class="msg-bottom-spacer" />
      </view>
    </scroll-view>

    <!-- 底部输入区 -->
    <view class="input-bar">
      <view class="btn-new-question" @tap="nextQuestion">换一题</view>
      <input
        class="input-field"
        v-model="inputText"
        type="text"
        placeholder="输入你的想法..."
        confirm-type="send"
        @confirm="sendMessage"
      />
      <view class="btn-send" @tap="sendMessage">发送</view>
    </view>

    <!-- AI 合规声明 -->
    <view class="ai-disclaimer-bar">
      <text>内容由 AI 生成，仅供参考</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import request from '@/utils/request'

interface ChatMessage {
  type: 'ai' | 'user'
  content: string
}

const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const lastMsgId = ref('')

function scrollToBottom() {
  lastMsgId.value = ''
  nextTick(() => {
    lastMsgId.value = 'msg-bottom'
  })
}

// 模板中需要引用 lastMsgId
// 已通过 scroll-into-view 绑定

onMounted(() => {
  nextQuestion()
})

async function nextQuestion() {
  try {
    const res: any = await request({ url: '/ai/fun-quiz', method: 'POST' })
    if (res.code === 0 && res.data) {
      messages.value.push({
        type: 'ai',
        content: res.data.question || res.data,
      })
      scrollToBottom()
    }
  } catch {
    uni.showToast({ title: '获取题目失败', icon: 'none' })
  }
}

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return

  messages.value.push({ type: 'user', content: text })
  inputText.value = ''
  scrollToBottom()

  // 模拟 AI 回复（可接入实际 AI 接口）
  setTimeout(async () => {
    try {
      const res: any = await request({
        url: '/ai/fun-quiz/answer',
        method: 'POST',
        data: { answer: text },
      })
      if (res.code === 0 && res.data) {
        messages.value.push({
          type: 'ai',
          content: res.data.reply || res.data,
        })
      }
    } catch {
      messages.value.push({
        type: 'ai',
        content: '收到你的想法了～要不要换个话题聊聊？',
      })
    }
    scrollToBottom()
  }, 800)
}
</script>

<style lang="scss" scoped>
.ai-quiz-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
  --safe-area-top: constant(safe-area-inset-top);
  --safe-area-top: env(safe-area-inset-top);
}

/* ===== 标题栏 ===== */
.title-bar {
  padding-top: var(--safe-area-top);
  height: calc(88rpx + var(--safe-area-top));
  background: #ffffff;
  border-bottom: 1rpx solid #eeeeee;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
}

.title-text {
  font-size: 32rpx;
  color: #333333;
  font-weight: 500;
}

/* ===== 消息区 ===== */
.msg-area {
  flex: 1;
  overflow-y: auto;
}

.msg-list {
  padding: 24rpx;
}

.msg-item {
  margin-bottom: 24rpx;
  display: flex;
}

.msg-left {
  justify-content: flex-start;
}

.msg-right {
  justify-content: flex-end;
}

.msg-bubble {
  max-width: 70%;
  padding: 24rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  line-height: 1.6;
  word-break: break-all;
}

.bubble-ai {
  background: #f5f5f5;
  color: #333333;
}

.bubble-user {
  background: #ff6b6b;
  color: #ffffff;
}

.msg-bottom-spacer {
  height: 120rpx;
}

/* ===== 底部输入区 ===== */
.input-bar {
  flex-shrink: 0;
  height: 96rpx;
  background: #ffffff;
  border-top: 1rpx solid #eeeeee;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}

.btn-new-question {
  margin-right: 16rpx;
  padding: 0 24rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: #fff0f3;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24rpx;
  color: #ff6b6b;
  flex-shrink: 0;
}

.input-field {
  flex: 1;
  height: 64rpx;
  background: #f5f5f5;
  border-radius: 32rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.btn-send {
  margin-left: 16rpx;
  width: 80rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: #ff6b6b;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24rpx;
  color: #ffffff;
  flex-shrink: 0;
}

/* ===== AI 合规声明 ===== */
.ai-disclaimer-bar {
  flex-shrink: 0;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-top: 1rpx solid #eeeeee;
  font-size: 20rpx;
  color: #999999;
}
</style>
