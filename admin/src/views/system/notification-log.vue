<template>
  <div class="notification-log-page">
    <div class="page-header">
      <h2 class="page-title">通知日志</h2>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-card">
      <div class="filter-row">
        <el-select v-model="filter.status" placeholder="状态" clearable style="width:120px">
          <el-option label="全部" :value="undefined" />
          <el-option label="成功" :value="1" />
          <el-option label="失败" :value="0" />
          <el-option label="待处理" :value="2" />
        </el-select>

        <el-select v-model="filter.channel" placeholder="通道" clearable style="width:130px">
          <el-option label="全部" :value="undefined" />
          <el-option label="企业微信" value="wecom" />
          <el-option label="飞书" value="feishu" />
          <el-option label="钉钉" value="dingtalk" />
        </el-select>

        <el-select v-model="filter.source" placeholder="来源" clearable style="width:140px">
          <el-option label="全部" :value="undefined" />
          <el-option label="头像上传" value="avatar_upload" />
          <el-option label="照片上传" value="photo_upload" />
          <el-option label="聊天消息" value="chat_message" />
          <el-option label="用户资料" value="user_profile" />
          <el-option label="举报" value="report" />
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

        <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
        <el-button @click="reset">重置</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-num">{{ stats.total }}</span>
        <span class="stat-label">今日发送总数</span>
      </div>
      <div class="stat-card">
        <span class="stat-num" style="color:#67C23A">{{ stats.success }}</span>
        <span class="stat-label">成功数</span>
      </div>
      <div class="stat-card">
        <span class="stat-num" style="color:#F56C6C">{{ stats.failed }}</span>
        <span class="stat-label">失败数</span>
      </div>
      <div class="stat-card">
        <span class="stat-num" style="color:#E6A23C">{{ stats.pending }}</span>
        <span class="stat-label">待处理数</span>
      </div>
    </div>

    <!-- 日志表格 -->
    <div class="table-card">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        row-key="id"
        :row-height="56"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="id" label="ID" width="60" align="center" />
        <el-table-column label="时间" width="170" sortable="custom" prop="createdAt">
          <template #default="{ row }">
            <el-tooltip :content="relativeTime(row.createdAt)" placement="top">
              <span>{{ formatTime(row.createdAt) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.success === 1" type="success" size="small">成功</el-tag>
            <el-tag v-else-if="row.success === 0" type="danger" size="small">失败</el-tag>
            <el-tag v-else type="warning" size="small">待处理</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="通道" width="100">
          <template #default="{ row }">
            <span class="channel-cell">
              <el-icon v-if="row.channel === 'wecom'" :size="14"><ChatLineSquare /></el-icon>
              <el-icon v-else-if="row.channel === 'feishu'" :size="14"><ChatDotRound /></el-icon>
              <el-icon v-else-if="row.channel === 'dingtalk'" :size="14"><ChatRound /></el-icon>
              {{ channelName(row.channel) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="110">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ sourceName(row.source || row.notifyType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户" width="150">
          <template #default="{ row }">
            <div class="user-cell" v-if="row.userId || row.userNickname">
              <el-image
                v-if="row.userAvatar"
                :src="row.userAvatar"
                fit="cover"
                style="width:28px;height:28px;border-radius:50%"
              />
              <span v-else class="user-avatar-placeholder">
                <el-icon :size="14"><User /></el-icon>
              </span>
              <span class="user-nickname">{{ row.userNickname || ('用户' + row.userId) }}</span>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="消息内容" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="viewDetail(row)">
              {{ row.content || row.errorMessage || '-' }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="审核结果" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.auditStatus === 1" type="success" size="small">通过</el-tag>
            <el-tag v-else-if="row.auditStatus === 2" type="danger" size="small">拒绝</el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="处理人" width="100">
          <template #default="{ row }">
            <span>{{ row.adminName || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.success === 0"
              type="primary"
              size="small"
              plain
              :loading="row._retrying"
              @click="retrySend(row)"
            >
              重试
            </el-button>
            <el-button
              v-if="row.success === 2 || (row.notifyType && row.id)"
              type="warning"
              size="small"
              @click="goAudit(row)"
            >
              去处理
            </el-button>
            <el-button
              type="info"
              size="small"
              plain
              @click="viewDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && tableData.length === 0" description="暂无通知记录" />

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

    <!-- 详情 Drawer -->
    <el-drawer
      v-model="detailDrawer.visible"
      title="通知详情"
      direction="rtl"
      size="460px"
    >
      <template v-if="detailDrawer.data">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="ID">{{ detailDrawer.data.id }}</el-descriptions-item>
          <el-descriptions-item label="时间">{{ formatTime(detailDrawer.data.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag v-if="detailDrawer.data.success === 1" type="success" size="small">成功</el-tag>
            <el-tag v-else-if="detailDrawer.data.success === 0" type="danger" size="small">失败</el-tag>
            <el-tag v-else type="warning" size="small">待处理</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="通道">{{ channelName(detailDrawer.data.channel) }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ sourceName(detailDrawer.data.source || detailDrawer.data.notifyType) }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ detailDrawer.data.userNickname || ('用户' + detailDrawer.data.userId) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="消息内容">
            <div class="detail-content">{{ detailDrawer.data.content || '-' }}</div>
          </el-descriptions-item>
          <el-descriptions-item v-if="detailDrawer.data.errorMessage" label="错误信息">
            <div class="detail-error">{{ detailDrawer.data.errorMessage }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, User, ChatLineSquare, ChatDotRound, ChatRound } from '@element-plus/icons-vue'
import { adminSystem } from '@/api/system'

const router = useRouter()

// ===== 筛选 =====
const filter = reactive({
  status: undefined as number | undefined,
  channel: undefined as string | undefined,
  source: undefined as string | undefined,
  dateRange: null as [string, string] | null,
})

// ===== 表格数据 =====
const tableData = ref<any[]>([])
const loading = ref(false)
const pagination = reactive({ page: 1, limit: 20, total: 0 })

// ===== 统计 =====
const stats = reactive({ total: 0, success: 0, failed: 0, pending: 0 })

// ===== 详情 Drawer =====
const detailDrawer = reactive({
  visible: false,
  data: null as any,
})

// ===== 通道/来源名称映射 =====
const channelLabels: Record<string, string> = { wecom: '企业微信', feishu: '飞书', dingtalk: '钉钉' }
function channelName(ch: string) { return channelLabels[ch] || ch || '-' }
const sourceLabels: Record<string, string> = {
  avatar_upload: '头像上传',
  photo_upload: '照片上传',
  chat_message: '聊天消息',
  question_answer: '问答答案',
  user_profile: '用户资料',
  report: '举报',
  photo: '图片审核',
  user: '用户资料审核',
  chat: '聊天消息审核',
}
function sourceName(s: string) { return sourceLabels[s] || s || '-' }

// ===== 时间格式化 =====
function formatTime(t: string) {
  if (!t) return '-'
  const d = new Date(t)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function relativeTime(t: string) {
  if (!t) return ''
  const now = Date.now()
  const diff = now - new Date(t).getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

// ===== 数据加载 =====
async function fetchLogs() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      limit: pagination.limit,
    }
    if (filter.status !== undefined) params.status = filter.status
    if (filter.channel) params.channel = filter.channel
    if (filter.source) params.source = filter.source
    if (filter.dateRange) {
      params.startDate = filter.dateRange[0]
      params.endDate = filter.dateRange[1]
    }
    // 使用 API 获取通知日志（支持筛选参数）
    const res: any = await adminSystem.getNotifyLogs(params)
    if (res.success && res.data) {
      tableData.value = (res.data.list || res.data || []).map((row: any) => ({
        ...row,
        _retrying: false,
      }))
      pagination.total = res.data.total || tableData.value.length
      stats.total = res.data?.stats?.total ?? tableData.value.length
      stats.success = res.data?.stats?.success ?? 0
      stats.failed = res.data?.stats?.failed ?? 0
      stats.pending = res.data?.stats?.pending ?? 0
    }
  } catch {
    ElMessage.error('加载通知日志失败')
  } finally {
    loading.value = false
  }
}

function search() { pagination.page = 1; fetchLogs() }
function reset() {
  filter.status = undefined
  filter.channel = undefined
  filter.source = undefined
  filter.dateRange = null
  pagination.page = 1
  fetchLogs()
}
function onPageChange() { fetchLogs() }
function onPageSizeChange() { pagination.page = 1; fetchLogs() }

function handleSortChange(_row: any) {
  fetchLogs()
}

// ===== 重试 =====
async function retrySend(row: any) {
  row._retrying = true
  try {
    const res = await adminSystem.retryWebhook(row.id)
    if (res.success) {
      ElMessage.success('重试发送成功')
      fetchLogs()
    } else {
      ElMessage.error(res.message || '重试失败')
    }
  } catch {
    ElMessage.error('重试发送失败')
  } finally {
    row._retrying = false
  }
}

// ===== 查看详情 =====
function viewDetail(row: any) {
  detailDrawer.data = row
  detailDrawer.visible = true
}

// ===== 去处理 =====
function goAudit(row: any) {
  const type = row.notifyType || row.source || ''
  if (type.includes('photo') || type.includes('avatar')) {
    router.push('/audit/list')
  } else if (type.includes('chat')) {
    router.push('/chat/monitor')
  } else {
    router.push('/audit/list')
  }
}

onMounted(() => { fetchLogs() })
</script>

<style scoped>
.notification-log-page { max-width: 1200px; padding: 0 0 24px; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 24px; font-weight: 500; color: #303133; margin: 0; }

.filter-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}
.filter-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}
.stat-card {
  flex: 1;
  border-radius: 8px;
  padding: 16px;
  background: #F5F7FA;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}
.stat-num { font-size: 24px; font-weight: bold; color: #303133; }
.stat-label { font-size: 12px; color: #909399; }

.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}

.channel-cell { display: flex; align-items: center; gap: 4px; }
.user-cell { display: flex; align-items: center; gap: 8px; }
.user-avatar-placeholder {
  width: 28px; height: 28px; border-radius: 50%;
  background: #f5f5f5; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.user-nickname { font-size: 13px; color: #303133; }
.text-muted { color: #909399; }

.detail-content {
  white-space: pre-wrap; word-break: break-all;
  max-height: 200px; overflow-y: auto;
  font-size: 13px; color: #303133;
}
.detail-error {
  white-space: pre-wrap; word-break: break-all;
  color: #F56C6C; font-size: 13px;
}

.pagination-wrapper {
  display: flex; justify-content: center;
  padding: 16px 0 0;
}
</style>
