<template>
  <view class="chat-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-center" @tap="goToProfile">
        <text class="nav-title">{{ nickname }}</text>
      </view>
      <!-- 右侧仅留胶囊按钮安全区域 -->
      <view class="nav-right" />
    </view>

    <!-- 消息列表 -->
    <scroll-view
      class="message-list"
      scroll-y
      enable-flex
      :scroll-top="scrollTop"
      :scroll-into-view="scrollIntoView"
      @scrolltoupper="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="loadingMore"
      @refresherrefresh="onRefresh"
    >
      <view class="msg-list-inner">
        <view class="msg-top-spacer" />

        <!-- 加载中 -->
        <view v-if="loading" class="sys-tip"><text>加载中...</text></view>

        <!-- 空状态 -->
        <view v-if="!loading && messages.length === 0" class="empty-state">
          <text class="empty-emoji">💬</text>
          <text class="empty-text">还没有消息，主动打个招呼吧~</text>
        </view>

        <!-- 消息列表 -->
        <view
          v-for="(msg, index) in messages"
          :key="msg.id"
          :id="'msg-' + msg.id"
        >
          <!-- 时间戳 -->
          <view v-if="showTimeDivider(index)" class="time-divider">
            <view class="time-badge"><text>{{ formatDate(msg.createdAt) }}</text></view>
          </view>

          <!-- 系统消息 -->
          <view v-if="msg.type === 'system'" class="sys-tip">
            <text>{{ msg.content }}</text>
          </view>

          <!-- 对方消息 -->
          <view v-else-if="!msg.isMine" class="msg-row other">
            <image
              class="avatar"
              :src="otherAvatar"
              mode="aspectFill"
              @error="handleImageError"
              @tap="goToProfile"
            />
            <view class="bubble other" @longpress="handleLongPress(msg)">
              <image
                v-if="isImageMessage(msg)"
                :src="resolveMessageImage(msg.content)"
                mode="widthFix"
                class="msg-img"
                @tap="previewMessageImage(msg)"
                @error="handleImageError"
              />
              <text v-else class="bubble-text">{{ msg.content }}</text>
            </view>
          </view>

          <!-- 自己消息（无头像） -->
          <view v-else class="msg-row mine">
            <view class="bubble mine" @longpress="handleLongPress(msg)">
              <image
                v-if="isImageMessage(msg)"
                :src="resolveMessageImage(msg.content)"
                mode="widthFix"
                class="msg-img"
                @tap="previewMessageImage(msg)"
                @error="handleImageError"
              />
              <text v-else class="bubble-text">{{ msg.content }}</text>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="!loading && noMore && messages.length > 0" class="sys-tip">
          <text>没有更多消息了</text>
        </view>

        <view id="msg-bottom" class="msg-bottom-spacer" />
      </view>
    </scroll-view>

    <!-- 底部输入区域 -->
    <view class="input-area" :style="{ paddingBottom: (keyboardHeight + safeAreaBottom) + 'px' }">
      <!-- 防骗横幅 -->
      <view v-if="showFraudBanner" class="fraud-banner">
        <text class="fraud-text">⚠️ 请勿轻信转账、投资、借款等要求</text>
        <view class="fraud-close" @tap="showFraudBanner = false">
          <text>✕</text>
        </view>
      </view>

      <view class="input-row">
        <!-- AI帮回 -->
        <view class="ai-btn" @tap="openAiSkillPanel">
          <text class="ai-btn-icon">✨</text>
        </view>

        <!-- 输入框 -->
        <view class="input-box">
          <input
            v-model="inputContent"
            class="input-field"
            type="text"
            confirm-type="send"
            :placeholder="placeholder"
            :adjust-position="false"
            @focus="handleFocus"
            @blur="handleBlur"
            @input="handleInput"
            @confirm="handleSend"
          />
        </view>

        <!-- 发送按钮 -->
        <view
          class="send-btn"
          :class="{ disabled: !canSend }"
          @tap="handleSend"
        >
          <text>发送</text>
        </view>
      </view>
    </view>

    <!-- VIP限制弹窗 -->
    <view v-if="showVipLimit" class="vip-overlay" @tap="closeVipLimit">
      <view class="vip-popup" @tap.stop>
        <text class="vip-title">今日消息已用完</text>
        <text class="vip-desc">开通会员即可无限畅聊</text>
        <view class="vip-btn" @tap="goToVip"><text>立即开通</text></view>
        <view class="vip-close" @tap="closeVipLimit"><text>稍后再说</text></view>
      </view>
    </view>

    <!-- AI帮回半层面板 -->
    <ai-chat-skill-panel
      :show="showAiSkillPanel"
      :target-user-id="toUserId"
      @update:show="showAiSkillPanel = $event"
      @send="onAiSkillSend"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import request, { getServerBaseUrl } from '@/utils/request'
import { uploadImage } from '@/utils/upload'
import { useUserStore } from '@/store/user'
import { safeNavigateBack } from '@/utils/navigate'
import { logger } from '@/utils/logger'
import { getFullImageUrl } from '@/utils/common'
import { useImageFallback } from '@/composables/useImageFallback'
import aiChatSkillPanel from '@/components/ai-chat-skill-panel/ai-chat-skill-panel.vue'
const { handleImageError } = useImageFallback()

interface ChatMessage {
  id: number
  fromUserId: number
  toUserId: number
  content: string
  type: string
  isRead: number
  createdAt: string
  isMine: boolean
}

const userStore = useUserStore()
const toUserId = ref(0)
const nickname = ref('')
const avatar = ref('')
const myAvatar = ref('')
const messages = ref<ChatMessage[]>([])
const inputContent = ref('')
const page = ref(1)
const limit = 20
const loading = ref(false)
const loadingMore = ref(false)
const noMore = ref(false)
const scrollTop = ref(0)
const scrollIntoView = ref('')
const keyboardHeight = ref(0)
const statusBarHeight = ref(0)
const safeAreaBottom = ref(0)
const showVipLimit = ref(false)
const showAiSkillPanel = ref(false)
const showFraudBanner = ref(true)
const todayMessageCount = ref(0)
const maxDailyMessages = 3
let pollTimer: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL = 3000

const canSend = computed(() => inputContent.value.trim().length > 0)

const otherAvatar = computed(() => getFullImageUrl(avatar.value) || '/static/default-avatar.png')
const myDisplayAvatar = computed(() => getFullImageUrl(myAvatar.value) || '/static/default-avatar.png')

const placeholder = computed(() => {
  if (!userStore.isVip && todayMessageCount.value >= maxDailyMessages) return '今日消息已用完'
  return '输入消息...'
})

onMounted(() => {
  try {
    // #ifdef MP-WEIXIN
    const sysInfo = uni.getSystemInfoSync()
    statusBarHeight.value = sysInfo.statusBarHeight || 0
    safeAreaBottom.value = sysInfo.safeAreaInsets?.bottom || 0
    // #endif
  } catch {}

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  toUserId.value = parseInt(options.userId) || 0
  nickname.value = decodeURIComponent(options.nickname || '聊天')
  avatar.value = decodeURIComponent(options.avatar || '')
  myAvatar.value = userStore.userInfo?.avatar || ''

  fetchMessages()
  markAsRead()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

const fetchMessages = async (isLoadMore = false) => {
  if (loading.value) return
  try {
    if (isLoadMore) { loadingMore.value = true } else { loading.value = true }

    const res: any = await request({
      url: '/chat/messages',
      method: 'GET',
      data: { userId: toUserId.value, page: page.value, limit },
    })
    const list: ChatMessage[] = res?.list || []
    if (isLoadMore) {
      messages.value.unshift(...list.reverse())
    } else {
      messages.value = list.reverse()
    }
    if (list.length < limit) noMore.value = true
    page.value++
    nextTick(() => scrollToBottom())
  } catch (e) {
    logger.error('fetch messages error', e)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const loadMore = () => {
  if (!loadingMore.value && !noMore.value) fetchMessages(true)
}

const onRefresh = () => fetchMessages(true)

const handleSend = async () => {
  if (!canSend.value) return
  if (!userStore.isVip && todayMessageCount.value >= maxDailyMessages) {
    showVipLimit.value = true
    return
  }

  const content = inputContent.value.trim()
  inputContent.value = ''

  try {
    await request({
      url: '/chat/messages',
      method: 'POST',
      data: { toUserId: toUserId.value, content, type: 'text' },
      skipToast: true,
    })

    messages.value.push({
      id: Date.now(),
      fromUserId: userStore.userInfo?.id || 0,
      toUserId: toUserId.value,
      content,
      type: 'text',
      isRead: 1,
      createdAt: new Date().toISOString(),
      isMine: true,
    })
    todayMessageCount.value++
    nextTick(() => scrollToBottom())
  } catch (e: any) {
    logger.error('send message error', e)
    inputContent.value = content
    const errMsg = e?.message || '发送失败'
    uni.showToast({ title: errMsg, icon: 'none', duration: 2000 })
    if (errMsg && (errMsg.includes('消息已用完') || errMsg.includes('开通会员'))) {
      showVipLimit.value = true
    }
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    scrollIntoView.value = 'msg-bottom'
  })
}

// ---- 时间分割线 ----
const showTimeDivider = (index: number): boolean => {
  if (index === 0) return true
  const cur = new Date(messages.value[index].createdAt)
  const prev = new Date(messages.value[index - 1].createdAt)
  return cur.toDateString() !== prev.toDateString()
}

const formatDate = (timeStr: string): string => {
  const d = new Date(timeStr)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  if (d.toDateString() === now.toDateString()) {
    return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ---- 图片消息 ----
const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i
function isImageMessage(msg: ChatMessage): boolean {
  if (msg.type === 'image') return true
  return IMAGE_EXT_RE.test(msg.content || '')
}

function resolveMessageImage(content: string): string {
  if (!content) return ''
  if (content.startsWith('http://') || content.startsWith('https://') || content.startsWith('wxfile://')) return content
  return getServerBaseUrl() + (content.startsWith('/') ? '' : '/') + content
}

function previewMessageImage(msg: ChatMessage) {
  uni.previewImage({
    urls: [resolveMessageImage(msg.content)],
    current: resolveMessageImage(msg.content),
  })
}

// ---- 输入框事件 ----
const handleFocus = () => nextTick(() => scrollToBottom())
const handleBlur = () => { keyboardHeight.value = 0 }
const handleInput = () => {
  if (inputContent.value.length > 500) {
    inputContent.value = inputContent.value.substring(0, 500)
    uni.showToast({ title: '消息不能超过500字', icon: 'none' })
  }
}

// ---- 菜单 ----
const handleLongPress = (msg: ChatMessage) => {
  const items = msg.isMine
    ? ['复制', '删除', '举报']
    : ['复制', '举报']

  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      const action = items[res.tapIndex]
      if (action === '复制') {
        uni.setClipboardData({ data: msg.content, success: () => uni.showToast({ title: '已复制', icon: 'success' }) })
      } else if (action === '删除') {
        uni.showModal({
          title: '提示',
          content: '确定删除这条消息吗？',
          success: async (modalRes) => {
            if (modalRes.confirm) {
              try {
                await request({ url: `/chat/messages/${msg.id}`, method: 'DELETE' })
                messages.value = messages.value.filter((m) => m.id !== msg.id)
                uni.showToast({ title: '已删除', icon: 'success' })
              } catch { uni.showToast({ title: '删除失败', icon: 'none' }) }
            }
          },
        })
      } else if (action === '举报') {
        reportUser()
      }
    },
  })
}

const goToProfile = () => {
  uni.navigateTo({ url: `/pages/user-detail/index?id=${toUserId.value}` })
}

const reportUser = () => {
  uni.showActionSheet({
    itemList: ['骚扰', '诈骗', '虚假资料', '其他'],
    success: (res) => {
      const reasons = ['骚扰', '诈骗', '虚假资料', '其他']
      const reason = reasons[res.tapIndex] || '其他'
      uni.showModal({
        title: '确认举报',
        content: `确定以"${reason}"为由举报该用户吗？`,
        success: async (modalRes) => {
          if (modalRes.confirm) {
            try {
              await request({ url: `/reports`, method: 'POST', data: { targetUserId: toUserId.value, reason } })
              uni.showToast({ title: '已举报，我们会尽快处理', icon: 'success' })
            } catch {
              uni.showToast({ title: '举报失败，请稍后重试', icon: 'none' })
            }
          }
        },
      })
    },
  })
}

// ---- 已读 ----
const markAsRead = async () => {
  try { await request({ url: `/chat/messages/${toUserId.value}/read`, method: 'PUT' }) } catch {}
}

// ---- 轮询 ----
const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const res: any = await request({
        url: '/chat/messages/poll',
        method: 'GET',
        data: { userId: toUserId.value, afterId: messages.value.length > 0 ? messages.value[messages.value.length - 1].id : 0 },
        skipToast: true,
      })
      const newMsgs: ChatMessage[] = res?.list || []
      if (newMsgs.length > 0) {
        const ids = new Set(messages.value.map(m => m.id))
        const unique = newMsgs.filter(m => !ids.has(m.id))
        if (unique.length > 0) {
          messages.value.push(...unique)
          nextTick(() => scrollToBottom())
        }
      }
    } catch {
      stopPolling()
    }
  }, POLL_INTERVAL)
}

const stopPolling = () => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

// ---- VIP ----
const goToVip = () => { showVipLimit.value = false; uni.switchTab({ url: '/pages/vip/index' }) }
const closeVipLimit = () => { showVipLimit.value = false }

const openAiSkillPanel = () => {
  if (!userStore.isVip && todayMessageCount.value >= maxDailyMessages) { showVipLimit.value = true; return }
  showAiSkillPanel.value = true
}

const onAiSkillSend = (text: string) => { inputContent.value = text; handleSend() }

const handleBack = () => safeNavigateBack()
</script>

<style lang="scss" scoped>
$pink: #FF6B8A;
$pink-light: #FF8FA8;
$bg: #F5F5F5;

// ==================== 页面 ====================
.chat-page {
  width: 100vw; height: 100vh;
  display: flex; flex-direction: column;
  background: $bg;
  overflow: hidden;
}

// ==================== 导航栏 ====================
$nav-right-width: 190rpx; // 微信胶囊按钮安全间距

.nav-bar {
  flex-shrink: 0;
  display: flex; align-items: center;
  height: 88rpx; padding: 0 32rpx; box-sizing: content-box;
  background: linear-gradient(135deg, $pink, $pink-light);
  z-index: 100;
}
.nav-left { width: 80rpx; flex-shrink: 0; }
.back-icon { font-size: 44rpx; color: #fff; font-weight: bold; }
.nav-center {
  flex: 1; display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.nav-title {
  font-size: 34rpx; font-weight: 600; color: #fff;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.nav-right {
  width: $nav-right-width; flex-shrink: 0;
}

// ==================== 消息列表 ====================
.message-list {
  flex: 1; min-height: 0;
}
.msg-list-inner {
  padding: 0 32rpx;
}

.msg-top-spacer { height: 16rpx; }
.msg-bottom-spacer { height: 40rpx; }

// 系统提示 / 空状态
.sys-tip {
  display: flex; justify-content: center;
  padding: 24rpx 0;
  text { font-size: 24rpx; color: #BDBDBD; }
}

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 120rpx 32rpx;
}
.empty-emoji { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #BDBDBD; }

// 时间分割线
.time-divider {
  display: flex; justify-content: center;
  padding: 20rpx 0 16rpx;
}
.time-badge {
  background: #E0E0E0; border-radius: 8rpx;
  padding: 6rpx 20rpx;
  text { font-size: 22rpx; color: #999; }
}

// ==================== 消息行 ====================
.msg-row {
  margin-bottom: 8rpx;
  display: flex; align-items: flex-start;
  box-sizing: border-box;

  &.mine {
    justify-content: flex-end;
  }
  &.other {
    justify-content: flex-start;
  }
}
// 说话人切换加间距（js 侧无法感知 .msg-row 不切换，但基本够用）

// 头像
.avatar {
  width: 72rpx; height: 72rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  margin-top: 4rpx;
}

// 气泡
.bubble {
  max-width: 70%;
  padding: 18rpx 24rpx;
  border-radius: 16rpx;
  word-break: break-word;
  overflow-wrap: break-word;
  box-sizing: border-box;
  display: inline-block;
  overflow: hidden;

  // 对方：白色 / 左对齐
  &.other {
    background: #fff;
    border-top-left-radius: 4rpx;
    margin-left: 16rpx;
    box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.04);
  }

  // 自己：粉色 / 右对齐
  &.mine {
    background: linear-gradient(135deg, $pink, $pink-light);
    border-top-right-radius: 4rpx;
  }
}

.bubble-text {
  font-size: 28rpx; line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  display: block;
  .bubble.other & { color: #333; }
  .bubble.mine &  { color: #fff; }
}

// 图片消息
.msg-img {
  max-width: 360rpx; border-radius: 8rpx; display: block;
}

// ==================== 底部输入区域 ====================
.input-area {
  flex-shrink: 0;
  background: #fff;
  border-top: 1rpx solid #E5E5E5;
  z-index: 10;
}

// 防骗横幅
.fraud-banner {
  display: flex; align-items: center;
  margin: 12rpx 24rpx 0;
  padding: 12rpx 20rpx;
  background: #FFF8E1; border-radius: 12rpx;
}
.fraud-text { flex: 1; font-size: 22rpx; color: #F57F17; }
.fraud-close {
  width: 36rpx; height: 36rpx; display: flex; align-items: center; justify-content: center;
  font-size: 22rpx; color: #999; flex-shrink: 0;
  margin-left: 12rpx;
}

// 输入行
.input-row {
  display: flex; align-items: center;
  padding: 12rpx 24rpx;
  gap: 16rpx;
}

.ai-btn {
  width: 68rpx; height: 68rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba($pink, 0.08), rgba($pink-light, 0.12));
  border-radius: 50%;
}
.ai-btn-icon { font-size: 36rpx; }

.input-box {
  flex: 1; height: 68rpx;
  background: #F5F5F5; border-radius: 34rpx;
  display: flex; align-items: center;
  padding: 0 24rpx;
}
.input-field {
  width: 100%; height: 68rpx;
  font-size: 28rpx; color: #333; line-height: 68rpx;
}

.send-btn {
  flex-shrink: 0;
  width: 120rpx; height: 68rpx; border-radius: 34rpx;
  background: linear-gradient(135deg, $pink, $pink-light);
  display: flex; align-items: center; justify-content: center;
  text { font-size: 28rpx; color: #fff; font-weight: 600; }
  &.disabled { opacity: 0.45; }
}

// ==================== VIP弹窗 ====================
.vip-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1100;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
}
.vip-popup {
  width: 560rpx; background: #fff; border-radius: 24rpx;
  padding: 48rpx 40rpx; display: flex; flex-direction: column; align-items: center;
}
.vip-title { font-size: 34rpx; font-weight: bold; color: #1A1A1A; margin-bottom: 12rpx; }
.vip-desc { font-size: 26rpx; color: #999; margin-bottom: 36rpx; }
.vip-btn {
  width: 100%; height: 88rpx; border-radius: 44rpx;
  background: linear-gradient(135deg, $pink, $pink-light);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20rpx;
  text { font-size: 30rpx; color: #fff; font-weight: 600; }
}
.vip-close { text { font-size: 26rpx; color: #BDBDBD; } }

</style>
