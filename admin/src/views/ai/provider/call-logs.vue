<template>
  <div class="call-logs-page">
    <div class="page-header">
      <h2 class="page-title">AI 调用日志</h2>
    </div>

    <!-- 筛选区 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="filterForm" size="default">
        <el-form-item label="功能类型">
          <el-select v-model="filterForm.callType" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="c in callTypeOptions" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="调用状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failed" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户ID">
          <el-input v-model="filterForm.userId" placeholder="用户ID" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 340px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="onSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="onReset">重置</el-button>
          <el-button type="success" :icon="Download" :loading="exportLoading" @click="onExport">导出 Excel</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 日志表格 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="logs" v-loading="loading" stripe @expand-change="onExpand">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-content">
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="Provider">{{ row.providerName || '-' }}</el-descriptions-item>
                <el-descriptions-item label="模型">{{ row.modelName || '-' }}</el-descriptions-item>
                <el-descriptions-item label="请求摘要">{{ row.requestSummary || '-' }}</el-descriptions-item>
                <el-descriptions-item label="响应摘要">{{ row.responseSummary || '-' }}</el-descriptions-item>
                <el-descriptions-item label="错误信息" :span="2">{{ row.errorMessage || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="用户" width="120">
          <template #default="{ row }">
            <span>{{ row.userNickname || '-' }}</span>
            <span style="color:#999;font-size:12px"> (ID:{{ row.userId }})</span>
          </template>
        </el-table-column>
        <el-table-column label="功能类型" width="110">
          <template #default="{ row }">
            {{ callTypeMap[row.callType] || row.callType }}
          </template>
        </el-table-column>
        <el-table-column label="Provider/模型" min-width="160">
          <template #default="{ row }">
            <div style="display:flex;flex-direction:column;gap:2px">
              <span style="font-weight:500">{{ row.providerName || '-' }}</span>
              <span style="font-size:12px;color:#999">{{ row.modelName || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="输入Token" width="100">
          <template #default="{ row }">{{ row.inputTokens ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="输出Token" width="100">
          <template #default="{ row }">{{ row.outputTokens ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="总Token" width="90">
          <template #default="{ row }">
            {{ (row.inputTokens ?? 0) + (row.outputTokens ?? 0) || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="90">
          <template #default="{ row }">
            {{ row.durationMs ? row.durationMs + 'ms' : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusMap[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="onSearch"
          @current-change="onSearch"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import { aiProviderApi } from '../../../api/ai-provider'

interface LogItem {
  id: number
  providerName: string
  modelName: string
  callType: string
  userId: string
  userNickname: string
  inputTokens: number | null
  outputTokens: number | null
  durationMs: number
  status: string
  requestSummary: string
  responseSummary: string
  errorMessage: string
  createdAt: string
}

const logs = ref<LogItem[]>([])
const loading = ref(false)
const exportLoading = ref(false)

const filterForm = reactive({
  callType: undefined as string | undefined,
  status: undefined as string | undefined,
  userId: undefined as string | undefined,
  dateRange: undefined as [string, string] | undefined,
})

const pagination = reactive({ page: 1, limit: 20, total: 0 })

const callTypeMap: Record<string, string> = {
  match: '缘分匹配',
  chat_skill: '聊天话术',
  matchmaker: '红娘咨询',
  fun_quiz: '趣味测试',
  profile_gen: '画像生成',
}
const callTypeOptions = Object.entries(callTypeMap).map(([value, label]) => ({ value, label }))

const statusMap: Record<string, string> = {
  success: '成功',
  failed: '失败',
  timeout: '超时',
}
function statusTagType(status: string) {
  return status === 'success' ? 'success' : status === 'failed' ? 'danger' : 'warning'
}

function formatDateTime(dt: string) {
  if (!dt) return '-'
  try {
    return new Date(dt).toLocaleString('zh-CN')
  } catch { return dt }
}

/** 搜索 */
async function onSearch() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      limit: pagination.limit,
    }
    if (filterForm.callType) params.callType = filterForm.callType
    if (filterForm.status) params.status = filterForm.status
    if (filterForm.userId) params.userId = filterForm.userId
    if (filterForm.dateRange) {
      params.startDate = filterForm.dateRange[0]
      params.endDate = filterForm.dateRange[1]
    }
    const res = await aiProviderApi.getCallLogs(params)
    const data = res.data || { items: [], total: 0 }
    logs.value = data.items || []
    pagination.total = data.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || '查询失败')
  } finally {
    loading.value = false
  }
}

function onReset() {
  filterForm.callType = undefined
  filterForm.status = undefined
  filterForm.userId = undefined
  filterForm.dateRange = undefined
  pagination.page = 1
  onSearch()
}

/** 导出 */
async function onExport() {
  exportLoading.value = true
  try {
    const params: Record<string, any> = { limit: 10000 }
    if (filterForm.callType) params.callType = filterForm.callType
    if (filterForm.status) params.status = filterForm.status
    if (filterForm.userId) params.userId = filterForm.userId
    if (filterForm.dateRange) {
      params.startDate = filterForm.dateRange[0]
      params.endDate = filterForm.dateRange[1]
    }
    const res = await aiProviderApi.getCallLogs(params)
    const data = res.data || { items: [] }
    const items = data.items || []
    if (items.length === 0) {
      ElMessage.warning('没有可导出的数据')
      return
    }
    // 生成 CSV
    const headers = ['ID', 'Provider', '模型', '用户昵称', '用户ID', '功能类型', '输入Token', '输出Token', '总Token', '耗时ms', '状态', '时间', '错误信息']
    const rows = items.map((r: LogItem) => [
      r.id,
      r.providerName || '-',
      r.modelName || '-',
      r.userNickname || '-',
      r.userId || '',
      callTypeMap[r.callType] || r.callType || '',
      r.inputTokens ?? 0,
      r.outputTokens ?? 0,
      (r.inputTokens ?? 0) + (r.outputTokens ?? 0),
      r.durationMs ?? '',
      statusMap[r.status] || r.status || '',
      r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN') : '',
      (r.errorMessage || '').replace(/"/g, '""'),
    ])
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${cell ?? ''}"`).join(',')),
    ].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-call-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已导出 ${items.length} 条记录`)
  } catch (e: any) {
    ElMessage.error(e?.message || '导出失败')
  } finally {
    exportLoading.value = false
  }
}

function onExpand(row: any, expandedRows: any[]) {
  // expand 不需要额外操作
}

onMounted(async () => {
  await onSearch()
})
</script>

<style lang="scss" scoped>
.call-logs-page {
  padding: 20px;
}
.page-header { margin-bottom: 20px; }
.page-title { font-size: 22px; font-weight: 600; margin: 0; color: #303133; }

.filter-card { margin-bottom: 20px; }
.table-card { margin-bottom: 20px; }
.expand-content { padding: 12px 24px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
