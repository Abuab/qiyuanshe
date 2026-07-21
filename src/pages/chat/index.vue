<template>
  <view class="chat-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title-wrap">
        <text class="nav-title">{{ nickname }}</text>
      </view>
      <!-- 右侧仅留胶囊按钮安全区域 -->
      <view class="nav-right" />
    </view>

    <!-- 二级菜单栏 -->
    <view class="sub-nav-bar">
      <view class="sub-nav-left" @tap="goToProfile">
        <image class="sub-avatar" :src="otherAvatar" mode="aspectFill" @error="handleImageError" />
        <text class="sub-nickname">{{ nickname }}</text>
      </view>
      <view class="sub-nav-right" @tap="showChatMenu">
        <text class="sub-more">...</text>
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view
      class="message-list"
      scroll-y
      enable-flex
      :scroll-into-view="scrollIntoView"
      @scrolltoupper="loadMore"
      @scroll="onScroll"
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

        <!-- 消息列表（按时间正序：最早在上，最新在下） -->
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

        <!-- 新消息提示 -->
        <view v-if="showNewMsgTip" class="new-msg-tip" @tap="scrollToBottom">
          <text>有新消息 ↓</text>
        </view>

        <view id="msg-bottom" class="msg-bottom-spacer" />
      </view>
    </scroll-view>

    <!-- 聊天权限遮罩 -->
    <view v-if="showChatMask" class="chat-permission-mask">
      <text class="permission-text">互相心动或开通VIP即可畅聊</text>
      <view class="permission-btn" @tap="goToVipFromMask">
        <text>去开通</text>
      </view>
    </view>

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
        <view v-if="systemStore.isAiFeatureEnabled('chat_skill')" class="ai-btn" @tap="openAiSkillPanel">
          <text class="ai-btn-icon">✨</text>
          <text class="ai-btn-text">AI帮回</text>
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

        <!-- 剩余条数 -->
        <text v-if="showRemainingHint" class="remaining-hint">还剩{{ remainingMessages }}条</text>

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
import { onShow, onHide } from '@dcloudio/uni-app'
import request, { getServerBaseUrl } from '@/utils/request'
import { uploadImage } from '@/utils/upload'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { safeNavigateBack } from '@/utils/navigate'
import { logger } from '@/utils/logger'
import { getFullImageUrl } from '@/utils/common'
import { useImageFallback } from '@/composables/useImageFallback'
import { icons } from '@/config/icons'
import { requireLogin } from '@/utils/auth'
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
const systemStore = useSystemStore()
const toUserId = ref(0)
const nickname = ref('')
const avatar = ref('')
const myAvatar = ref('')
const messages = ref<ChatMessage[]>([])
const inputContent = ref('')
const limit = 20
const loading = ref(false)
const loadingMore = ref(false)
const noMore = ref(false)
const scrollIntoView = ref('') // 修复：使用 scroll-into-view 方式滚动到底部，彻底消除 scroll-top 先置0导致的闪动
const keyboardHeight = ref(0)
const statusBarHeight = ref(0)
const safeAreaBottom = ref(0)
const showVipLimit = ref(false)
const showChatMask = ref(false)
const showRemainingHint = ref(false)
const remainingMessages = ref(0)
const isMatched = ref(false)
const totalSentMessages = ref(0)
const maxFreeMessages = 3
const showAiSkillPanel = ref(false)
const showFraudBanner = ref(true)
const todayMessageCount = ref(0)
const maxDailyMessages = 3
const isSending = ref(false) // 发送中标记，防止轮询干扰乐观更新

// 轮询相关
let pollTimer: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL = 2500
const isPageMounted = ref(false)
const isUserScrolledUp = ref(false)
const showNewMsgTip = ref(false)
const scrollLockUntil = ref(0) // 滚动锁定时长，防止 onScroll 在 scrollToBottom 动画期间覆盖状态
let lastScrollToBottomTime = 0 // 修复：scrollToBottom 最短调用间隔（300ms 防抖），防止短时间内多次调用导致反复跳动
let tempMsgIdCounter = -1 // 临时消息 ID（负数避免与后端自增 ID 冲突）
const seenMsgIds = new Set<number>() // 已处理消息 ID，防重复

const canSend = computed(() => inputContent.value.trim().length > 0)

const otherAvatar = computed(() => getFullImageUrl(avatar.value) || icons.common.defaultAvatar)

const placeholder = computed(() => {
  if (!userStore.isVip && todayMessageCount.value >= maxDailyMessages) return '今日消息已用完'
  return '输入消息...'
})

// ===== 生命周期 =====
onMounted(() => {
  if (!requireLogin()) return

  try {
    const sysInfo = uni.getSystemInfoSync()
    statusBarHeight.value = sysInfo.statusBarHeight || 0
    const raw = (sysInfo as any).safeAreaInsets?.bottom ?? sysInfo.safeArea?.bottom ?? 0
    safeAreaBottom.value = raw > 0 ? raw : (sysInfo.platform === 'android' ? 28 : 0)
  } catch {}

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  toUserId.value = parseInt(options.userId) || 0
  nickname.value = decodeURIComponent(options.displayName || options.nickname || '聊天')
  avatar.value = decodeURIComponent(options.avatar || '')
  myAvatar.value = userStore.userInfo?.avatar || ''

  fetchMessages()
  markAsRead()
  startPolling()
  checkChatPermission()
  isPageMounted.value = true
})

// 修复 E：页面重新显示时立即轮询一次 + 重启定时器
onShow(() => {
  // 同步 AI 功能开关状态（force=true 确保每次显示都拉最新配置）
  systemStore.loadAiFeatureConfig(true)
  if (!isPageMounted.value) return
  // 立即拉取最新消息（不等待 2.5 秒轮询）
  pollOnce()
  // 重启轮询定时器（如果之前被 onHide 停止了）
  startPolling()
})

// 修复 A：页面隐藏时清除轮询，防止后台持续请求
onHide(() => {
  stopPolling()
})

onUnmounted(() => {
  stopPolling()
  isPageMounted.value = false
})

// ===== 消息加载 =====
const fetchMessages = async (isLoadMore = false) => {
  if (loading.value || loadingMore.value) return
  try {
    if (isLoadMore) { loadingMore.value = true } else { loading.value = true }

    const params: any = { userId: toUserId.value, limit }
    if (isLoadMore && messages.value.length > 0) {
      // 上拉加载更多：传最旧消息的 id 作为 beforeId，加载更早的消息
      params.beforeId = messages.value[0].id
      console.log('[Chat] fetchMessages loadMore beforeId=', params.beforeId, 'currentMsgCount=', messages.value.length)
    } else {
      // 首次加载：不传 beforeId（或传 0），后端返回最新的 limit 条
      params.beforeId = 0
      console.log('[Chat] fetchMessages firstLoad userId=', toUserId.value, 'limit=', limit)
    }

    const res: any = await request({
      url: '/chat/messages',
      method: 'GET',
      data: params,
    })
    const list: ChatMessage[] = res?.list || []
    console.log('[Chat] fetchMessages response listLen=', list.length, 'total=', res?.total, 'firstId=', list[0]?.id, 'lastId=', list[list.length - 1]?.id)

    if (isLoadMore) {
      // 加载更早的历史消息，unshift 到现有消息前面
      messages.value.unshift(...list)
      console.log('[Chat] fetchMessages unshifted, newTotalMsgCount=', messages.value.length)
    } else {
      // 首次加载，直接赋值
      messages.value = list
    }
    // 同步已加载消息 ID，防止轮询重复添加
    list.forEach(m => seenMsgIds.add(m.id))

    // 只有当返回数量小于 limit 时才算没有更多
    if (list.length < limit) noMore.value = true
    else noMore.value = false
    console.log('[Chat] fetchMessages noMore=', noMore.value)

    if (!isLoadMore) {
      // 首次加载：nextTick 等 DOM 渲染后滚动到底部
      nextTick(() => scrollToBottom())
    }
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

// ===== 发送消息 =====
const handleSend = async () => {
  if (!canSend.value) return
  if (!userStore.isVip && todayMessageCount.value >= maxDailyMessages) {
    showVipLimit.value = true
    return
  }

  const content = inputContent.value.trim()
  inputContent.value = ''
  isSending.value = true
  const tempId = --tempMsgIdCounter

  try {
    await request({
      url: '/chat/messages',
      method: 'POST',
      data: { toUserId: toUserId.value, content, type: 'text' },
      skipToast: true,
    })

    // 乐观更新：将消息追加到末尾（最新在下方）
    showNewMsgTip.value = false
    messages.value.push({
      id: tempId,
      fromUserId: userStore.userInfo?.id || 0,
      toUserId: toUserId.value,
      content,
      type: 'text',
      isRead: 1,
      createdAt: new Date().toISOString(),
      isMine: true,
    })
    todayMessageCount.value++
    console.log('[Chat] handleSend optimistic, msgCount=', messages.value.length)
    nextTick(() => scrollToBottom())
  } catch (e: any) {
    logger.error('send message error', e)
    messages.value = messages.value.filter(m => m.id !== tempId)
    inputContent.value = content
    const errMsg = e?.message || '发送失败'
    uni.showToast({ title: errMsg, icon: 'none', duration: 2000 })
    if (errMsg && (errMsg.includes('消息已用完') || errMsg.includes('开通会员'))) {
      showVipLimit.value = true
    }
  } finally {
    // 延迟清除 isSending，等 scrollToBottom 的 nextTick 执行完
    setTimeout(() => { isSending.value = false }, 200)
  }
}

// ===== 滚动到底部（使用 scroll-into-view 方式，彻底消除 scroll-top 先置0导致的闪动） =====
const scrollToBottom = () => {
  // 最短调用间隔 300ms 防抖，防止短时间内多次调用导致跳动
  const now = Date.now()
  if (now - lastScrollToBottomTime < 300) {
    console.log('[Chat] scrollToBottom throttled, lastCall', now - lastScrollToBottomTime, 'ms ago')
    return
  }
  lastScrollToBottomTime = now

  console.log('[Chat] scrollToBottom called, isUserScrolledUp=', isUserScrolledUp.value, 'msgCount=', messages.value.length)
  isUserScrolledUp.value = false
  showNewMsgTip.value = false
  if (messages.value.length === 0) return

  // 锁定 800ms，防止滚动期间的 onScroll 把 isUserScrolledUp 改回 true
  scrollLockUntil.value = Date.now() + 800

  // 先置空再设 msg-bottom，确保值有变化，scroll-view 才会响应滚动
  scrollIntoView.value = ''
  nextTick(() => {
    scrollIntoView.value = 'msg-bottom'
  })
}

// 监听滚动事件
let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null
const onScroll = (e: any) => {
  if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer)
  scrollDebounceTimer = setTimeout(() => {
    // 滚动锁定期间不更新 isUserScrolledUp（scrollToBottom 动画中）
    if (Date.now() < scrollLockUntil.value) {
      console.log('[Chat] onScroll locked, skip')
      return
    }
    const detail = e?.detail || {}
    const scrollTopVal = detail.scrollTop ?? 0
    const scrollHeight = detail.scrollHeight ?? 0
    const clientHeight = detail.clientHeight ?? 0
    const distanceToBottom = scrollHeight - scrollTopVal - clientHeight
    isUserScrolledUp.value = distanceToBottom > 100
    console.log('[Chat] onScroll distanceToBottom=', distanceToBottom, 'isUserScrolledUp=', isUserScrolledUp.value)
    if (!isUserScrolledUp.value) {
      showNewMsgTip.value = false
    }
  }, 150)
}

// ---- 时间分割线 ----
const showTimeDivider = (index: number): boolean => {
  if (index === 0) return true
  const cur = new Date(messages.value[index].createdAt)
  const prev = new Date(messages.value[index - 1].createdAt)
  // 跨天一定显示
  if (cur.toDateString() !== prev.toDateString()) return true
  // 同一天内，间隔超过 5 分钟显示
  const diffMs = cur.getTime() - prev.getTime()
  return diffMs >= 5 * 60 * 1000
}

const formatDate = (timeStr: string): string => {
  const d = new Date(timeStr)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  if (d.toDateString() === now.toDateString()) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  // 昨天
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  if (d.toDateString() === yesterday.toDateString()) {
    return `昨天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  // 今年内
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  // 跨年
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
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
const handleFocus = () => { /* keyboardHeight handled by adjust-position */ }
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

const showChatMenu = () => {
  uni.showActionSheet({
    itemList: ['查看个人资料', '清空聊天记录', '举报'],
    success: (res) => {
      if (res.tapIndex === 0) {
        goToProfile()
      } else if (res.tapIndex === 1) {
        uni.showModal({
          title: '提示',
          content: '确定清空与该用户的聊天记录吗？',
          success: async (modalRes) => {
            if (modalRes.confirm) {
              try {
                await request({ url: `/chat/conversations/${toUserId.value}`, method: 'DELETE' })
                messages.value = []
                uni.showToast({ title: '已清空', icon: 'success' })
              } catch { uni.showToast({ title: '操作失败', icon: 'none' }) }
            }
          },
        })
      } else if (res.tapIndex === 2) {
        reportUser()
      }
    },
  })
}

const reportUser = () => {
  const reasonItems = [
    { label: '骚扰', value: 'harassment' },
    { label: '诈骗', value: 'fraud' },
    { label: '虚假资料', value: 'fake_info' },
    { label: '其他', value: 'other' },
  ]
  uni.showActionSheet({
    itemList: reasonItems.map(r => r.label),
    success: (res) => {
      const item = reasonItems[res.tapIndex] || reasonItems[3]
      uni.showModal({
        title: '确认举报',
        content: `确定以"${item.label}"为由举报该用户吗？`,
        success: async (modalRes) => {
          if (modalRes.confirm) {
            try {
              await request({ url: `/users/reports`, method: 'POST', data: { targetId: toUserId.value, type: 'user', reason: item.value } })
              uni.showToast({ title: '举报已提交', icon: 'success' })
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
  try {
    await request({ url: `/chat/messages/${toUserId.value}/read`, method: 'PUT' })
    uni.$emit('tabbar:refreshUnread')
  } catch (e) {
    logger.error('markAsRead failed:', e)
  }
}

// ===== 修复 A：轮询拉取新消息 =====
const pollOnce = async () => {
  if (!toUserId.value) return
  if (isSending.value) return // 发送中，跳过轮询避免干扰乐观更新
  try {
    // 取本地最后一条服务的消息 id（跳过负数临时 ID）
    const lastMsgId = messages.value.length > 0 ? Math.max(0, messages.value[messages.value.length - 1].id) : 0
    const res: any = await request({
      url: '/chat/messages/poll',
      method: 'GET',
      data: { userId: toUserId.value, afterId: lastMsgId },
      skipToast: true,
    })
    const newMsgs: ChatMessage[] = res?.list || []
    if (newMsgs.length > 0) {
      console.log('[Chat] poll got', newMsgs.length, 'new, afterId=', lastMsgId, 'ids=', newMsgs.map(m => m.id))
      const toAdd: ChatMessage[] = []
      const myContents = new Set<string>()
      // 建立已有消息 ID 集合，防御性去重（包括 seenMsgIds 和当前 messages 列表）
      const existingIds = new Set(seenMsgIds)
      messages.value.forEach(m => { if (m.id >= 0) existingIds.add(m.id) })
      for (const m of newMsgs) {
        if (existingIds.has(m.id)) continue
        existingIds.add(m.id)
        toAdd.push(m)
        if (m.isMine) myContents.add(m.content)
      }
      if (toAdd.length > 0) {
        // 一次性合并数组，只触发一次渲染，避免中间态导致 onScroll 误判
        messages.value = [
          ...messages.value.filter(m => !(m.id < 0 && myContents.has(m.content))),
          ...toAdd,
        ]
        // 按时间正序排列（旧→新），防止后端返回消息乱序
        messages.value.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        console.log('[Chat] poll merged, total=', messages.value.length, 'added=', toAdd.length)
        // 同步 seenMsgIds，防止后续轮询重复添加
        toAdd.forEach(m => { if (m.id >= 0) seenMsgIds.add(m.id) })
        // 只有收到对方的消息时才提示"新消息"（自己的消息由 send 时自动滚动处理）
        const hasOtherMsg = toAdd.some(m => !m.isMine)
        console.log('[Chat] poll hasOtherMsg=', hasOtherMsg, 'isUserScrolledUp=', isUserScrolledUp.value, 'isSending=', isSending.value)
        if (hasOtherMsg && isUserScrolledUp.value) {
          showNewMsgTip.value = true
          console.log('[Chat] poll showing newMsgTip')
        } else if (!isUserScrolledUp.value) {
          console.log('[Chat] poll autoScroll')
          nextTick(() => scrollToBottom())
        } else {
          // 只有自己的消息回执，清除提示（send 时已处理）
          showNewMsgTip.value = false
        }
        markAsRead()
      }
    }
  } catch {
    // 轮询静默失败，不弹 toast
  }
}

const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(() => {
    pollOnce()
  }, POLL_INTERVAL)
}

const stopPolling = () => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

// ---- VIP ----
const goToVip = () => { showVipLimit.value = false; uni.switchTab({ url: '/pages/vip/index' }) }
const goToVipFromMask = () => { uni.navigateTo({ url: '/pages/vip/index' }) }
const closeVipLimit = () => { showVipLimit.value = false }

// ===== 聊天权限检查 =====
async function checkChatPermission() {
  try {
    const matchRes: any = await request({ url: '/users/matches', method: 'GET' })
    const matches: any[] = matchRes.code === 0 ? (matchRes.data?.list || matchRes.data || []) : []
    isMatched.value = matches.some((m: any) => m.id === toUserId.value)

    if (isMatched.value) {
      showChatMask.value = false
      showRemainingHint.value = false
      return
    }

    if (userStore.isVip) {
      showChatMask.value = false
      showRemainingHint.value = false
      return
    }

    const msgRes: any = await request({
      url: '/chat/messages',
      method: 'GET',
      data: { userId: toUserId.value, direction: 'sent' },
    })
    if (msgRes) {
      const msgs = msgRes.list || msgRes.messages || msgRes.data || []
      totalSentMessages.value = msgs.length
    }

    if (totalSentMessages.value >= maxFreeMessages) {
      showChatMask.value = true
      showRemainingHint.value = false
    } else {
      showChatMask.value = false
      remainingMessages.value = maxFreeMessages - totalSentMessages.value
      showRemainingHint.value = true
    }
  } catch {
    showChatMask.value = false
    showRemainingHint.value = false
  }
}

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
$nav-side-width: 88rpx; // 左右固定宽度，确保昵称居中

.nav-bar {
  flex-shrink: 0;
  display: flex; align-items: center;
  height: 88rpx; padding: 0 16rpx; box-sizing: content-box;
  background: linear-gradient(135deg, $pink, $pink-light);
  z-index: 100;
  /* 顶部安全区 CSS 兜底（刘海屏/灵动岛） */
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}
.nav-left {
  width: $nav-side-width; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.back-icon { font-size: 44rpx; color: #fff; font-weight: bold; }
.nav-title-wrap {
  flex: 1; text-align: center; overflow: hidden;
}
.nav-title {
  font-size: 34rpx; font-weight: 600; color: #fff;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.nav-right {
  width: $nav-side-width; flex-shrink: 0;
}

// ==================== 二级菜单栏 ====================
.sub-nav-bar {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  height: 80rpx; padding: 0 32rpx;
  background: #fff;
  border-bottom: 1px solid #E5E5E5;
  z-index: 99;
}
.sub-nav-left {
  display: flex; align-items: center; gap: 16rpx;
}
.sub-avatar {
  width: 64rpx; height: 64rpx; border-radius: 50%; flex-shrink: 0;
}
.sub-nickname {
  font-size: 28rpx; font-weight: 500; color: #333;
}
.sub-nav-right {
  width: 64rpx; height: 64rpx;
  display: flex; align-items: center; justify-content: center;
}
.sub-more {
  font-size: 36rpx; color: #333; font-weight: bold; letter-spacing: 4rpx;
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

// 新消息提示
.new-msg-tip {
  display: flex; justify-content: center;
  padding: 16rpx 0;
  text {
    font-size: 24rpx; color: $pink;
    background: rgba(255, 107, 138, 0.1);
    padding: 8rpx 32rpx; border-radius: 24rpx;
  }
}

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

// ==================== 输入区域 ====================
.input-area {
  flex-shrink: 0;
  background: #fff;
  border-top: 1px solid #E5E5E5;
  z-index: 100;
  /* 底部安全区 CSS 兜底（iPhone 横条） */
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
.fraud-banner {
  display: flex; align-items: center;
  padding: 12rpx 32rpx;
  background: #FFF3CD;
}
.fraud-text { flex: 1; font-size: 22rpx; color: #856404; }
.fraud-close { padding: 4rpx 12rpx; }

.input-row {
  display: flex; align-items: center;
  padding: 8rpx 16rpx; gap: 8rpx;
  box-sizing: border-box;
}
.ai-btn {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 6rpx;
  padding: 10rpx 16rpx; border-radius: 30rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
}
.ai-btn-icon { font-size: 24rpx; }
.ai-btn-text { font-size: 22rpx; color: #fff; font-weight: 500; }

.input-box {
  flex: 1; min-height: 64rpx; display: flex; align-items: center;
  background: #F5F5F5; border-radius: 36rpx;
  padding: 0 24rpx; box-sizing: border-box;
}
.input-field {
  width: 100%; font-size: 28rpx; line-height: 1.4;
}
.send-btn {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  width: 96rpx; height: 64rpx;
  background: $pink; border-radius: 36rpx;
  text { font-size: 26rpx; color: #fff; }
  &.disabled { opacity: 0.5; }
}

// ==================== 弹窗 ====================
.vip-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5); z-index: 999;
  display: flex; align-items: center; justify-content: center;
}
.vip-popup {
  width: 560rpx; background: #fff; border-radius: 24rpx;
  padding: 40rpx 32rpx; text-align: center;
}
.vip-title { display: block; font-size: 34rpx; font-weight: 600; color: #333; margin-bottom: 12rpx; }
.vip-desc { display: block; font-size: 28rpx; color: #999; margin-bottom: 32rpx; }
.vip-btn {
  display: flex; justify-content: center; align-items: center;
  height: 80rpx; background: linear-gradient(135deg, $pink, $pink-light);
  border-radius: 40rpx; margin-bottom: 16rpx;
  text { font-size: 30rpx; color: #fff; font-weight: 600; }
}
.vip-close { display: flex; justify-content: center; text { font-size: 26rpx; color: #999; } }

/* ===== 聊天权限 ===== */
.chat-permission-mask {
  height: 120rpx;
  background: rgba(245, 245, 245, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  border-top: 1rpx solid #eeeeee;
  flex-shrink: 0;
}

.permission-text {
  font-size: 28rpx;
  color: #666666;
}

.permission-btn {
  margin-left: 24rpx;
  width: 160rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: $pink;
  display: flex;
  justify-content: center;
  align-items: center;
}

.permission-btn text {
  font-size: 26rpx;
  color: #ffffff;
}

.remaining-hint {
  padding: 0 12rpx;
  font-size: 20rpx;
  color: #999999;
  flex-shrink: 0;
}
</style>
