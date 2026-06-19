<template>
  <div class="safety-audit-page">
    <div class="page-header">
      <h2 class="page-title">内容安全审核</h2>
      <p class="page-desc">AI 生成内容审核、敏感词命中记录、违规内容处理</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-num warning">{{ stats.pending }}</div>
        <div class="stat-label">待审核</div>
      </div>
      <div class="stat-card">
        <div class="stat-num success">{{ stats.approved }}</div>
        <div class="stat-label">已通过</div>
      </div>
      <div class="stat-card">
        <div class="stat-num danger">{{ stats.blocked }}</div>
        <div class="stat-label">已拦截</div>
      </div>
      <div class="stat-card">
        <div class="stat-num info">{{ stats.flagged }}</div>
        <div class="stat-label">待复核</div>
      </div>
    </div>

    <div class="card">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm">
          <el-form-item label="调用类型">
            <el-select v-model="filterForm.callType" placeholder="全部" clearable style="width: 130px" @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option label="缘分匹配" value="match" />
              <el-option label="聊天话术" value="chat_skill" />
              <el-option label="红娘咨询" value="matchmaker" />
              <el-option label="趣味测试" value="fun_quiz" />
              <el-option label="个人画像" value="profile_gen" />
            </el-select>
          </el-form-item>
          <el-form-item label="审核状态">
            <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 130px" @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option label="待审核" value="PENDING" />
              <el-option label="已通过" value="PASS" />
              <el-option label="已拦截" value="BLOCK" />
              <el-option label="待复核" value="MANUAL_REVIEW" />
            </el-select>
          </el-form-item>
          <el-form-item label="敏感词等级">
            <el-select v-model="filterForm.level" placeholder="全部" clearable style="width: 130px" @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option label="一级拦截" value="1" />
              <el-option label="二级替换" value="2" />
              <el-option label="三级标记" value="3" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="结束"
              value-format="YYYY-MM-DD"
              style="width: 240px"
              @change="handleSearch"
            />
          </el-form-item>
          <el-form-item label="用户ID">
            <el-input v-model="filterForm.userId" placeholder="输入用户ID" clearable style="width: 140px" @keyup.enter="handleSearch" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 批量操作 -->
      <div v-if="selectedRows.length > 0" class="batch-bar">
        <el-button type="success" @click="handleBatchPass">批量通过 ({{ selectedRows.length }})</el-button>
        <el-button type="danger" @click="handleBatchBlock">批量拦截 ({{ selectedRows.length }})</el-button>
      </div>

      <!-- 表格 -->
      <el-table
        ref="tableRef"
        :data="tableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        row-key="id"
        stripe
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <div class="user-cell">
              <span class="user-name">{{ row.userNickname || '用户' + row.userId }}</span>
              <span class="user-id">ID:{{ row.userId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="callType" label="调用类型" width="110">
          <template #default="{ row }">
            <el-tag :type="getCallTypeColor(row.callType)" size="small">
              {{ getCallTypeLabel(row.callType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="生成内容" min-width="260">
          <template #default="{ row }">
            <div class="content-cell">
              <el-tooltip :content="row.content" placement="top" :show-after="500">
                <span class="content-text">{{ truncateText(row.content, 80) }}</span>
              </el-tooltip>
              <div v-if="row.sensitiveWords?.length" class="sensitive-tags">
                <el-tag
                  v-for="(w, i) in row.sensitiveWords"
                  :key="i"
                  :type="getLevelTagType(row.safetyLevel)"
                  size="small"
                  effect="dark"
                >
                  {{ w }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="敏感词等级" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.safetyLevel === 1" type="danger" size="small">一级拦截</el-tag>
            <el-tag v-else-if="row.safetyLevel === 2" type="warning" size="small">二级替换</el-tag>
            <el-tag v-else-if="row.safetyLevel === 3" type="info" size="small">三级标记</el-tag>
            <span v-else class="safe-text">安全</span>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.auditResult === 'PASS'" type="success" size="small">已通过</el-tag>
            <el-tag v-else-if="row.auditResult === 'BLOCK'" type="danger" size="small">已拦截</el-tag>
            <el-tag v-else-if="row.auditResult === 'MANUAL_REVIEW'" type="warning" size="small">待复核</el-tag>
            <el-tag v-else type="info" size="small">待审核</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="生成时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="success" size="small" link @click="handlePass(row)">通过</el-button>
            <el-button type="danger" size="small" link @click="handleBlock(row)">拦截</el-button>
            <el-button type="warning" size="small" link @click="handleMarkReview(row)">标记复核</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </div>

    <!-- 内容详情弹窗 -->
    <el-dialog v-model="detailVisible" title="内容详情" width="600px">
      <div class="detail-body" v-if="detailRow">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="用户ID">{{ detailRow.userId }}</el-descriptions-item>
          <el-descriptions-item label="调用类型">{{ getCallTypeLabel(detailRow.callType) }}</el-descriptions-item>
          <el-descriptions-item label="生成时间">{{ formatTime(detailRow.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="审核状态">{{ detailRow.auditResult || '待审核' }}</el-descriptions-item>
        </el-descriptions>
        <div class="detail-content-section">
          <h4>生成内容</h4>
          <div class="content-full">{{ detailRow.content }}</div>
        </div>
        <div v-if="detailRow.sensitiveWords?.length" class="detail-words-section">
          <h4>命中敏感词</h4>
          <div class="words-list">
            <el-tag v-for="w in detailRow.sensitiveWords" :key="w" type="warning" style="margin-right: 8px; margin-bottom: 4px;">{{ w }}</el-tag>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="success" @click="handlePass(detailRow!); detailVisible = false">通过</el-button>
        <el-button type="danger" @click="handleBlock(detailRow!); detailVisible = false">拦截</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api/request'

interface AuditItem {
  id: number
  userId: number
  userNickname: string
  callType: string
  content: string
  sensitiveWords: string[]
  safetyLevel: number
  auditResult: string
  createdAt: string
}

const loading = ref(false)
const tableData = ref<AuditItem[]>([])
const tableRef = ref()
const selectedRows = ref<AuditItem[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const dateRange = ref<string[]>([])
const detailVisible = ref(false)
const detailRow = ref<AuditItem | null>(null)

const filterForm = reactive({
  callType: '',
  status: '',
  level: '',
  userId: '',
})

const stats = reactive({
  pending: 0,
  approved: 0,
  blocked: 0,
  flagged: 0,
})

onMounted(() => {
  fetchData()
  fetchStats()
})

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = { page: page.value, limit: pageSize.value }
    if (filterForm.callType) params.callType = filterForm.callType
    if (filterForm.status) params.auditResult = filterForm.status
    if (filterForm.level) params.level = filterForm.level
    if (filterForm.userId) params.userId = filterForm.userId
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res: any = await request.get('/admin/ai/safety-audits', { params })
    tableData.value = res?.data?.items || res?.items || []
    total.value = res?.data?.total || res?.total || 0
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const res: any = await request.get('/admin/ai/safety-audits/stats')
    const data = res?.data || res || {}
    stats.pending = data.pending || 0
    stats.approved = data.approved || 0
    stats.blocked = data.blocked || 0
    stats.flagged = data.flagged || 0
  } catch { /* ignore */ }
}

const handleSearch = () => { page.value = 1; fetchData() }

const handleReset = () => {
  filterForm.callType = ''
  filterForm.status = ''
  filterForm.level = ''
  filterForm.userId = ''
  dateRange.value = []
  page.value = 1
  fetchData()
}

const handleSelectionChange = (rows: AuditItem[]) => {
  selectedRows.value = rows
}

const updateAudit = async (id: number, result: string) => {
  try {
    await request.put(`/admin/ai/safety-audits/${id}`, { auditResult: result })
    ElMessage.success('操作成功')
    fetchData()
    fetchStats()
  } catch {
    ElMessage.error('操作失败')
  }
}

const handlePass = (row: AuditItem) => {
  ElMessageBox.confirm(`确认通过该内容的审核？`, '审核确认', {
    confirmButtonText: '确认通过',
    cancelButtonText: '取消',
    type: 'success',
  }).then(() => updateAudit(row.id, 'PASS'))
}

const handleBlock = (row: AuditItem) => {
  ElMessageBox.prompt('请输入拦截原因', '拦截确认', {
    confirmButtonText: '确认拦截',
    cancelButtonText: '取消',
    inputPlaceholder: '拦截原因',
    inputType: 'textarea',
    type: 'warning',
  }).then(({ value }) => {
    updateAudit(row.id, 'BLOCK').then(() => {
      // 也可调用下架 API
      request.put(`/admin/ai/safety-audits/${row.id}/remove`, { reason: value }).catch(() => {})
    })
  }).catch(() => {})
}

const handleMarkReview = (row: AuditItem) => {
  updateAudit(row.id, 'MANUAL_REVIEW')
}

const handleBatchPass = () => {
  const ids = selectedRows.value.map((r) => r.id)
  ElMessageBox.confirm(`确认批量通过 ${ids.length} 条内容？`, '批量审核', { type: 'success' })
    .then(async () => {
      try {
        await request.put('/admin/ai/safety-audits/batch', { ids, auditResult: 'PASS' })
        ElMessage.success('操作成功')
        fetchData()
        fetchStats()
      } catch { ElMessage.error('操作失败') }
    }).catch(() => {})
}

const handleBatchBlock = () => {
  const ids = selectedRows.value.map((r) => r.id)
  ElMessageBox.confirm(`确认批量拦截 ${ids.length} 条内容？`, '批量审核', { type: 'warning' })
    .then(async () => {
      try {
        await request.put('/admin/ai/safety-audits/batch', { ids, auditResult: 'BLOCK' })
        ElMessage.success('操作成功')
        fetchData()
        fetchStats()
      } catch { ElMessage.error('操作失败') }
    }).catch(() => {})
}

// ===== 工具 =====
const getCallTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    match: '缘分匹配', chat_skill: '聊天话术', matchmaker: '红娘咨询',
    fun_quiz: '趣味测试', profile_gen: '个人画像',
  }
  return map[type] || type
}

const getCallTypeColor = (type: string): string => {
  const map: Record<string, string> = {
    match: '', chat_skill: 'success', matchmaker: 'warning',
    fun_quiz: 'primary', profile_gen: 'info',
  }
  return map[type] || ''
}

const getLevelTagType = (level: number): string => {
  if (level === 1) return 'danger'
  if (level === 2) return 'warning'
  return 'info'
}

const formatTime = (s: string): string => {
  if (!s) return '-'
  return s.replace('T', ' ').slice(0, 19)
}

const truncateText = (text: string, max: number): string => {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '...' : text
}
</script>

<style lang="scss" scoped>
.safety-audit-page { padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 22px; margin: 0 0 6px; }
.page-desc { color: #999; margin: 0; font-size: 14px; }

.stats-row { display: flex; gap: 16px; margin-bottom: 20px; }
.stat-card {
  flex: 1; background: #fff; border-radius: 8px; padding: 20px;
  text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.stat-num { font-size: 32px; font-weight: bold; }
.stat-num.warning { color: #E6A23C; }
.stat-num.success { color: #67C23A; }
.stat-num.danger { color: #F56C6C; }
.stat-num.info { color: #409EFF; }
.stat-label { font-size: 14px; color: #999; margin-top: 6px; }

.card { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.filter-bar { margin-bottom: 16px; }
.batch-bar { padding: 8px 0 16px; display: flex; gap: 12px; }

.content-cell { max-width: 260px; }
.content-text { font-size: 13px; color: #333; line-height: 1.5; word-break: break-all; cursor: pointer; }
.sensitive-tags { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px; }
.safe-text { color: #67C23A; font-size: 12px; }

.user-cell { display: flex; flex-direction: column; gap: 2px; }
.user-name { font-size: 13px; color: #333; }
.user-id { font-size: 11px; color: #999; }

.pagination-wrap { margin-top: 20px; display: flex; justify-content: flex-end; }

.detail-content-section, .detail-words-section { margin-top: 20px; }
.detail-content-section h4, .detail-words-section h4 { margin: 0 0 8px; font-size: 14px; }
.content-full {
  background: #f5f5f5; border-radius: 6px; padding: 12px;
  font-size: 14px; line-height: 1.7; white-space: pre-wrap; word-break: break-all;
  max-height: 300px; overflow-y: auto;
}
</style>
