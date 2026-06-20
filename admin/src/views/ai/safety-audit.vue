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

        <!-- 生成内容卡片列 -->
        <el-table-column label="生成内容" min-width="280">
          <template #default="{ row }">
            <div class="content-card" @click="openContentDialog(row)">
              <div class="content-card-text">{{ getPreviewText(row.content) }}</div>
              <div v-if="row.sensitiveWords?.length" class="content-card-tags">
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
              <div class="content-card-hint">点击查看完整内容</div>
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
            <el-button type="success" size="small" link @click.stop="handlePass(row)">通过</el-button>
            <el-button type="danger" size="small" link @click.stop="handleBlock(row)">拦截</el-button>
            <el-button type="warning" size="small" link @click.stop="handleMarkReview(row)">标记复核</el-button>
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

    <!-- AI 生成内容详情弹窗 -->
    <el-dialog
      v-model="contentDialogVisible"
      title="AI 生成内容详情"
      width="600px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-if="contentDialogRow" class="content-dialog">
        <!-- 完整内容区 -->
        <div class="content-dialog-section">
          <div class="content-full-box">{{ formattedContent }}</div>
        </div>

        <!-- 命中敏感词 -->
        <div v-if="contentDialogRow.sensitiveWords?.length" class="content-dialog-section">
          <h4 class="section-label">命中敏感词</h4>
          <div class="words-list">
            <el-tag v-for="w in contentDialogRow.sensitiveWords" :key="w" type="warning" style="margin-right: 8px; margin-bottom: 4px;">{{ w }}</el-tag>
          </div>
        </div>

        <!-- 元信息 -->
        <div class="content-dialog-meta">
          <h4 class="section-label">元信息</h4>
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-k">用户ID</span>
              <span class="meta-v">{{ contentDialogRow.userId }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-k">调用类型</span>
              <span class="meta-v">{{ getCallTypeLabel(contentDialogRow.callType) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-k">生成时间</span>
              <span class="meta-v">{{ formatTime(contentDialogRow.createdAt) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-k">敏感词等级</span>
              <span class="meta-v">
                <el-tag v-if="contentDialogRow.safetyLevel === 1" type="danger" size="small">一级拦截</el-tag>
                <el-tag v-else-if="contentDialogRow.safetyLevel === 2" type="warning" size="small">二级替换</el-tag>
                <el-tag v-else-if="contentDialogRow.safetyLevel === 3" type="info" size="small">三级标记</el-tag>
                <span v-else style="color: #67C23A;">安全</span>
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-k">审核状态</span>
              <span class="meta-v">
                <el-tag v-if="contentDialogRow.auditResult === 'PASS'" type="success" size="small">已通过</el-tag>
                <el-tag v-else-if="contentDialogRow.auditResult === 'BLOCK'" type="danger" size="small">已拦截</el-tag>
                <el-tag v-else-if="contentDialogRow.auditResult === 'MANUAL_REVIEW'" type="warning" size="small">待复核</el-tag>
                <el-tag v-else type="info" size="small">待审核</el-tag>
              </span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="contentDialogVisible = false">关闭</el-button>
        <el-button
          v-if="contentDialogRow?.auditResult !== 'PASS'"
          type="success"
          @click="auditInDialog('PASS')"
        >通过</el-button>
        <el-button
          v-if="contentDialogRow?.auditResult !== 'BLOCK'"
          type="danger"
          @click="auditInDialog('BLOCK')"
        >拦截</el-button>
        <el-button
          v-if="contentDialogRow?.auditResult !== 'MANUAL_REVIEW'"
          type="warning"
          @click="auditInDialog('MANUAL_REVIEW')"
        >标记复核</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
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

// 内容详情弹窗
const contentDialogVisible = ref(false)
const contentDialogRow = ref<AuditItem | null>(null)

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

// ---- 格式化 JSON 内容 ----
const formattedContent = computed(() => {
  const text = contentDialogRow.value?.content || ''
  try {
    const parsed = JSON.parse(text)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return text
  }
})

// ---- 内容卡片预览文本（前 100 字或前 3 行）----
const getPreviewText = (text: string): string => {
  if (!text) return '(空)'
  // 先取前 3 行
  const lines = text.split('\n')
  const firstThree = lines.slice(0, 3).join('\n')
  if (firstThree.length <= 100) return firstThree
  return firstThree.slice(0, 100) + '...'
}

// ---- 打开内容详情弹窗 ----
const openContentDialog = (row: AuditItem) => {
  contentDialogRow.value = row
  contentDialogVisible.value = true
}

// ---- 弹窗中操作 ----
const auditInDialog = (result: string) => {
  if (!contentDialogRow.value) return
  if (result === 'PASS') {
    confirmPass(contentDialogRow.value.id)
  } else if (result === 'BLOCK') {
    promptBlock(contentDialogRow.value.id)
  } else if (result === 'MANUAL_REVIEW') {
    updateAudit(contentDialogRow.value.id, 'MANUAL_REVIEW').then(() => {
      contentDialogVisible.value = false
    })
  }
}

// ---- 审核操作 ----
const updateAudit = async (id: number, result: string): Promise<void> => {
  try {
    await request.put(`/admin/ai/safety-audits/${id}`, { auditResult: result })
    ElMessage.success('操作成功')
    // 更新表格中的行数据
    const row = tableData.value.find((r) => r.id === id)
    if (row) row.auditResult = result
    if (contentDialogRow.value?.id === id) {
      contentDialogRow.value.auditResult = result
    }
    fetchStats()
  } catch {
    ElMessage.error('操作失败')
  }
}

const hasPassed = (row: AuditItem): boolean => row.auditResult === 'PASS'
const hasBlocked = (row: AuditItem): boolean => row.auditResult === 'BLOCK'

const confirmPass = (id: number) => {
  ElMessageBox.confirm('确认通过该内容的审核？', '审核确认', {
    confirmButtonText: '确认通过',
    cancelButtonText: '取消',
    type: 'success',
  }).then(() => updateAudit(id, 'PASS').then(() => { contentDialogVisible.value = false }))
}

const promptBlock = (id: number) => {
  ElMessageBox.prompt('请输入拦截原因', '拦截确认', {
    confirmButtonText: '确认拦截',
    cancelButtonText: '取消',
    inputPlaceholder: '拦截原因',
    inputType: 'textarea',
    type: 'warning',
  }).then(({ value }) => {
    updateAudit(id, 'BLOCK').then(() => {
      contentDialogVisible.value = false
      request.put(`/admin/ai/safety-audits/${id}/remove`, { reason: value }).catch(() => {})
    })
  }).catch(() => {})
}

const handlePass = (row: AuditItem) => { confirmPass(row.id) }
const handleBlock = (row: AuditItem) => { promptBlock(row.id) }
const handleMarkReview = (row: AuditItem) => { updateAudit(row.id, 'MANUAL_REVIEW') }

// ---- API ----
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

// ---- 批量操作 ----
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

// ===== 用户信息 =====
.user-cell { display: flex; flex-direction: column; gap: 2px; }
.user-name { font-size: 13px; color: #333; }
.user-id { font-size: 11px; color: #999; }

.safe-text { color: #67C23A; font-size: 12px; }

// ===== 生成内容卡片 =====
.content-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  max-height: 100px;
  overflow: hidden;
  position: relative;

  &:hover {
    border-color: #409EFF;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  }
}
.content-card-text {
  font-size: 13px;
  color: #333;
  line-height: 1.6;
  word-break: break-all;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.content-card-tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.content-card-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #999;
  text-align: center;
}

// ===== 弹窗内容区 =====
.content-dialog-section { margin-bottom: 20px; }
.section-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0 0 10px;
}

// 完整内容展示
.content-full-box {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  max-height: 60vh;
  overflow-y: auto;
}

// 敏感词列表
.words-list {
  display: flex;
  flex-wrap: wrap;
}

// 元信息
.content-dialog-meta {
  border-top: 1px solid #F0F0F0;
  padding-top: 16px;
}
.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.meta-k {
  font-size: 13px;
  color: #999;
  flex-shrink: 0;
}
.meta-v {
  font-size: 13px;
  color: #333;
}

.pagination-wrap { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
