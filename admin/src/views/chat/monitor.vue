<template>
  <div class="chat-monitor-page">
    <!-- 顶部栏 -->
    <div class="monitor-header">
      <div class="header-left">
        <el-button link @click="$router.push('/user/list')">
          <el-icon><ArrowLeft /></el-icon> 返回用户列表
        </el-button>
        <h2 class="page-title">
          聊天监控
          <el-tag v-if="targetUser" type="warning" size="small" style="margin-left:8px">
            {{ targetUser.nickname }} (ID:{{ targetUser.id }})
          </el-tag>
        </h2>
      </div>
      <div class="header-right">
        <el-button
          v-if="!monitoring"
          type="success"
          :loading="monitorLoading"
          size="small"
          @click="startMonitor"
        >
          开始监控
        </el-button>
        <template v-else>
          <el-tag type="success" size="small">监控中</el-tag>
          <el-button type="warning" size="small" style="margin-left:8px" @click="endMonitor">结束监控</el-button>
        </template>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar" style="margin-bottom:16px">
      <el-input
        v-model="targetUserIdInput"
        placeholder="输入用户ID后回车"
        clearable
        style="width:260px"
        @keyup.enter="switchTarget"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" size="small" style="margin-left:8px" @click="switchTarget">查看用户</el-button>
      <el-tag v-if="lockMessage" type="danger" size="small" style="margin-left:12px">{{ lockMessage }}</el-tag>
    </div>

    <!-- 主体区域 -->
    <div class="monitor-body" v-loading="monitorLoading">
      <!-- 左侧会话列表 -->
      <div class="session-panel">
        <div class="panel-title">会话列表</div>
        <div class="session-list">
          <div
            v-for="conv in sortedConversations"
            :key="conv.userId"
            class="session-item"
            :class="{ active: activePeer?.userId === conv.userId }"
            @click="selectSession(conv)"
          >
            <el-image :src="getAvatarUrl(conv.avatar)" fit="cover" class="session-avatar">
              <template #error><div class="avatar-placeholder"><el-icon :size="18"><User /></el-icon></div></template>
            </el-image>
            <div class="session-info">
              <div class="session-name">{{ conv.nickname }}</div>
              <div class="session-msg">{{ conv.messageType === 'image' ? '[图片]' : (conv.lastMessage || '暂无消息') }}</div>
            </div>
            <div class="session-time">{{ formatTimeShort(conv.lastTime) }}</div>
          </div>
          <div v-if="sortedConversations.length === 0 && !conversationLoading" class="empty-sessions">
            暂无会话
          </div>
        </div>
      </div>

      <!-- 右侧聊天区域 -->
      <div class="chat-panel">
        <template v-if="!activePeer">
          <div class="chat-empty">
            <el-icon :size="48" color="#ccc"><ChatDotRound /></el-icon>
            <p>选择左侧会话查看聊天记录</p>
          </div>
        </template>
        <template v-else>
          <!-- 聊天头部 -->
          <div class="chat-header">
            <span class="chat-peer-name">
              {{ targetUser?.nickname || '用户' }} ↔ {{ activePeer.nickname }}
              <el-tag v-if="activePeer.userId === toUserIdToMonitor" type="success" size="small" effect="plain" style="margin-left:8px">聊天对象</el-tag>
            </span>
            <span v-if="monitoring" class="ws-status" :class="{ connected: wsConnected }">
              {{ wsConnected ? '实时连接中' : '连接断开' }}
            </span>
          </div>

          <!-- 消息列表 -->
          <div class="chat-messages" ref="msgContainerRef">
            <div v-if="messageLoading" class="msg-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
            </div>
            <div v-else-if="messages.length === 0" class="msg-empty">暂无聊天记录</div>
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="msg-item"
              :class="{
                'msg-from-target': isFromTarget(msg),
                'msg-proxy': msg.isProxy === 1,
              }"
            >
              <!-- 代发标记 -->
              <span v-if="msg.isProxy === 1" class="proxy-tag">代发</span>
              <div class="msg-bubble">
                <div class="msg-meta">
                  <span class="msg-sender">{{ getSenderName(msg) }}</span>
                  <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
                </div>
                <div class="msg-content">
                  <el-image v-if="msg.type === 'image'" :src="resolveImage(msg.content)" style="max-width:200px;max-height:200px;border-radius:8px" fit="contain" :preview-src-list="[resolveImage(msg.content)]" />
                  <template v-else>{{ msg.content }}</template>
                </div>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div class="chat-pagination" v-if="messageTotal > pageSize">
            <el-pagination
              v-model:current-page="messagePage"
              :page-size="pageSize"
              :total="messageTotal"
              layout="prev, pager, next"
              small
              background
              @current-change="fetchMessages"
            />
          </div>

          <!-- 底部输入框（仅监控中可用） -->
          <div class="chat-input-area" v-if="monitoring">
            <el-input
              v-model="proxyContent"
              placeholder="以该用户身份发送消息..."
              maxlength="500"
              show-word-limit
              @keyup.enter.exact="handleProxySend"
            >
              <template #append>
                <el-button
                  type="primary"
                  :disabled="!proxyContent.trim()"
                  :loading="proxySending"
                  @click="handleProxySend"
                >
                  发送
                </el-button>
              </template>
            </el-input>
          </div>
          <div class="chat-input-area chat-input-disabled" v-else>
            <el-input
              disabled
              placeholder="请先开始监控后再代发消息"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- 代发确认弹窗 -->
    <el-dialog v-model="confirmVisible" title="确认代发消息" width="420px">
      <p style="margin:0;line-height:1.8">
        确认以 <strong>{{ targetUser?.nickname }}</strong> 的身份发送以下消息？
      </p>
      <div style="background:#f5f5f5;border-radius:8px;padding:12px;margin-top:12px;color:#333">
        {{ pendingContent }}
      </div>
      <template #footer>
        <el-button @click="confirmVisible = false">取消</el-button>
        <el-button type="primary" @click="doProxySend">确认发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, User, ChatDotRound, ArrowLeft, Loading } from '@element-plus/icons-vue'
import { adminChat, type ChatConversation, type ChatMessageItem } from '../../api/chat'
import { useAdminStore } from '../../store/admin'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

// ===== 目标用户 =====
const targetUserId = ref(0)
const targetUserIdInput = ref('')
const targetUser = ref<{ id: number; nickname: string } | null>(null)
const lockMessage = ref('')
const monitoring = ref(false)
const monitorLoading = ref(false)

// ===== WebSocket =====
const wsRef = ref<WebSocket | null>(null)
const wsConnected = ref(false)
let wsHeartbeatTimer: ReturnType<typeof setInterval> | null = null

// ===== 会话列表 =====
const conversations = ref<any[]>([])
const conversationLoading = ref(false)

// ===== 聊天 =====
const activePeer = ref<any>(null)
const messages = ref<ChatMessageItem[]>([])
const messageLoading = ref(false)
const messagePage = ref(1)
const pageSize = 50
const messageTotal = ref(0)
const msgContainerRef = ref<HTMLElement | null>(null)

// ===== 代发 =====
const proxyContent = ref('')
const proxySending = ref(false)
const confirmVisible = ref(false)
const pendingContent = ref('')

// 需要监控 targetUserId 与哪个 peerUserId 的聊天
const toUserIdToMonitor = ref(0)

// ===== 轮询 =====
const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)
const POLLING_INTERVAL = 2500
let visibilityHandler: (() => void) | null = null

// ===== 修复 B：统一的发送者判断（兼容 string/number 类型不一致） =====
function isFromTarget(msg: any): boolean {
  return Number(msg.fromUserId) === Number(targetUserId.value)
}

// ===== 修复 B：发送者昵称获取 =====
function getSenderName(msg: any): string {
  if (isFromTarget(msg)) {
    return targetUser.value?.nickname || '用户'
  }
  return activePeer.value?.nickname || '对方'
}

// ===== 修复 D：会话列表按最后消息时间倒序 =====
const sortedConversations = computed(() => {
  return [...conversations.value].sort((a, b) => {
    const ta = a.lastTime ? new Date(a.lastTime).getTime() : 0
    const tb = b.lastTime ? new Date(b.lastTime).getTime() : 0
    return tb - ta
  })
})

// ===== 修复 D：更新会话列表中对应会话的最后消息 =====
function updateConversationLastMsg(peerUserId: number, content: string, type: string, time: string) {
  const conv = conversations.value.find((c) => c.userId === peerUserId)
  if (conv) {
    conv.lastMessage = content
    conv.messageType = type
    conv.lastTime = time
    // 将该会话移到列表顶部
    const idx = conversations.value.indexOf(conv)
    if (idx > 0) {
      conversations.value.splice(idx, 1)
      conversations.value.unshift(conv)
    }
  } else {
    // 如果会话列表里还没有（新会话），重新加载
    loadConversations()
  }
}

// ===== 修复 A & B：轮询逻辑 =====
async function pollMessagesOnce() {
  if (!activePeer.value || !targetUserId.value) return

  const targetId = Number(targetUserId.value)
  const peerId = Number(activePeer.value.userId)

  // 取本地最后一条消息的 id 作为 lastMessageId
  const lastMsg = messages.value[messages.value.length - 1]
  const lastMessageId = lastMsg ? Number(lastMsg.id) : 0

  try {
    const res = await adminChat.pollMessages(targetId, peerId, lastMessageId)
    if (res.success && res.data?.list?.length) {
      const newMessages = res.data.list
      let hasNew = false

      // 去重后追加到消息列表末尾
      for (const msg of newMessages) {
        if (!messages.value.some((m) => Number(m.id) === Number(msg.id))) {
          messages.value.push(msg)
          hasNew = true
        }
      }

      if (hasNew) {
        // 滚动到底部
        nextTick(() => scrollToBottom())

        // 更新左侧会话列表的最后消息
        const latestMsg = newMessages[newMessages.length - 1]
        // 判断这条最新消息的发送方来确定 peerUserId
        const msgFromId = Number(latestMsg.fromUserId)
        const msgToId = Number(latestMsg.toUserId)
        const peerUserId = msgFromId === targetId ? msgToId : msgFromId
        updateConversationLastMsg(
          peerUserId,
          latestMsg.content,
          latestMsg.type || 'text',
          latestMsg.createdAt,
        )
      }
    }
  } catch {
    // 轮询静默失败，不干扰用户
  }
}

function startPolling() {
  stopPolling()
  pollingTimer.value = setInterval(pollMessagesOnce, POLLING_INTERVAL)
}

function stopPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

const getAvatarUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return (import.meta.env.VITE_API_BASE_URL || '') + url
}

const resolveImage = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('wxfile')) return url
  return (import.meta.env.VITE_API_BASE_URL || '') + url
}

// ===== 初始化 =====
onMounted(() => {
  const uid = route.query.userId
  const nickname = route.query.nickname
  if (uid) {
    targetUserId.value = Number(uid)
    targetUserIdInput.value = String(uid)
    targetUser.value = { id: Number(uid), nickname: decodeURIComponent(String(nickname || '用户')) }
    loadConversations()
  }

  // 修复 B：页面隐藏后重新可见时，立即执行一次轮询
  visibilityHandler = () => {
    if (document.visibilityState === 'visible' && activePeer.value) {
      pollMessagesOnce()
    }
  }
  document.addEventListener('visibilitychange', visibilityHandler)
})

onUnmounted(() => {
  disconnectWs()
  // 修复 B：清除轮询定时器
  stopPolling()
  // 修复 B：移除页面可见性监听
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }
})

// ===== 搜索切换用户 =====
async function switchTarget() {
  const val = targetUserIdInput.value.trim()
  if (!val) return
  const id = Number(val)
  if (!Number.isInteger(id) || id <= 0) {
    ElMessage.warning('请输入有效用户ID')
    return
  }
  if (monitoring.value) {
    ElMessage.warning('请先结束当前监控')
    return
  }
  targetUserId.value = id
  targetUser.value = { id, nickname: `用户${id}` }
  lockMessage.value = ''
  activePeer.value = null
  messages.value = []
  stopPolling()
  await loadConversations()
}

// ===== 监控操作 =====
async function startMonitor() {
  if (!targetUserId.value) {
    ElMessage.warning('请先选择一个用户')
    return
  }
  monitorLoading.value = true
  try {
    const res = await adminChat.startMonitor(targetUserId.value)
    if (res.success) {
      monitoring.value = true
      lockMessage.value = ''
      connectWs()
      ElMessage.success('监控已开始')
    } else {
      lockMessage.value = res.message || '无法开始监控'
    }
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || '开始监控失败'
    lockMessage.value = msg
    ElMessage.error(msg)
  } finally {
    monitorLoading.value = false
  }
}

async function endMonitor() {
  monitorLoading.value = true
  stopPolling()
  try {
    await adminChat.endMonitor(targetUserId.value)
    monitoring.value = false
    disconnectWs()
    ElMessage.success('监控已结束')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '结束监控失败')
  } finally {
    monitorLoading.value = false
  }
}

// ===== WebSocket =====
function connectWs() {
  disconnectWs()

  const token = adminStore.token
  if (!token) {
    ElMessage.error('未获取到登录凭证')
    return
  }

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = location.host
  const url = `${protocol}//${host}/ws/chat`

  try {
    const ws = new WebSocket(url)
    wsRef.value = ws

    ws.onopen = () => {
      wsConnected.value = true
      // 认证
      ws.send(JSON.stringify({ event: 'auth', data: { token, type: 'admin' } }))
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        const { event: evt, data } = payload

        if (evt === 'auth_success') {
          // 订阅目标用户的消息
          ws.send(JSON.stringify({
            event: 'subscribe',
            data: { targetUserId: targetUserId.value },
          }))
        } else if (evt === 'subscribed') {
          console.log('[WS] 已订阅用户', data.targetUserId)
        } else if (evt === 'new_message') {
          handleWsMessage(data)
        } else if (evt === 'monitor_locked') {
          lockMessage.value = data.message
          ElMessage.warning(data.message)
        } else if (evt === 'auth_error') {
          ElMessage.error(data.message || 'WebSocket 认证失败')
          disconnectWs()
        }
      } catch {}
    }

    ws.onclose = () => {
      wsConnected.value = false
      wsRef.value = null
    }

    ws.onerror = () => {
      wsConnected.value = false
    }

    // 心跳
    wsHeartbeatTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'ping', data: {} }))
      }
    }, 25000)
  } catch {
    ElMessage.error('WebSocket 连接失败')
  }
}

function disconnectWs() {
  if (wsHeartbeatTimer) { clearInterval(wsHeartbeatTimer); wsHeartbeatTimer = null }
  if (wsRef.value) {
    wsRef.value.close()
    wsRef.value = null
    wsConnected.value = false
  }
}

function handleWsMessage(data: any) {
  // 只处理当前正在查看的会话消息（使用 Number 兼容类型差异）
  if (!activePeer.value) return
  const peerId = Number(activePeer.value.userId)
  const fromId = Number(data.fromUserId)
  const toId = Number(data.toUserId)
  const targetId = Number(targetUserId.value)
  const isRelevant =
    (fromId === targetId && toId === peerId) ||
    (fromId === peerId && toId === targetId)

  if (isRelevant) {
    // 避免重复消息
    if (!messages.value.some((m) => Number(m.id) === Number(data.id))) {
      messages.value.push(data)
      nextTick(() => scrollToBottom())
    }
  }

  // 修复 D：更新会话列表的最后消息和时间
  const peerUserId = fromId === targetId ? toId : fromId
  updateConversationLastMsg(peerUserId, data.content, data.type || 'text', data.createdAt)
}

// ===== 会话列表 =====
async function loadConversations() {
  if (!targetUserId.value) return
  conversationLoading.value = true
  try {
    const res = await adminChat.getUserConversations(targetUserId.value, 1, 100)
    if (res.success && res.data) {
      conversations.value = res.data.list || []
    }
  } catch {
    ElMessage.error('获取会话列表失败')
  } finally {
    conversationLoading.value = false
  }
}

function selectSession(conv: any) {
  activePeer.value = conv
  toUserIdToMonitor.value = conv.userId
  messagePage.value = 1
  messages.value = []
  fetchMessages()
  // 修复 B：切换会话时重启轮询
  startPolling()
}

// ===== 聊天记录 =====
async function fetchMessages() {
  if (!activePeer.value || !targetUserId.value) return
  messageLoading.value = true
  try {
    const res = await adminChat.getMessages(
      targetUserId.value,
      activePeer.value.userId,
      messagePage.value,
      pageSize,
    )
    if (res.success && res.data) {
      const list = res.data.list || []
      messages.value = list
      messageTotal.value = res.data.total || 0
      nextTick(() => scrollToBottom())
    }
  } catch {
    ElMessage.error('获取聊天记录失败')
  } finally {
    messageLoading.value = false
  }
}

// ===== 修复 C：统一滚动到底部 =====
function scrollToBottom() {
  nextTick(() => {
    const el = msgContainerRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

// ===== 代发 =====
function handleProxySend() {
  const content = proxyContent.value.trim()
  if (!content) return
  pendingContent.value = content
  confirmVisible.value = true
}

// ===== 修复 A：代发成功后立即追加消息、滚动、更新会话 =====
async function doProxySend() {
  if (!activePeer.value) return
  proxySending.value = true
  try {
    const res = await adminChat.proxySend(
      targetUserId.value,
      activePeer.value.userId,
      pendingContent.value,
    )
    if (res.success) {
      const sentMsg = res.data
      // 修复 A：将消息追加到列表末尾
      if (sentMsg && sentMsg.id) {
        if (!messages.value.some((m) => Number(m.id) === Number(sentMsg.id))) {
          messages.value.push(sentMsg)
        }
      }
      // 修复 D：更新会话列表的最后消息
      updateConversationLastMsg(
        activePeer.value.userId,
        sentMsg?.content || pendingContent.value,
        'text',
        sentMsg?.createdAt || new Date().toISOString(),
      )
      proxyContent.value = ''
      confirmVisible.value = false
      nextTick(() => scrollToBottom())
      ElMessage.success('消息已代发')
    } else {
      ElMessage.error(res.message || '发送失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '发送失败')
  } finally {
    proxySending.value = false
  }
}

// ===== 时间格式化 =====
function formatTime(dt: string) {
  if (!dt) return ''
  try { return new Date(dt).toLocaleString('zh-CN') } catch { return dt }
}

function formatTimeShort(dt: string) {
  if (!dt) return ''
  try {
    const d = new Date(dt)
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    if (d.toDateString() === now.toDateString()) {
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch { return dt }
}
</script>

<style lang="scss" scoped>
.chat-monitor-page {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  padding: 0 16px;
}

.monitor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.monitor-body {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 0;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

// ===== 左侧会话列表 =====
.session-panel {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;

  .panel-title {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    border-bottom: 1px solid #f0f0f0;
  }

  .session-list {
    flex: 1;
    overflow-y: auto;
  }

  .empty-sessions {
    text-align: center;
    color: #999;
    padding: 40px 0;
    font-size: 13px;
  }
}

.session-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
  gap: 10px;

  &:hover {
    background: #f5f7fa;
  }

  &.active {
    background: #ecf5ff;
  }

  .session-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .session-info {
    flex: 1;
    min-width: 0;

    .session-name {
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }

    .session-msg {
      font-size: 12px;
      color: #999;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 150px;
    }
  }

  .session-time {
    font-size: 11px;
    color: #c0c4cc;
    flex-shrink: 0;
  }
}

.avatar-placeholder {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

// ===== 右侧聊天区域 =====
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccc;
  gap: 12px;

  p {
    margin: 0;
    font-size: 14px;
  }
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;

  .chat-peer-name {
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .ws-status {
    font-size: 12px;
    color: #e6a23c;

    &.connected {
      color: #67c23a;
    }
  }
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
}

.msg-loading,
.msg-empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.msg-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;

  &.msg-from-target {
    align-items: flex-end;
    .msg-bubble {
      background: #95ec69;
    }
  }

  &:not(.msg-from-target) {
    align-items: flex-start;
    .msg-bubble {
      background: #fff;
    }
  }

  &.msg-proxy {
    .msg-bubble {
      position: relative;
    }
  }
}

.proxy-tag {
  font-size: 10px;
  color: #fff;
  background: #f56c6c;
  border-radius: 4px;
  padding: 1px 6px;
  margin-bottom: 2px;
  display: inline-block;
  align-self: flex-end;
}

.msg-bubble {
  max-width: 65%;
  padding: 10px 14px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;

  .msg-sender {
    font-size: 11px;
    color: #909399;
    font-weight: 500;
  }

  .msg-time {
    font-size: 10px;
    color: #c0c4cc;
  }
}

.msg-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  word-break: break-all;
}

.chat-pagination {
  display: flex;
  justify-content: center;
  padding: 10px 0;
  flex-shrink: 0;
  border-top: 1px solid #f0f0f0;
}

.chat-input-area {
  padding: 12px 16px;
  border-top: 1px solid #e5e5e5;
  flex-shrink: 0;

  .el-input-group__append {
    padding: 0;
  }
}

.chat-input-disabled {
  .el-input {
    opacity: 0.6;
  }
}
</style>
