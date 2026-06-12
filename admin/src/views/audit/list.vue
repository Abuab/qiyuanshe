<template>
  <div class="audit-list">
    <div class="page-header">
      <h2 class="page-title">审核管理</h2>
    </div>

    <div class="card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="待审核" name="pending">
          <template #label>
            <span>待审核</span>
            <el-badge :value="pendingCount" :hidden="pendingCount === 0" type="warning" />
          </template>
        </el-tab-pane>
        <el-tab-pane label="已通过" name="approved" />
        <el-tab-pane label="已拒绝" name="rejected" />
      </el-tabs>

      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm">
          <el-form-item label="类型">
            <el-select v-model="filterForm.type" placeholder="全部" clearable style="width: 130px">
              <el-option label="全部" :value="undefined" />
              <el-option label="资料修改" value="user" />
              <el-option label="照片上传" value="photo" />
              <el-option label="回答审核" value="answer" />
              <el-option label="用户创建" value="user_create" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 240px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>

        <div class="batch-actions" v-if="activeTab === 'pending' && selectedRows.length > 0">
          <el-button type="success" @click="handleBatchApprove">批量通过 ({{ selectedRows.length }})</el-button>
          <el-button type="danger" @click="handleBatchReject">批量拒绝 ({{ selectedRows.length }})</el-button>
        </div>
      </div>

      <el-table
        ref="tableRef"
        :data="tableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        row-key="id"
      >
        <el-table-column v-if="activeTab === 'pending'" type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.targetType)" size="small">
              {{ row.typeLabel || getTypeName(row.targetType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交人" width="160">
          <template #default="{ row }">
            <div class="submitter" v-if="row.submitter">
              <el-image
                :src="row.submitter.avatar"
                fit="cover"
                style="width: 36px; height: 36px; border-radius: 50%; cursor: pointer"
                @click="goUserDetail(row.submitter.id)"
              >
                <template #error>
                  <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 50%">
                    <el-icon :size="18"><User /></el-icon>
                  </div>
                </template>
              </el-image>
              <span class="submitter-nickname" @click="goUserDetail(row.submitter.id)">{{ row.submitter.nickname }}</span>
            </div>
            <span v-else class="text-muted">系统提交</span>
          </template>
        </el-table-column>
        <el-table-column label="内容预览" min-width="250">
          <template #default="{ row }">
            <div class="content-preview">
              <!-- Photo type: show thumbnail -->
              <template v-if="row.targetType === 'photo' && row.content">
                <el-image
                  :src="tryParseImageUrl(row.content)"
                  fit="cover"
                  class="preview-image"
                  :preview-src-list="[tryParseImageUrl(row.content)]"
                  preview-teleported
                  style="width: 50px; height: 50px"
                >
                  <template #error>
                    <div style="width: 50px; height: 50px; background: #f5f5f5; display: flex; align-items: center; justify-content: center">
                      <el-icon :size="24"><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
              </template>
              <!-- User type: show diff if available -->
              <template v-else-if="row.targetType === 'user' && row.beforeAfter">
                <span class="diff-text">{{ formatDiff(row.beforeAfter) }}</span>
              </template>
              <!-- User create: show user summary -->
              <template v-else-if="row.targetType === 'user_create' && row.content">
                <span>{{ formatUserCreateContent(row.content) }}</span>
              </template>
              <!-- Default: show reason or content -->
              <span v-else>{{ row.reason || row.content || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="AI 审核" width="130">
          <template #default="{ row }">
            <template v-if="row.aiResult">
              <el-tag
                :type="getAiTagType(row)"
                size="small"
                effect="plain"
              >
                {{ row.aiResult }}
              </el-tag>
              <div v-if="row.aiScore" class="ai-score">置信度: {{ (row.aiScore * 100).toFixed(0) }}%</div>
            </template>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="activeTab === 'pending'">
              <el-button type="success" link @click="handleApprove(row)">通过</el-button>
              <el-button type="danger" link @click="handleReject(row)">拒绝</el-button>
            </template>
            <template v-else>
              <el-button type="primary" link @click="handleViewDetail(row)">查看详情</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <el-dialog v-model="rejectDialogVisible" title="拒绝原因" width="400px">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="拒绝原因" required>
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入拒绝原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmReject" :loading="rejectLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Picture } from '@element-plus/icons-vue'
import { adminAudit } from '../../api'
import type { AuditItem } from '../../api/audit'

const router = useRouter()
const loading = ref(false)
const activeTab = ref('pending')
const tableData = ref<AuditItem[]>([])
const selectedRows = ref<AuditItem[]>([])
const pendingCount = ref(0)
const dateRange = ref<[string, string] | null>(null)

const filterForm = reactive({
  type: undefined as string | undefined,
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

const rejectDialogVisible = ref(false)
const rejectLoading = ref(false)
const rejectForm = reactive({ reason: '' })
const currentRejectItem = ref<AuditItem | null>(null)

onMounted(() => {
  fetchData()
  fetchPendingCount()
})

async function fetchData() {
  loading.value = true
  try {
    const status = activeTab.value === 'pending' ? 0 : activeTab.value === 'approved' ? 1 : 2
    const res = await adminAudit.list({
      page: pagination.page,
      limit: pagination.limit,
      status,
      type: filterForm.type,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
    })

    if (res.success && res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取审核列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchPendingCount() {
  try {
    const res = await adminAudit.pendingCount()
    if (res.success) {
      pendingCount.value = res.data || 0
    }
  } catch (error) {
    console.error(error)
  }
}

function handleTabChange() {
  pagination.page = 1
  fetchData()
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  filterForm.type = undefined
  dateRange.value = null
  pagination.page = 1
  fetchData()
}

function handleSelectionChange(rows: AuditItem[]) {
  selectedRows.value = rows
}

function handleSizeChange() {
  pagination.page = 1
  fetchData()
}

function handlePageChange() {
  fetchData()
}

function goUserDetail(userId: number) {
  router.push(`/user/detail/${userId}`)
}

async function handleApprove(row: AuditItem) {
  try {
    await ElMessageBox.confirm('确定要通过该审核吗？通过后将自动更新用户资料。', '确认通过', { type: 'success' })
    await adminAudit.approve(row.id)
    ElMessage.success('审核已通过，用户资料已更新')
    fetchData()
    fetchPendingCount()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

function handleReject(row: AuditItem) {
  currentRejectItem.value = row
  rejectForm.reason = ''
  rejectDialogVisible.value = true
}

async function confirmReject() {
  if (!currentRejectItem.value || !rejectForm.reason.trim()) {
    ElMessage.warning('请输入拒绝原因')
    return
  }

  rejectLoading.value = true
  try {
    await adminAudit.reject(currentRejectItem.value.id, rejectForm.reason)
    ElMessage.success('已拒绝')
    rejectDialogVisible.value = false
    fetchData()
    fetchPendingCount()
  } catch (error) {
    console.error(error)
    ElMessage.error('操作失败')
  } finally {
    rejectLoading.value = false
  }
}

async function handleBatchApprove() {
  if (selectedRows.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要通过选中的 ${selectedRows.value.length} 项审核吗？`,
      '批量通过',
      { type: 'success' }
    )

    const ids = selectedRows.value.map((row) => row.id)
    await adminAudit.batchApprove(ids)
    ElMessage.success('批量通过成功')
    fetchData()
    fetchPendingCount()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

async function handleBatchReject() {
  if (selectedRows.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要拒绝选中的 ${selectedRows.value.length} 项审核吗？`,
      '批量拒绝',
      { type: 'warning' }
    )

    const ids = selectedRows.value.map((row) => row.id)
    await adminAudit.batchReject(ids, '批量拒绝')
    ElMessage.success('批量拒绝成功')
    fetchData()
    fetchPendingCount()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

function handleViewDetail(row: AuditItem) {
  if (row.submitter) {
    router.push(`/user/detail/${row.submitter.id}`)
  } else {
    ElMessage.info('无关联用户')
  }
}

function tryParseImageUrl(content?: string): string {
  if (!content) return ''
  try {
    const parsed = JSON.parse(content)
    return parsed.url || parsed.imageUrl || parsed.photoUrl || content
  } catch {
    return content
  }
}

function formatDiff(beforeAfter: any): string {
  if (!beforeAfter) return '-'
  const parts: string[] = []
  const labelMap: Record<string, string> = {
    nickname: '昵称',
    selfIntro: '简介',
    education: '学历',
    incomeRange: '收入',
    housingStatus: '住房',
    carStatus: '车辆',
    maritalStatus: '婚况',
    height: '身高',
    weight: '体重',
    occupation: '职业',
    onlyChild: '独生子女',
    whenMarry: '何时结婚',
    zodiac: '生肖',
    constellation: '星座',
    partnerAgeRange: '要求年龄',
    partnerHeightMin: '要求身高',
    partnerEducation: '要求学历',
    partnerIncome: '要求收入',
    housingRequirement: '住房要求',
    partnerMaritalStatus: '要求婚况',
    acceptChildren: '接受子女',
    partnerHometown: '要求籍贯',
    partnerResidence: '要求工作地',
    personalityTags: '我的特点',
    hopeTaTags: '希望TA',
  }
  for (const [key, label] of Object.entries(labelMap)) {
    if (beforeAfter[key] !== undefined) {
      const value = beforeAfter[key]
      const display = Array.isArray(value) ? value.join(', ') : String(value)
      parts.push(`${label}: ${display}`)
    }
  }
  return parts.length > 0 ? parts.slice(0, 4).join(' | ') : '-'
}

function formatUserCreateContent(content: string): string {
  try {
    const user = JSON.parse(content)
    const genderLabel = user.gender === 1 ? '男' : user.gender === 2 ? '女' : '未知'
    const parts: string[] = []
    if (user.nickname) parts.push(user.nickname)
    if (user.phone) parts.push(user.phone)
    parts.push(genderLabel)
    if (user.birthYear) parts.push(`${user.birthYear}年`)
    if (user.education) parts.push(user.education)
    return parts.join(' | ')
  } catch {
    return content || '-'
  }
}

function getAiTagType(row: AuditItem) {
  if (!row.aiResult) return 'info'
  const lower = row.aiResult.toLowerCase()
  if (lower.includes('网图') || lower.includes('风险') || lower.includes('异常')) return 'danger'
  if (lower.includes('完整') || lower.includes('正常') || lower.includes('可靠')) return 'success'
  return 'warning'
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTypeName(type: string) {
  const map: Record<string, string> = {
    user: '资料修改',
    photo: '照片上传',
    answer: '回答审核',
    user_create: '用户创建',
  }
  return map[type] || type
}

function getTypeTagType(type: string) {
  const map: Record<string, string> = {
    user: 'primary',
    photo: 'warning',
    answer: 'success',
    user_create: '',
  }
  return map[type] || 'info'
}
</script>

<style lang="scss" scoped>
.audit-list {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;

  .page-title {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
  }
}

.card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;

  .batch-actions {
    display: flex;
    gap: 8px;
  }
}

.content-preview {
  display: flex;
  align-items: center;
  gap: 8px;

  .preview-image {
    border-radius: 4px;
    flex-shrink: 0;
  }

  .diff-text {
    color: #303133;
    font-size: 13px;
    line-height: 1.5;
  }
}

.submitter {
  display: flex;
  align-items: center;
  gap: 8px;

  .submitter-nickname {
    cursor: pointer;
    color: #303133;
    &:hover {
      color: #409eff;
    }
  }
}

.text-muted {
  color: #909399;
  font-size: 13px;
}

.ai-score {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
