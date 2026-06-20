<template>
  <view class="ai-matchmaker-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">AI 红娘</view>
      <view class="nav-right" />
    </view>

    <!-- 剩余次数提示（免费用户） -->
    <view v-if="remainingRounds !== null && remainingRounds <= 3" class="quota-bar">
      <text class="quota-text">今日免费咨询剩余 {{ remainingRounds }} 轮</text>
    </view>

    <!-- 对话消息列表 -->
    <scroll-view
      class="chat-scroll"
      :scroll-y="true"
      :scroll-with-animation="true"
      :scroll-into-view="scrollToId"
      :enhanced="true"
      :show-scrollbar="false"
    >
      <!-- 欢迎语 -->
      <view v-if="messages.length === 0" class="welcome-block">
        <text class="welcome-emoji">💝</text>
        <text class="welcome-title">Hi~ 我是你的AI红娘</text>
        <text class="welcome-desc">恋爱困惑、约会建议、相处技巧...尽管问我</text>
        <view class="quick-qs-container">
          <text class="quick-qs-label">你可以试着问我：</text>
          <view
            v-for="(q, i) in quickQuestions"
            :key="i"
            class="quick-q-item"
            @tap="sendQuick(q)"
          >
            <text>{{ q }}</text>
          </view>
        </view>
      </view>

      <!-- 消息气泡 -->
      <view v-for="(msg, i) in messages" :key="i" :id="'msg-' + i" class="msg-row" :class="msg.role">
        <view class="bubble" :class="msg.role">
          <text class="bubble-text">{{ msg.content }}</text>
        </view>
        <view v-if="msg.safetyNotice === 'safety_boundary'" class="safety-tag">
          <text>安全提醒</text>
        </view>
        <view v-if="msg.safetyNotice === 'input_violation'" class="safety-tag warn">
          <text>内容提示</text>
        </view>
      </view>

      <!-- 打字动画 -->
      <view v-if="typing" class="msg-row ai">
        <view class="bubble ai typing-bubble">
          <view class="typing-dots">
            <view class="dot" />
            <view class="dot" />
            <view class="dot" />
          </view>
        </view>
      </view>

      <view id="msg-bottom" class="msg-bottom-spacer" />
    </scroll-view>

    <!-- 底部输入栏 -->
    <view class="bottom-input-bar" :style="{ paddingBottom: safeAreaBottom + 'px' }">
      <view class="input-row">
        <input
          class="input-field"
          v-model="inputText"
          placeholder="说说你的困惑..."
          placeholder-class="input-placeholder"
          :adjust-position="false"
          :confirm-type="'send'"
          @confirm="sendText"
        />
        <view
          class="send-btn"
          :class="{ disabled: !inputText.trim() || typing }"
          @tap="sendText"
        >
          <text>发送</text>
        </view>
      </view>
      <view class="bottom-tools">
        <view class="tool-item" @tap="clearChat">
          <text>重置对话</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import request from '@/utils/request'

const statusBarHeight = ref(0)

interface Message {
  role: 'user' | 'ai'
  content: string
  safetyNotice?: string
}

const messages = ref<Message[]>([])
const inputText = ref('')
const typing = ref(false)
const remainingRounds = ref<number | null>(null)
const scrollToId = ref('')
const quickQuestions = ref<string[]>([])
const safeAreaBottom = ref(0)

const historyLoaded = ref(false)

onMounted(async () => {
  try {
    const sysInfo = uni.getSystemInfoSync()
    statusBarHeight.value = sysInfo.statusBarHeight || 0
    safeAreaBottom.value = sysInfo.safeAreaInsets?.bottom || 0
  } catch {}

  await Promise.all([
    loadHistory(),
    loadQuickQuestions(),
  ])
})

const handleBack = () => {
  const pages = getCurrentPages()
  if (pages.length <= 1) {
    uni.switchTab({ url: '/pages/index/index' })
  } else {
    uni.navigateBack()
  }
}

const loadHistory = async () => {
  try {
    const res: any = await request({ url: '/ai/matchmaker/history', method: 'GET' })
    if (res?.messages?.length) {
      messages.value = res.messages
      remainingRounds.value = res.remainingRounds
    }
    if (res?.remainingRounds !== undefined) {
      remainingRounds.value = res.remainingRounds
    }
  } catch {
    // 无历史记录
  }
  historyLoaded.value = true
  scrollToBottom()
}

const loadQuickQuestions = async () => {
  try {
    const res: any = await request({ url: '/ai/matchmaker/quick-questions', method: 'GET' })
    if (Array.isArray(res)) {
      quickQuestions.value = res
    }
  } catch {}
}

const sendQuick = (q: string) => {
  inputText.value = q
  sendText()
}

const sendText = async () => {
  const text = inputText.value.trim()
  if (!text || typing.value) return

  inputText.value = ''
  messages.value.push({ role: 'user', content: text })
  scrollToBottom()

  typing.value = true
  try {
    const res: any = await request({
      url: '/ai/matchmaker/chat',
      method: 'POST',
      data: { message: text },
    })
    if (res) {
      messages.value.push({
        role: 'ai',
        content: res.reply || '抱歉，暂时无法回复，请稍后再试',
        safetyNotice: res.safetyNotice,
      })
      if (res.remainingRounds !== undefined && res.remainingRounds !== null) {
        remainingRounds.value = res.remainingRounds
      }
    }
  } catch (e: any) {
    messages.value.push({
      role: 'ai',
      content: '红娘正在忙，请稍后再试～',
    })
  }
  typing.value = false
  scrollToBottom()
}

const clearChat = async () => {
  try {
    await request({ url: '/ai/matchmaker/context', method: 'DELETE' })
    messages.value = []
    await loadHistory()
    uni.showToast({ title: '对话已重置', icon: 'none', duration: 1500 })
  } catch {
    messages.value = []
    uni.showToast({ title: '对话已重置', icon: 'none', duration: 1500 })
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    scrollToId.value = 'msg-bottom'
    setTimeout(() => { scrollToId.value = '' }, 100)
  })
}
</script>

<style lang="scss" scoped>
$pink: #FF6B8A;
$pink-light: #FF8FA8;

.ai-matchmaker-page {
  width: 100vw; height: 100vh;
  display: flex; flex-direction: column;
  background: #F8F8F8;
}

// 导航栏
.nav-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32rpx 16rpx;
  background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
}
.nav-left { width: 80rpx; }
.back-icon { font-size: 36rpx; color: #fff; }
.nav-title { font-size: 34rpx; color: #fff; font-weight: bold; }
.nav-right { width: 80rpx; }

.quota-bar {
  padding: 12rpx 32rpx; background: #FFF8F0;
  text-align: center;
}
.quota-text { font-size: 24rpx; color: #FF9500; }

.chat-scroll {
  flex: 1; overflow-y: auto;
  padding: 24rpx 32rpx;
}

// 欢迎语
.welcome-block {
  display: flex; flex-direction: column; align-items: center;
  padding: 60rpx 0;
}
.welcome-emoji { font-size: 80rpx; margin-bottom: 20rpx; }
.welcome-title { font-size: 36rpx; font-weight: bold; color: #1A1A1A; margin-bottom: 12rpx; }
.welcome-desc { font-size: 26rpx; color: #999; margin-bottom: 48rpx; }

.quick-qs-container {
  width: 100%;
}
.quick-qs-label {
  font-size: 24rpx; color: #999; margin-bottom: 16rpx; display: block; text-align: center;
}
.quick-q-item {
  margin-bottom: 16rpx; padding: 20rpx 28rpx;
  background: linear-gradient(135deg, #FFF0F3, #FFF);
  border: 1rpx solid rgba(255, 107, 138, 0.2);
  border-radius: 20rpx;
  font-size: 28rpx; color: $pink; text-align: center;
}

// 消息行
.msg-row {
  margin-bottom: 24rpx; display: flex; flex-direction: column;
  &.user { align-items: flex-end; }
  &.ai { align-items: flex-start; }
}

.bubble {
  max-width: 80%; padding: 18rpx 24rpx; border-radius: 24rpx;
  word-break: break-all; overflow-wrap: break-word;
  &.user {
    background: linear-gradient(135deg, $pink, $pink-light); color: #fff;
    border-bottom-right-radius: 6rpx;
  }
  &.ai {
    background: #fff; color: #333;
    border-bottom-left-radius: 6rpx;
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  }
}
.bubble-text { font-size: 28rpx; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }

.safety-tag {
  margin-top: 8rpx; padding: 4rpx 16rpx; border-radius: 20rpx;
  background: #FFF8E1; font-size: 22rpx; color: #F57F17;
  &.warn { background: #FFE4E4; color: #E53935; }
}

// 打字动画
.typing-bubble { padding: 24rpx 32rpx; }
.typing-dots { display: flex; gap: 8rpx; }
.dot {
  width: 12rpx; height: 12rpx; border-radius: 50%; background: #CCC;
  animation: dotBounce 1.4s infinite ease-in-out both;
  &:nth-child(1) { animation-delay: -0.32s; }
  &:nth-child(2) { animation-delay: -0.16s; }
  &:nth-child(3) { animation-delay: 0s; }
}
@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.6); }
  40% { transform: scale(1); }
}

.msg-bottom-spacer { height: 20rpx; }

// 底部输入
.bottom-input-bar {
  background: #fff; border-top: 1rpx solid #F0F0F0;
  padding: 16rpx 24rpx;
}
.input-row { display: flex; align-items: center; gap: 16rpx; }
.input-field {
  flex: 1; height: 72rpx; padding: 0 24rpx;
  background: #F5F5F5; border-radius: 36rpx;
  font-size: 28rpx; color: #333;
}
.input-placeholder { color: #BDBDBD; }
.send-btn {
  flex-shrink: 0; width: 100rpx; height: 72rpx; border-radius: 36rpx;
  background: linear-gradient(135deg, $pink, $pink-light);
  display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; color: #fff;
  &.disabled { opacity: 0.5; }
}
.bottom-tools { display: flex; justify-content: center; padding-top: 12rpx; }
.tool-item {
  padding: 8rpx 24rpx; font-size: 22rpx; color: #999;
}
</style>
