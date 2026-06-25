<template>
  <div class="audit-queue-page">
    <!-- 顶部标题区 + 统计卡片 -->
    <div class="page-header">
      <h2 class="page-title">人工审核队列</h2>
      <div class="header-stats">
        <div class="header-stat-card pending">
          <span class="hs-num">{{ stats.pending }}</span>
          <span class="hs-label">条待处理</span>
        </div>
        <div class="header-stat-card approved">
          <span class="hs-num">{{ stats.approvedToday }}</span>
          <span class="hs-label">今日已通过</span>
        </div>
        <div class="header-stat-card rejected">
          <span class="hs-num">{{ stats.rejectedToday }}</span>
          <span class="hs-label">今日已拒绝</span>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-card">
      <div class="filter-row">
        <el-select v-model="filter.type" placeholder="类型" clearable style="width:140px">
          <el-option label="全部" :value="undefined" />
          <el-option label="聊天消息" value="chat" />
          <el-option label="头像" value="avatar" />
          <el-option label="照片" value="photo" />
          <el-option label="问答答案" value="answer" />
          <el-option label="语音介绍" value="voice" />
        </el-select>

        <el-date-picker
          v-model="filter.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width:240px"
        />

        <el-input
          v-model="filter.keyword"
          placeholder="搜索用户昵称或内容关键词"
          :prefix-icon="Search"
          clearable
          style="width:240px"
          @keyup.enter="search"
        />

        <el-button type="primary" :icon="RefreshRight" @click="fetchData">刷新</el-button>
      </div>
    </div>

    <!-- 批量操作 -->
    <div class="batch-bar" v-if="selectedRows.length > 0">
      <el-button type="success" plain @click="handleBatchApprove">批量通过 ({{ selectedRows.length }})</el-button>
      <el-button type="danger" plain @click="handleBatchReject">批量拒绝 ({{ selectedRows.length }})</el-button>
    </div>

    <!-- 审核列表 -->
    <div class="table-card">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        row-key="id"
        :row-height="56"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="内容预览" min-width="280">
          <template #default="{ row }">
            <div class="content-preview-cell">
              <!-- 文本类型：聊天消息 / 问答 -->
              <template v-if="isTextType(row)">
                <p class="preview-text">{{ getTextContent(row) }}</p>
              </template>
              <!-- 图片类型：头像 / 照片 -->
              <template v-else-if="isImageType(row)">
                <el-image
                  :src="getImageUrl(row)"
                  fit="cover"
                  class="preview-image"
                  :preview-src-list="[getImageUrl(row)]"
                  preview-teleported
                >
                  <template #error>
                    <div class="image-error">
                      <el-icon :size="28"><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
              </template>
              <!-- 语音类型 -->
              <template v-else-if="isVoiceType(row)">
                <div class="voice-preview">
                  <el-button
                    type="primary"
                    link
                    :icon="VideoPlay"
                    :loading="voicePlayingId === row.id"
                    @click.stop="toggleVoicePlay(row)"
                  >
                    {{ voicePlayingId === row.id ? '播放中...' : '播放语音' }}
                  </el-button>
                  <span class="voice-duration">{{ parseDuration(row.content) }}″</span>
                </div>
              </template>
              <el-tag type="info" size="small" class="content-tag">{{ typeLabel(row) }}</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="用户信息" width="180">
          <template #default="{ row }">
            <div class="user-info-cell" v-if="row.submitter">
              <el-image
                :src="row.submitter.avatar"
                fit="cover"
                class="user-avatar"
              >
                <template #error>
                  <div class="avatar-placeholder">
                    <el-icon :size="18"><User /></el-icon>
                  </div>
                </template>
              </el-image>
              <div class="user-text">
                <span class="user-name">{{ row.submitter.nickname }}</span>
                <span class="user-id">ID: {{ row.submitter.id || row.submitterId }}</span>
              </div>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="等待时长" width="120">
          <template #default="{ row }">
            <span :class="waitTimeClass(row.createdAt)">{{ relativeTime(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <div style="display:flex;flex-wrap:nowrap;white-space:nowrap;justify-content:center;gap:4px">
            <el-button
              type="success"
              size="small"
              :icon="Check"
              :loading="row._approving"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            <el-button
              type="danger"
              size="small"
              :icon="Close"
              @click="handleReject(row)"
            >
              拒绝
            </el-button>
            <el-button
              type="info"
              size="small"
              plain
              @click="viewContext(row)"
            >
              上下文
            </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && tableData.length === 0" description="暂无待审核内容" />

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="onPageSizeChange"
          @current-change="onPageChange"
        />
      </div>
    </div>

    <!-- 拒绝弹窗 -->
    <el-dialog v-model="rejectDialog.visible" title="确认拒绝" width="500px" top="15vh">
      <div class="reject-content">
        <el-descriptions :column="1" border size="small" v-if="rejectDialog.row">
          <el-descriptions-item label="类型">{{ typeLabel(rejectDialog.row) }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ rejectDialog.row.submitter?.nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="内容">
            <div class="reject-content-text">{{ getContentSummary(rejectDialog.row) }}</div>
          </el-descriptions-item>
        </el-descriptions>
        <el-form :model="rejectDialog" label-width="80px" style="margin-top:16px">
          <el-form-item label="拒绝原因" required>
            <el-input
              v-model="rejectDialog.reason"
              type="textarea"
              :rows="2"
              placeholder="请输入拒绝原因"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="rejectDialog.visible = false">取消</el-button>
        <el-button type="danger" :loading="rejectDialog.loading" @click="confirmReject">
          确认拒绝
        </el-button>
      </template>
    </el-dialog>

    <!-- 上下文 Drawer -->
    <el-drawer
      v-model="contextDrawer.visible"
      title="审核上下文"
      direction="rtl"
      size="480px"
    >
      <template v-if="contextDrawer.data">
        <el-tabs v-model="contextDrawer.tab">
          <el-tab-pane label="内容详情" name="content">
            <div class="context-section">
              <h4>审核内容</h4>
              <div class="context-content-box">
                <!-- Text -->
                <p v-if="isTextType(contextDrawer.data)" class="context-text">{{ getTextContent(contextDrawer.data) }}</p>
                <!-- Image -->
                <el-image
                  v-else-if="isImageType(contextDrawer.data)"
                  :src="getImageUrl(contextDrawer.data)"
                  fit="contain"
                  style="width:100%;max-height:300px"
                  :preview-src-list="[getImageUrl(contextDrawer.data)]"
                  preview-teleported
                />
                <!-- Voice -->
                <div v-else-if="isVoiceType(contextDrawer.data)" class="voice-preview" style="padding:12px 0">
                  <el-button
                    type="primary"
                    :icon="VideoPlay"
                    :loading="voicePlayingId === contextDrawer.data.id"
                    @click="toggleVoicePlay(contextDrawer.data)"
                  >
                    {{ voicePlayingId === contextDrawer.data.id ? '播放中...' : '播放语音' }}
                  </el-button>
                  <span class="voice-duration">{{ parseDuration(contextDrawer.data.content) }}″</span>
                </div>
                <div class="context-meta">
                  <span>类型：{{ typeLabel(contextDrawer.data) }}</span>
                  <span>提交时间：{{ formatTime(contextDrawer.data.createdAt) }}</span>
                  <span v-if="contextDrawer.data.submitter">
                    用户：{{ contextDrawer.data.submitter.nickname }}
                  </span>
                </div>
              </div>
            </div>

            <div class="context-section" v-if="contextDrawer.data.submitter">
              <h4>用户资料</h4>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="昵称">{{ contextDrawer.data.submitter.nickname }}</el-descriptions-item>
                <el-descriptions-item label="用户ID">{{ contextDrawer.data.submitter.id || contextDrawer.data.submitterId }}</el-descriptions-item>
                <el-descriptions-item label="提交次数">-</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>
          <el-tab-pane label="审核历史" name="history">
            <div v-if="!contextDrawer.historyLoading && contextDrawer.history.length === 0" class="text-muted">
              暂无历史审核记录
            </div>
            <el-timeline v-else v-loading="contextDrawer.historyLoading">
              <el-timeline-item
                v-for="item in contextDrawer.history"
                :key="item.id"
                :timestamp="formatTime(item.createdAt)"
                placement="top"
              >
                <el-card shadow="never">
                  <p><strong>{{ item.action }}</strong></p>
                  <p v-if="item.reason">原因：{{ item.reason }}</p>
                  <p v-if="item.adminId">处理人ID：{{ item.adminId }}</p>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, RefreshRight, Check, Close, Picture, User, VideoPlay } from '@element-plus/icons-vue'
import { adminAudit } from '@/api'

// ===== 统计 =====
const stats = reactive({ pending: 0, approvedToday: 0, rejectedToday: 0 })

// ===== 筛选 =====
const filter = reactive({
  type: undefined as string | undefined,
  dateRange: null as [string, string] | null,
  keyword: '',
})

// ===== 表格 =====
const tableData = ref<any[]>([])
const selectedRows = ref<any[]>([])
const loading = ref(false)
const pagination = reactive({ page: 1, limit: 20, total: 0 })

// ===== 拒绝弹窗 =====
const rejectDialog = reactive({
  visible: false,
  row: null as any,
  reason: '',
  loading: false,
})

// ===== 上下文 Drawer =====
const contextDrawer = reactive({
  visible: false,
  data: null as any,
  tab: 'content',
  history: [] as any[],
  historyLoading: false,
})

// ===== 自动刷新 =====
let pollTimer: ReturnType<typeof setInterval> | null = null

// ===== 语音播放 =====
const voicePlayingId = ref<number | null>(null)
const voiceAudio = ref<HTMLAudioElement | null>(null)

function parseVoiceContent(content?: string): { voiceUrl?: string; duration?: number } {
  if (!content) return {}
  try { return JSON.parse(content) } catch { return {} }
}

function parseDuration(content?: string): number {
  return parseVoiceContent(content).duration || 0
}

function resolveVoiceUrl(content?: string): string {
  const { voiceUrl } = parseVoiceContent(content)
  if (!voiceUrl) return ''
  // 拒绝微信临时路径（仅小程序本地有效，管理后台无法访问）
  if (/^https?:\/\/tmp\//i.test(voiceUrl) || voiceUrl.startsWith('wxfile://')) return ''
  if (voiceUrl.startsWith('http://') || voiceUrl.startsWith('https://')) return voiceUrl
  const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, '') || ''
  return voiceUrl.startsWith('/') ? `${baseUrl}${voiceUrl}` : voiceUrl
}

function toggleVoicePlay(row: any) {
  const url = resolveVoiceUrl(row.content)
  if (!url) {
    ElMessage.warning('语音文件已失效，请通知用户重新上传')
    return
  }

  if (voiceAudio.value) {
    voiceAudio.value.pause()
    voiceAudio.value = null
  }

  if (voicePlayingId.value === row.id) {
    voicePlayingId.value = null
    return
  }

  const audio = new Audio(url)
  voiceAudio.value = audio
  voicePlayingId.value = row.id
  audio.play()
  audio.onended = () => { voicePlayingId.value = null; voiceAudio.value = null }
  audio.onerror = () => { voicePlayingId.value = null; voiceAudio.value = null; ElMessage.warning('音频加载失败') }
}

// ===== 类型判断 =====
const textTypes = ['chat', 'answer', 'user']
const imageTypes = ['photo', 'avatar']
function isTextType(row: any) { return textTypes.includes(row.targetType) || textTypes.includes(row.type) }
function isImageType(row: any) { return imageTypes.includes(row.targetType) || imageTypes.includes(row.type) }
function isVoiceType(row: any) { return row.targetType === 'voice' || row.type === 'voice' }

function typeLabel(row: any) {
  const map: Record<string, string> = {
    chat: '聊天消息', answer: '问答答案', avatar: '头像', photo: '照片',
    voice: '语音介绍', user: '用户资料',
  }
  return map[row.targetType] || map[row.type] || row.targetType || row.type || '-'
}

function getTextContent(row: any) {
  const content = row.content || row.reason || ''
  try { const parsed = JSON.parse(content); return parsed.text || content } catch { return content }
}

function getImageUrl(row: any) {
  const content = row.content || ''
  try { const parsed = JSON.parse(content); return parsed.url || parsed.photoUrl || content } catch { return content }
}

function getContentSummary(row: any) {
  const text = getTextContent(row)
  if (text.length > 100) return text.substring(0, 100) + '...'
  return text
}

// ===== 时间 =====
function formatTime(t: string) {
  if (!t) return '-'
  const d = new Date(t)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function relativeTime(t: string) {
  if (!t) return ''
  const diff = Date.now() - new Date(t).getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

function waitTimeClass(t: string) {
  const diff = Date.now() - new Date(t).getTime()
  return diff > 86400000 ? 'wait-overdue' : 'wait-normal'
}

// ===== 数据加载 =====
async function fetchData() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      limit: pagination.limit,
      status: 0, // 只查待审核
    }
    if (filter.type) params.type = filter.type
    if (filter.dateRange) {
      params.startDate = filter.dateRange[0]
      params.endDate = filter.dateRange[1]
    }
    if (filter.keyword) params.keyword = filter.keyword

    const res: any = await adminAudit.list(params)
    if (res.success && res.data) {
      tableData.value = (res.data.list || []).map((row: any) => ({ ...row, _approving: false }))
      pagination.total = res.data.total || 0
      stats.pending = pagination.total
    }
  } catch {
    ElMessage.error('加载审核队列失败')
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const res: any = await adminAudit.pendingCount()
    if (res.success && res.data) {
      stats.pending = res.data.total || res.data.pending || 0
      stats.approvedToday = res.data.approvedToday || 0
      stats.rejectedToday = res.data.rejectedToday || 0
    }
  } catch { /* ignore */ }
}

function search() { pagination.page = 1; fetchData() }
function onPageChange() { fetchData() }
function onPageSizeChange() { pagination.page = 1; fetchData() }

function handleSelectionChange(rows: any[]) {
  selectedRows.value = rows
}

// ===== 通过 =====
async function handleApprove(row: any) {
  try {
    await ElMessageBox.confirm('确定要通过该审核吗？', '确认通过', { type: 'success', confirmButtonText: '确定通过' })
  } catch {
    return
  }
  row._approving = true
  try {
    const res = await adminAudit.approve(row.id)
    if (res.success) {
      ElMessage.success('审核已通过')
      tableData.value = tableData.value.filter((r) => r.id !== row.id)
      pagination.total--
      fetchStats()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    row._approving = false
  }
}

// ===== 拒绝 =====
function handleReject(row: any) {
  rejectDialog.row = row
  rejectDialog.reason = ''
  rejectDialog.visible = true
}

async function confirmReject() {
  if (!rejectDialog.reason.trim()) {
    ElMessage.warning('请输入拒绝原因')
    return
  }
  rejectDialog.loading = true
  try {
    const res = await adminAudit.reject(rejectDialog.row.id, rejectDialog.reason)
    if (res.success) {
      ElMessage.success('已拒绝该审核')
      tableData.value = tableData.value.filter((r) => r.id !== rejectDialog.row.id)
      pagination.total--
      rejectDialog.visible = false
      fetchStats()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    rejectDialog.loading = false
  }
}

// ===== 批量操作 =====
async function handleBatchApprove() {
  try {
    await ElMessageBox.confirm(
      `确定要批量通过 ${selectedRows.value.length} 条审核吗？`,
      '批量通过',
      { type: 'success', confirmButtonText: '确定' },
    )
  } catch { return }

  const ids = selectedRows.value.map((r) => r.id)
  try {
    const res = await adminAudit.batchApprove(ids)
    if (res.success) {
      ElMessage.success(`已通过 ${ids.length} 条审核`)
      fetchData()
      fetchStats()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch { ElMessage.error('批量操作失败') }
}

async function handleBatchReject() {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入批量拒绝原因', '批量拒绝', {
      confirmButtonText: '确认拒绝',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '请输入拒绝原因',
    })
    if (!reason?.trim()) return

    const ids = selectedRows.value.map((r) => r.id)
    const res = await adminAudit.batchReject(ids, reason)
    if (res.success) {
      ElMessage.success(`已拒绝 ${ids.length} 条审核`)
      fetchData()
      fetchStats()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch { /* cancelled */ }
}

// ===== 查看上下文 =====
async function viewContext(row: any) {
  contextDrawer.data = row
  contextDrawer.visible = true
  contextDrawer.tab = 'content'
  contextDrawer.history = []

  // 加载审核历史
  contextDrawer.historyLoading = true
  try {
    const type = row.targetType || row.type
    const targetId = row.targetId || row.id
    const res: any = await adminAudit.getHistory(type, targetId)
    if (res.success && res.data) {
      contextDrawer.history = Array.isArray(res.data) ? res.data : (res.data.list || [])
    }
  } catch { /* ignore */ }
  finally { contextDrawer.historyLoading = false }
}

// ===== 轮询 =====
function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    fetchStats()
    if (pagination.page === 1) fetchData()
  }, 10000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => {
  fetchData()
  fetchStats()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.audit-queue-page { max-width: 1300px; padding: 0 0 24px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}
.page-title { font-size: 24px; font-weight: 500; color: #303133; margin: 0; }

.header-stats { display: flex; gap: 16px; }
.header-stat-card {
  border-radius: 8px; padding: 12px 20px;
  display: flex; flex-direction: column; align-items: center;
  min-width: 100px;
}
.header-stat-card.pending { background: #FDF6EC; border: 1px solid #FAECD8; }
.header-stat-card.approved { background: #F0F9EB; border: 1px solid #E1F3D8; }
.header-stat-card.rejected { background: #FEF0F0; border: 1px solid #FDE2E2; }
.hs-num { font-size: 28px; font-weight: bold; }
.header-stat-card.pending .hs-num { color: #E6A23C; }
.header-stat-card.approved .hs-num { color: #67C23A; }
.header-stat-card.rejected .hs-num { color: #F56C6C; }
.hs-label { font-size: 12px; color: #909399; }

.filter-card {
  background: #fff; border-radius: 8px;
  padding: 16px 24px; margin-bottom: 16px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}
.filter-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.batch-bar {
  background: #ECF5FF; border-radius: 8px;
  padding: 12px 24px; margin-bottom: 12px;
  display: flex; align-items: center; gap: 12px;
}

.table-card {
  background: #fff; border-radius: 8px;
  padding: 16px; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}

.content-preview-cell { display: flex; flex-direction: column; gap: 8px; }
.preview-text {
  margin: 0; font-size: 13px; color: #303133;
  display: -webkit-box; line-clamp: 2; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; line-height: 1.5; word-break: break-all;
}
.preview-image { width: 80px; height: 80px; border-radius: 8px; cursor: pointer; }
.image-error {
  width: 80px; height: 80px; border-radius: 8px;
  background: #f5f5f5; display: flex; align-items: center; justify-content: center;
}
.content-tag { align-self: flex-start; }

.voice-placeholder {
  display: flex; align-items: center; gap: 8px;
  color: #909399; padding: 8px 12px; background: #f5f7fa;
  border-radius: 8px; width: fit-content;
}
.voice-placeholder.large { padding: 20px; font-size: 16px; }

.voice-preview {
  display: flex; align-items: center; gap: 8px;
}
.voice-duration {
  font-size: 12px; color: #909399;
}

.user-info-cell { display: flex; align-items: center; gap: 10px; }
.user-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
.avatar-placeholder {
  width: 36px; height: 36px; border-radius: 50%;
  background: #f5f5f5; display: flex; align-items: center; justify-content: center;
}
.user-text { display: flex; flex-direction: column; }
.user-name { font-size: 13px; color: #303133; font-weight: 500; }
.user-id { font-size: 11px; color: #909399; }

.wait-normal { color: #E6A23C; }
.wait-overdue { color: #F56C6C; font-weight: bold; }

.reject-content-text {
  max-height: 120px; overflow-y: auto;
  word-break: break-all; font-size: 13px; color: #303133;
}

.context-section { margin-bottom: 24px; }
.context-section h4 { font-size: 14px; font-weight: 500; color: #303133; margin: 0 0 12px; }
.context-content-box {
  background: #f5f7fa; border-radius: 8px; padding: 16px;
  margin-bottom: 12px;
}
.context-text { margin: 0; white-space: pre-wrap; word-break: break-all; font-size: 14px; }
.context-meta { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #909399; margin-top: 12px; }

.pagination-wrapper {
  display: flex; justify-content: center;
  padding: 16px 0 0;
}

.text-muted { color: #909399; font-size: 13px; }
</style>
