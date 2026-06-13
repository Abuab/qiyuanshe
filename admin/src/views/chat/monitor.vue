<template>
  <div class="chat-monitor">
    <div class="page-header">
      <h2 class="page-title">聊天监控</h2>
    </div>

    <div class="card">
      <div class="search-bar">
        <el-input
          v-model="keyword"
          placeholder="搜索用户昵称"
          clearable
          style="width: 280px"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column label="用户A" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <el-image :src="row.fromAvatar" fit="cover" class="avatar" style="width:36px;height:36px;border-radius:50%">
                <template #error><div class="avatar-placeholder"><el-icon :size="18"><User /></el-icon></div></template>
              </el-image>
              <span class="nickname link" @click="goUserDetail(row.fromUserId)">{{ row.fromNickname }}</span>
              <span class="user-id">#{{ row.fromUserId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="用户B" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <el-image :src="row.toAvatar" fit="cover" class="avatar" style="width:36px;height:36px;border-radius:50%">
                <template #error><div class="avatar-placeholder"><el-icon :size="18"><User /></el-icon></div></template>
              </el-image>
              <span class="nickname link" @click="goUserDetail(row.toUserId)">{{ row.toNickname }}</span>
              <span class="user-id">#{{ row.toUserId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="最新消息" min-width="250">
          <template #default="{ row }">
            <span class="last-msg">{{ row.lastMessage }}</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.lastTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openChat(row)">查看聊天</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </div>

    <!-- 聊天详情弹窗 -->
    <el-dialog
      v-model="chatDialogVisible"
      :title="chatDialogTitle"
      width="700px"
      top="5vh"
      destroy-on-close
    >
      <div class="chat-messages" v-loading="messageLoading">
        <div v-if="messages.length === 0 && !messageLoading" class="empty-chat">
          暂无聊天记录
        </div>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-item"
          :class="{ 'is-mine': msg.fromUserId === chatFromUser }"
        >
          <div class="msg-meta">
            <span class="msg-sender">{{ msg.fromUserId === chatFromUser ? chatFromName : chatToName }}</span>
            <span class="msg-time">{{ formatDate(msg.createdAt) }}</span>
          </div>
          <div class="msg-bubble">{{ msg.content }}</div>
        </div>
      </div>
      <div class="chat-pagination" v-if="messageTotal > messageLimit">
        <el-pagination
          v-model:current-page="messagePage"
          :page-size="messageLimit"
          :total="messageTotal"
          layout="prev, pager, next"
          small
          @current-change="fetchMessages"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, User } from '@element-plus/icons-vue'
import { adminChat, type ChatConversation, type ChatMessageItem } from '../../api/chat'

const router = useRouter()

const loading = ref(false)
const keyword = ref('')
const tableData = ref<ChatConversation[]>([])
const pagination = ref({ page: 1, limit: 20, total: 0 })

// 聊天弹窗
const chatDialogVisible = ref(false)
const chatDialogTitle = ref('')
const chatFromUser = ref(0)
const chatToUser = ref(0)
const chatFromName = ref('')
const chatToName = ref('')
const messages = ref<ChatMessageItem[]>([])
const messageLoading = ref(false)
const messagePage = ref(1)
const messageLimit = 50
const messageTotal = ref(0)

onMounted(() => { fetchList() })

async function fetchList() {
  loading.value = true
  try {
    const res = await adminChat.getAllConversations({
      page: pagination.value.page,
      limit: pagination.value.limit,
      keyword: keyword.value || undefined,
    })
    if (res.success && res.data) {
      tableData.value = res.data.list || []
      pagination.value.total = res.data.total || 0
    }
  } catch {
    ElMessage.error('获取会话列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.value.page = 1
  fetchList()
}

function handleReset() {
  keyword.value = ''
  pagination.value.page = 1
  fetchList()
}

function openChat(row: ChatConversation) {
  chatFromUser.value = row.fromUserId
  chatToUser.value = row.toUserId
  chatFromName.value = row.fromNickname
  chatToName.value = row.toNickname
  chatDialogTitle.value = `${row.fromNickname} ↔ ${row.toNickname} 聊天记录`
  messagePage.value = 1
  messages.value = []
  chatDialogVisible.value = true
  fetchMessages()
}

async function fetchMessages() {
  messageLoading.value = true
  try {
    const res = await adminChat.getMessages(
      chatFromUser.value,
      chatToUser.value,
      messagePage.value,
      messageLimit,
    )
    if (res.success && res.data) {
      messages.value = res.data.list || []
      messageTotal.value = res.data.total || 0
    }
  } catch {
    ElMessage.error('获取聊天记录失败')
  } finally {
    messageLoading.value = false
  }
}

function goUserDetail(userId: number) {
  router.push(`/user/detail/${userId}`)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style lang="scss" scoped>
.chat-monitor {
  .page-header { margin-bottom: 16px; }
  .page-title { font-size: 20px; font-weight: 600; margin: 0; }
  .card { background: #fff; border-radius: 8px; padding: 20px; }

  .search-bar {
    display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
  }

  .user-cell {
    display: flex; align-items: center; gap: 8px;
    .avatar-placeholder {
      width: 36px; height: 36px; border-radius: 50%; background: #f0f0f0;
      display: flex; align-items: center; justify-content: center;
    }
    .nickname {
      font-weight: 500;
      &.link { color: #409eff; cursor: pointer; &:hover { text-decoration: underline; } }
    }
    .user-id { color: #999; font-size: 12px; }
  }

  .last-msg {
    color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; display: inline-block;
  }

  .pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
}

.chat-messages {
  max-height: 60vh; overflow-y: auto; padding: 8px 0;

  .empty-chat { text-align: center; color: #999; padding: 60px 0; }

  .message-item {
    margin-bottom: 16px; padding: 0 12px;

    .msg-meta { margin-bottom: 4px; display: flex; align-items: center; gap: 8px;
      .msg-sender { font-size: 12px; color: #909399; font-weight: 500; }
      .msg-time { font-size: 11px; color: #c0c4cc; }
    }

    .msg-bubble {
      display: inline-block; max-width: 70%; padding: 10px 14px; border-radius: 12px;
      background: #f0f2f5; color: #333; font-size: 14px; line-height: 1.6;
      word-break: break-all;
    }

    &.is-mine {
      text-align: right;
      .msg-bubble { background: #95ec69; }
    }
  }
}

.chat-pagination { padding: 12px 0; display: flex; justify-content: center; }
</style>
