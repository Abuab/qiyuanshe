<template>
  <view class="ai-quiz-page">
    <!-- 顶部标题栏 -->
    <view class="title-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="title-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <text class="title-text">AI 情感助手</text>
      <view class="title-right" />
    </view>

    <!-- 消息区 -->
    <view class="message-area">
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
    </view>

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
import { safeNavigateBack } from '@/utils/navigate'
import { requireLogin } from '@/utils/auth'

interface ChatMessage {
  type: 'ai' | 'user'
  content: string
}

const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const lastMsgId = ref('')
const statusBarHeight = ref(0)
const loadingFailed = ref(false)

function scrollToBottom() {
  lastMsgId.value = ''
  nextTick(() => {
    lastMsgId.value = 'msg-bottom'
  })
}

// 模板中需要引用 lastMsgId
// 已通过 scroll-into-view 绑定

onMounted(() => {
  // statusBarHeight 必须在登录检查之前获取，否则灵动岛机型顶部会被遮挡
  // #ifdef MP-WEIXIN
  try {
    const sysInfo = uni.getSystemInfoSync()
    statusBarHeight.value = sysInfo.statusBarHeight || 0
  } catch {}
  // #endif

  if (!requireLogin()) return

  nextQuestion()
})

const handleBack = () => safeNavigateBack()

async function nextQuestion() {
  try {
    loadingFailed.value = false
    const res: any = await request({ url: '/ai/fun-quiz', method: 'POST' })
    const question = res?.question || res
    if (question && typeof question === 'string') {
      messages.value.push({ type: 'ai', content: question })
    } else {
      messages.value.push({ type: 'ai', content: '如果你和对方第一次约会，你会选择什么地方？' })
    }
    scrollToBottom()
  } catch (err: any) {
    loadingFailed.value = true
    const errMsg = err?.data?.message || err?.errMsg || err?.message || '接口暂不可用'
    uni.showToast({ title: errMsg.length > 20 ? errMsg.slice(0, 20) + '...' : errMsg, icon: 'none', duration: 2500 })
    // 仍展示一条默认欢迎消息，避免白屏
    messages.value.push({ type: 'ai', content: 'Hi~ 我是你的AI情感助手，想聊点什么？换个话题试试吧～' })
    scrollToBottom()
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
      messages.value.push({
        type: 'ai',
        content: res?.reply || res,
      })
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
  height: 100%;
  background-color: #f5f5f5;
}

/* ===== 标题栏 ===== */
.title-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: linear-gradient(135deg, #FFB3C6, #FFD1DC);
  border-bottom: none;
  flex-shrink: 0;
  box-sizing: content-box;
  position: relative;
}

.title-left {
  position: absolute;
  left: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
}

.back-icon {
  font-size: 44rpx;
  color: #fff;
}

.title-right {
  width: 64rpx;
}

.title-text {
  font-size: 32rpx;
  color: #fff;
}

/* ===== 消息区 ===== */
.message-area {
  flex: 1; min-height: 0;
  overflow: hidden;
  display: flex; flex-direction: column;
}
.msg-area {
  flex: 1; width: 100%;
  height: 0; /* WeChat scroll-view needs explicit height anchor for flex to expand */
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
