<template>
  <div class="report-list">
    <div class="page-header">
      <h2 class="page-title">举报管理</h2>
    </div>

    <div class="card">
      <!-- 筛选区 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm">
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 130px">
              <el-option label="全部" value="" />
              <el-option label="待处理" :value="0" />
              <el-option label="已处理" :value="1" />
              <el-option label="已驳回" :value="2" />
            </el-select>
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="filterForm.type" placeholder="全部" clearable style="width: 130px">
              <el-option label="全部" value="" />
              <el-option label="用户" value="user" />
              <el-option label="内容" value="content" />
              <el-option label="照片" value="photo" />
            </el-select>
          </el-form-item>
          <el-form-item label="原因">
            <el-select v-model="filterForm.reason" placeholder="全部" clearable style="width: 130px">
              <el-option label="全部" value="" />
              <el-option label="骚扰" value="harassment" />
              <el-option label="诈骗" value="fraud" />
              <el-option label="虚假资料" value="fake_info" />
              <el-option label="辱骂" value="abuse" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading" row-key="id">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="举报人" width="130">
          <template #default="{ row }">
            <div>{{ row.reporterNickname || '-' }}</div>
            <div style="color:#999;font-size:12px">ID:{{ row.reporterPublicId || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="被举报人" width="130">
          <template #default="{ row }">
            <div>{{ row.targetNickname || '-' }}</div>
            <div style="color:#999;font-size:12px">ID:{{ row.targetPublicId || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeName(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" width="100">
          <template #default="{ row }">
            {{ getReasonName(row.reason) }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="160">
          <template #default="{ row }">
            <span class="text-ellipsis">{{ row.description || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusName(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button
              v-if="row.status === 0"
              type="warning"
              link
              @click="handleProcess(row)"
            >处理</el-button>
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

    <!-- 查看详情弹窗 -->
    <el-dialog v-model="viewDialogVisible" title="举报详情" width="500px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="举报ID">{{ currentRow?.id }}</el-descriptions-item>
        <el-descriptions-item label="举报人">{{ currentRow?.reporterNickname || '-' }}（ID:{{ currentRow?.reporterPublicId || '-' }}）</el-descriptions-item>
        <el-descriptions-item label="被举报对象">{{ currentRow?.targetNickname || '-' }}（ID:{{ currentRow?.targetPublicId || '-' }}）</el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag :type="getTypeTagType(currentRow?.type)" size="small">
            {{ getTypeName(currentRow?.type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="原因">{{ getReasonName(currentRow?.reason) }}</el-descriptions-item>
        <el-descriptions-item label="描述">{{ currentRow?.description || '-' }}</el-descriptions-item>
        <el-descriptions-item label="证据图片">
          <el-image
            v-if="currentRow?.evidence"
            :src="currentRow.evidence"
            fit="contain"
            style="max-width: 300px; max-height: 300px"
            :preview-src-list="[currentRow.evidence]"
          />
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(currentRow?.status)" size="small">
            {{ getStatusName(currentRow?.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="currentRow?.result" label="处理结果">
          {{ getResultName(currentRow.result) }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentRow?.remark" label="处理备注">{{ currentRow.remark }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ formatDate(currentRow?.createdAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 处理弹窗 -->
    <el-dialog v-model="processDialogVisible" title="处理举报" width="450px">
      <el-form :model="processForm" label-width="80px">
        <el-form-item label="处理结果" required>
          <el-radio-group v-model="processForm.result">
            <el-radio value="warn">警告</el-radio>
            <el-radio value="disable">禁用账号</el-radio>
            <el-radio value="reject">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input
            v-model="processForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入处理备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmProcess" :loading="processLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminReport } from '../../api/report'
import { formatDate } from '../../utils/date'
import type { ReportItem } from '../../api/report'

const loading = ref(false)
const tableData = ref<ReportItem[]>([])

const filterForm = reactive({
  status: '' as number | string,
  type: '',
  reason: '',
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

const viewDialogVisible = ref(false)
const currentRow = ref<ReportItem | null>(null)

const processDialogVisible = ref(false)
const processLoading = ref(false)
const processForm = reactive({
  result: 'warn',
  remark: '',
})
const currentProcessRow = ref<ReportItem | null>(null)

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      limit: pagination.limit,
    }
    if (filterForm.status !== '') params.status = filterForm.status
    if (filterForm.type) params.type = filterForm.type
    if (filterForm.reason) params.reason = filterForm.reason

    const res = await adminReport.list(params)
    if (res.success && res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取举报列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  filterForm.status = ''
  filterForm.type = ''
  filterForm.reason = ''
  pagination.page = 1
  fetchData()
}

function handleSizeChange() {
  pagination.page = 1
  fetchData()
}

function handlePageChange() {
  fetchData()
}

function handleView(row: ReportItem) {
  currentRow.value = row
  viewDialogVisible.value = true
}

function handleProcess(row: ReportItem) {
  currentProcessRow.value = row
  processForm.result = 'warn'
  processForm.remark = ''
  processDialogVisible.value = true
}

async function confirmProcess() {
  if (!currentProcessRow.value) return

  const statusMap: Record<string, number> = {
    warn: 1,
    disable: 1,
    reject: 2,
  }
  const status = statusMap[processForm.result]

  processLoading.value = true
  try {
    await adminReport.process(currentProcessRow.value.id, {
      status,
      result: processForm.result,
      remark: processForm.remark,
    })
    ElMessage.success('处理成功')
    processDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error(error)
    ElMessage.error('处理失败')
  } finally {
    processLoading.value = false
  }
}

function getTypeName(type?: string) {
  const map: Record<string, string> = {
    user: '用户',
    content: '内容',
    photo: '照片',
  }
  return map[type || ''] || type || '-'
}

function getTypeTagType(type?: string) {
  const map: Record<string, string> = {
    user: 'primary',
    content: 'success',
    photo: 'warning',
  }
  return map[type || ''] || 'info'
}

function getReasonName(reason?: string) {
  const map: Record<string, string> = {
    harassment: '骚扰',
    fraud: '诈骗',
    fake_info: '虚假资料',
    abuse: '辱骂',
    other: '其他',
  }
  return map[reason || ''] || reason || '-'
}

function getStatusName(status?: number) {
  const map: Record<number, string> = {
    0: '待处理',
    1: '已处理',
    2: '已驳回',
  }
  return map[status ?? -1] || '-'
}

function getStatusTagType(status?: number) {
  const map: Record<number, string> = {
    0: 'danger',
    1: 'success',
    2: 'info',
  }
  return map[status ?? -1] || 'info'
}

function getResultName(result?: string) {
  const map: Record<string, string> = {
    warn: '警告',
    disable: '禁用账号',
    reject: '驳回',
  }
  return map[result || ''] || result || '-'
}
</script>

<style lang="scss" scoped>
.report-list {
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
  margin-bottom: 16px;
}

.text-ellipsis {
  display: block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
