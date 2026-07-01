<template>
  <div class="single-promise-list">
    <div class="page-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>审核管理</el-breadcrumb-item>
        <el-breadcrumb-item>单身承诺审核</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="card search-area">
      <el-form :model="filterForm" inline>
        <el-form-item label="审核状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="全部" :value="undefined" />
            <el-option label="待审核" :value="0" />
            <el-option label="已通过" :value="1" />
            <el-option label="已拒绝" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="card">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户昵称" width="150">
          <template #default="{ row }">
            {{ row.user?.nickname || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="realName" label="真实姓名" width="120" />
        <el-table-column label="签名图片" width="180">
          <template #default="{ row }">
            <el-image
              v-if="row.signatureUrl"
              :src="row.signatureUrl"
              fit="contain"
              style="width: 160px; height: 80px; background: #f5f5f5; border-radius: 4px; cursor: pointer"
              :preview-src-list="[row.signatureUrl]"
              :preview-teleported="true"
            >
              <template #error>
                <div style="width:160px;height:80px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border-radius:4px;color:#ccc;font-size:12px">暂无签名</div>
              </template>
            </el-image>
            <span v-else style="color: #ccc; font-size: 12px">未上传</span>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rejectReason" label="拒绝原因" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.rejectReason || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="签署日期" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="审核时间" width="180">
          <template #default="{ row }">
            {{ row.auditTime ? formatDate(row.auditTime) : '-' }}
          </template>
        </el-table-column>
        <el-table-column v-if="!isReadonly" label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button type="success" link size="small" @click="handleApprove(row)">通过</el-button>
              <el-button type="danger" link size="small" @click="handleReject(row)">拒绝</el-button>
            </template>
            <template v-else-if="row.status === 2">
              <el-button type="warning" link size="small" @click="handleReaudit(row)">重新审核</el-button>
            </template>
            <template v-else>
              <span style="color: #999; font-size: 12px">-</span>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="filterForm.page"
          v-model:page-size="filterForm.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 拒绝原因弹窗 -->
    <el-dialog v-model="rejectDialogVisible" title="拒绝原因" width="500px" :close-on-click-modal="false">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="拒绝原因">
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请填写拒绝原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="rejecting">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminStore } from '../../store/admin'
import { adminSinglePromise } from '../../api'
import type { SinglePromiseItem } from '../../api/single-promise'

const adminStore = useAdminStore()
const isReadonly = computed(() => adminStore.userInfo?.role === 'readonly')
const loading = ref(false)
const list = ref<SinglePromiseItem[]>([])
const total = ref(0)

const filterForm = reactive({
  status: undefined as number | undefined,
  page: 1,
  pageSize: 10,
})

// 拒绝弹窗
const rejectDialogVisible = ref(false)
const rejecting = ref(false)
const currentRejectRow = ref<SinglePromiseItem | null>(null)
const rejectForm = reactive({ reason: '' })

function getStatusLabel(status: number) {
  const map: Record<number, string> = {
    0: '待审核',
    1: '已通过',
    2: '已拒绝',
  }
  return map[status] || '未知'
}

function getStatusTagType(status: number) {
  const map: Record<number, string> = {
    0: 'warning',
    1: 'success',
    2: 'danger',
  }
  return map[status] || 'info'
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = {
      page: filterForm.page,
      pageSize: filterForm.pageSize,
    }
    if (filterForm.status !== undefined) {
      params.status = filterForm.status
    }
    const res = await adminSinglePromise.list(params)
    const data = res.data
    list.value = data?.list || []
    total.value = data?.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  filterForm.page = 1
  fetchList()
}

function handleReset() {
  filterForm.status = undefined
  filterForm.page = 1
  fetchList()
}

function handleSizeChange() {
  filterForm.page = 1
  fetchList()
}

function handleCurrentChange() {
  fetchList()
}

function handleApprove(row: SinglePromiseItem) {
  ElMessageBox.confirm(`确认通过用户「${row.realName}」的单身承诺审核？`, '审核确认', {
    confirmButtonText: '确认通过',
    cancelButtonText: '取消',
    type: 'success',
  }).then(async () => {
    try {
      await adminSinglePromise.audit(row.id, { status: 1 })
      ElMessage.success('审核通过')
      fetchList()
    } catch (e: any) {
      if (e !== 'cancel') {
        ElMessage.error(e?.message || '操作失败')
      }
    }
  }).catch(() => {})
}

function handleReject(row: SinglePromiseItem) {
  currentRejectRow.value = row
  rejectForm.reason = row.rejectReason || ''
  rejectDialogVisible.value = true
}

async function confirmReject() {
  if (!currentRejectRow.value) return
  rejecting.value = true
  try {
    await adminSinglePromise.audit(currentRejectRow.value.id, {
      status: 2,
      rejectReason: rejectForm.reason || '审核未通过',
    })
    ElMessage.success('已拒绝')
    rejectDialogVisible.value = false
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    rejecting.value = false
  }
}

function handleReaudit(row: SinglePromiseItem) {
  ElMessageBox.confirm(`确认重新审核用户「${row.realName}」的单身承诺？`, '重新审核确认', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await adminSinglePromise.audit(row.id, { status: 0 })
      ElMessage.success('已重置为待审核')
      fetchList()
    } catch (e: any) {
      if (e !== 'cancel') {
        ElMessage.error(e?.message || '操作失败')
      }
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.page-header {
  margin-bottom: 16px;
}

.search-area {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
}

.card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
