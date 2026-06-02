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
            <el-select v-model="filterForm.type" placeholder="全部" clearable style="width: 120px">
              <el-option label="全部" :value="undefined" />
              <el-option label="用户" value="user" />
              <el-option label="照片" value="photo" />
              <el-option label="回答" value="answer" />
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
          <el-button type="success" @click="handleBatchApprove">批量通过</el-button>
          <el-button type="danger" @click="handleBatchReject">批量拒绝</el-button>
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
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.targetType || row.type)" size="small">
              {{ getTypeName(row.targetType || row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容预览" min-width="200">
          <template #default="{ row }">
            <div class="content-preview">
              <span>{{ row.reason || row.action || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="submitter" label="提交人" width="120">
          <template #default="{ row }">
            <div class="submitter">
              <span>{{ row.targetId ? 'ID:' + row.targetId : '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column v-if="activeTab === 'pending'" label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="success" link @click="handleApprove(row)">通过</el-button>
            <el-button type="danger" link @click="handleReject(row)">拒绝</el-button>
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminAudit } from '../../api'
import type { AuditItem } from '../../api/audit'

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
const rejectForm = reactive({
  reason: '',
})
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

async function handleApprove(row: AuditItem) {
  try {
    await ElMessageBox.confirm('确定要通过该审核吗？', '确认通过', { type: 'success' })
    await adminAudit.approve(row.id)
    ElMessage.success('审核已通过')
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
    user: '用户',
    photo: '照片',
    answer: '回答',
  }
  return map[type] || type
}

function getTypeTagType(type: string) {
  const map: Record<string, string> = {
    user: 'primary',
    photo: 'warning',
    answer: 'success',
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
    width: 50px;
    height: 50px;
    border-radius: 4px;
  }
}

.submitter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
