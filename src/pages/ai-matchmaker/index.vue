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
    <view class="nav-bar-placeholder" />

    <!-- 剩余次数提示 -->
    <view v-if="remainingRounds !== null && remainingRounds <= 3" class="quota-bar">
      <text class="quota-text">今日免费咨询剩余 {{ remainingRounds }} 轮</text>
    </view>

    <!-- 对话消息列表 -->
    <scroll-view
      class="chat-scroll"
      :scroll-y="true"
      :scroll-with-animation="true"
      :scroll-into-view="scrollToId"
      :scroll-top="scrollTopVal"
      :enhanced="true"
      :show-scrollbar="false"
    >
      <view class="chat-inner">
      <view id="msg-top" class="msg-top-spacer" />
      <!-- 欢迎语 -->
      <view v-if="messages.length === 0" class="welcome-block">
        <text class="welcome-emoji">💝</text>
        <text class="welcome-title">Hi~ 我是你的AI红娘</text>
        <text class="welcome-desc">恋爱困惑、约会建议、相处技巧...尽管问我</text>
      </view>

      <!-- 消息气泡 -->
      <view
        v-for="(msg, i) in messages"
        :key="i"
        :id="'msg-' + i"
        class="msg-row"
        :class="msg.role"
      >
        <view class="bubble" :class="msg.role">
          <text class="bubble-text">{{ msg.content }}</text>
        </view>
        <view v-if="msg.safetyNotice === 'safety_boundary'" class="safety-tag">
          <text>{{ systemStore.matchmakerSafetyBoundaryLabel }}</text>
        </view>
        <view v-if="msg.safetyNotice === 'input_violation'" class="safety-tag warn">
          <text>{{ systemStore.matchmakerSafetyLabel }}</text>
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
      </view>
    </scroll-view>

    <!-- 底部区域 -->
    <view class="bottom-area" :style="{ paddingBottom: safeAreaBottom + 'px' }">
      <!-- 快捷问题横向滚动 -->
      <scroll-view class="quick-bar" :scroll-x="true" :show-scrollbar="false">
        <view class="quick-bar-inner">
          <text
            v-for="(q, i) in quickQuestions"
            :key="i"
            class="quick-tag"
            @tap="sendQuick(q)"
          >{{ q.content }}</text>
        </view>
      </scroll-view>

      <!-- 输入框行 -->
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

      <!-- 重置对话 -->
      <view class="reset-row" @tap="clearChat">
        <text class="reset-icon">↻</text>
        <text class="reset-text">重置对话</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import request from '@/utils/request'
import { useSystemStore } from '@/store/system'

const systemStore = useSystemStore()

interface Message {
  role: 'user' | 'ai'
  content: string
  safetyNotice?: string
}

interface QuickQuestion {
  id: number
  content: string
  sort: number
}

const messages = ref<Message[]>([])
const inputText = ref('')
const typing = ref(false)
const remainingRounds = ref<number | null>(null)
const scrollToId = ref('')
const scrollTopVal = ref(0)
const quickQuestions = ref<QuickQuestion[]>([])
const statusBarHeight = ref(0)
const safeAreaBottom = ref(0)

onMounted(async () => {
  try {
    // #ifdef MP-WEIXIN
    const sysInfo = uni.getSystemInfoSync()
    statusBarHeight.value = sysInfo.statusBarHeight || 0
    safeAreaBottom.value = sysInfo.safeAreaInsets?.bottom || 0
    // #endif
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
    }
    if (res?.remainingRounds !== undefined) {
      remainingRounds.value = res.remainingRounds
    }
  } catch {}
  scrollToBottom()
}

const loadQuickQuestions = async () => {
  try {
    const res: any = await request({ url: '/ai/matchmaker/quick-questions', method: 'GET' })
    if (Array.isArray(res)) {
      quickQuestions.value = res
    }
  } catch {
    // 后端不返回时使用默认问题
    quickQuestions.value = [
      { id: 0, content: '第一次约会去哪', sort: 0 },
      { id: 0, content: '怎么开场聊天', sort: 1 },
      { id: 0, content: '对方冷淡怎么办', sort: 2 },
      { id: 0, content: '约会穿搭建议', sort: 3 },
      { id: 0, content: '怎么判断对方真心', sort: 4 },
    ]
  }
}

const sendQuick = (q: QuickQuestion) => {
  inputText.value = q.content
  // 上报点击统计（异步，不阻塞）
  if (q.id > 0) {
    request({ url: `/ai/matchmaker/quick-questions/${q.id}/click`, method: 'POST' }).catch(() => {})
  }
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
  } catch {
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
  } catch {}
  messages.value = []
  scrollToTop()
  uni.showToast({ title: '对话已重置', icon: 'none', duration: 1500 })
}

const scrollToTop = () => {
  // 先清 scroll-into-view 避免冲突
  scrollToId.value = ''
  nextTick(() => {
    scrollTopVal.value = 0
    // 强制触发响应式，如果当前已经是 0 则设为 -1 再设回 0
    setTimeout(() => { scrollTopVal.value = scrollTopVal.value + 1 }, 50)
    setTimeout(() => { scrollTopVal.value = 0 }, 100)
  })
}

const scrollToBottom = () => {
  scrollToId.value = ''
  nextTick(() => {
    // 设一个极大值，scroll-view 会自动截断到最大可滚动高度
    scrollTopVal.value = 99999
    // 重新设一次以确保触发
    setTimeout(() => { scrollTopVal.value = 99999 }, 50)
  })
}
</script>

<style lang="scss" scoped>
$pink: #FF6B8A;
$pink-light: #FF8FA8;
$nav-right-width: 190rpx; // 微信胶囊按钮安全间距

.ai-matchmaker-page {
  width: 100vw; height: 100vh;
  display: flex; flex-direction: column;
  background: #F8F8F8;
}

// ==================== 导航栏 ====================
.nav-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32rpx; height: 88rpx; box-sizing: content-box;
  background: linear-gradient(135deg, #FF6B8A, #FF8FA8);
}
.nav-bar-placeholder {
  height: 88rpx; flex-shrink: 0;
}
.nav-left, .nav-right {
  display: flex; align-items: center;
  width: 80rpx;
  flex-shrink: 0;
}
.nav-right {
  justify-content: flex-end;
  width: $nav-right-width;
}
.back-icon { font-size: 44rpx; color: #fff; font-weight: bold; text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.4); }
.nav-title {
  flex: 1; text-align: center;
  font-size: 32rpx; color: #fff; font-weight: bold;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.4);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  margin-right: $nav-right-width;
}

// ==================== 配额提示 ====================
.quota-bar {
  padding: 12rpx 32rpx; background: #FFF8F0;
  text-align: center;
}
.quota-text { font-size: 24rpx; color: #FF9500; }

// ==================== 聊天区域 ====================
.chat-scroll {
  flex: 1; overflow-y: auto;
  // padding 对 scroll-view 子元素边界可能截断，改用内层容器
}
.chat-inner {
  padding: 24rpx 32rpx;
}

// 欢迎语
.welcome-block {
  display: flex; flex-direction: column; align-items: center;
  padding: 80rpx 0;
}
.welcome-emoji { font-size: 80rpx; margin-bottom: 20rpx; }
.welcome-title { font-size: 36rpx; font-weight: bold; color: #1A1A1A; margin-bottom: 12rpx; }
.welcome-desc { font-size: 26rpx; color: #999; }

// ==================== 消息气泡 ====================
.msg-row {
  margin-bottom: 24rpx; display: flex; flex-direction: column;
  &.user { align-items: flex-end; }
  &.ai { align-items: flex-start; }
}

.bubble {
  // 用户气泡最宽 70%，防止右侧截断
  max-width: 70%; padding: 20rpx 28rpx; border-radius: 24rpx;
  overflow: hidden; display: inline-block;
  &.user {
    background: linear-gradient(135deg, $pink, $pink-light); color: #fff;
    border-bottom-right-radius: 6rpx;
    align-self: flex-end;
  }
  &.ai {
    background: #fff; color: #333;
    border-bottom-left-radius: 6rpx;
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
    align-self: flex-start;
  }
}
.bubble-text {
  font-size: 28rpx; line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  display: block;
}

// ==================== 安全标签 ====================
.safety-tag {
  margin-top: 8rpx; padding: 4rpx 16rpx; border-radius: 20rpx;
  background: #FFF8E1; font-size: 22rpx; color: #F57F17;
  &.warn { background: #FFE4E4; color: #E53935; }
}

// ==================== 打字动画 ====================
.typing-bubble { padding: 24rpx 36rpx; }
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

.msg-top-spacer { height: 1rpx; }
.msg-bottom-spacer { height: 80rpx; }

// ==================== 底部区域 ====================
.bottom-area {
  background: #fff; border-top: 1rpx solid #F0F0F0;
  padding: 12rpx 24rpx 0;
}

// 快捷问题横向滚动
.quick-bar {
  white-space: nowrap;
  margin-bottom: 12rpx;
}
.quick-bar-inner {
  display: flex; gap: 16rpx;
  padding: 4rpx 0;
  padding-left: 16rpx;
}
.quick-tag {
  flex-shrink: 0;
  min-width: 100rpx;
  padding: 12rpx 24rpx; border-radius: 36rpx;
  background: #FFF0F3; border: 1rpx solid rgba(255, 107, 138, 0.25);
  font-size: 24rpx; color: $pink; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; max-width: 220rpx;
  transition: all 0.2s;
  &:active { background: rgba(255, 107, 138, 0.1); }
}

// 输入行
.input-row {
  display: flex; align-items: center; gap: 16rpx;
  padding-bottom: 4rpx;
}
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

// 重置按钮
.reset-row {
  display: flex; align-items: center; justify-content: center;
  padding: 10rpx 0 12rpx;
}
.reset-icon {
  font-size: 24rpx; color: #BDBDBD; margin-right: 6rpx;
}
.reset-text {
  font-size: 22rpx; color: #BDBDBD;
}
</style>
