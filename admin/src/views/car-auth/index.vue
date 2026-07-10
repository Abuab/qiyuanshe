<template>
  <div class="car-auth-page">
    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>车产认证审核</span>
        </div>
      </template>

      <div class="filter-bar">
        <el-select v-model="filterStatus" placeholder="全部状态" clearable @change="handleSearch" style="width: 140px">
          <el-option label="待审核" :value="0" />
          <el-option label="已通过" :value="1" />
          <el-option label="已拒绝" :value="2" />
        </el-select>
        <el-button type="primary" @click="handleSearch" style="margin-left: 12px">查询</el-button>
      </div>

      <el-table :data="list" border stripe v-loading="loading" style="margin-top: 16px">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="昵称" min-width="120">
          <template #default="{ row }">
            <span>{{ row.user?.nickname || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="行驶证图片" width="120" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.authData?.image"
              :src="resolveImg(row.authData.image)"
              :preview-src-list="[resolveImg(row.authData.image)]"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 6px"
              :hide-on-click-modal="true"
            >
              <template #error>
                <span style="font-size: 12px; color: #999">加载失败</span>
              </template>
            </el-image>
            <span v-else style="color: #999; font-size: 12px">未上传</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="row.status === 1" type="success" size="small">已通过</el-tag>
            <el-tag v-else-if="row.status === 2" type="danger" size="small">已拒绝</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="rejectReason" label="拒绝原因" min-width="140">
          <template #default="{ row }">
            <span>{{ row.rejectReason || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="170" align="center">
          <template #default="{ row }">
            <span>{{ formatTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" v-if="!isReadonlyRole">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button type="success" size="small" link @click="approve(row)">通过</el-button>
              <el-button type="danger" size="small" link @click="reject(row)">拒绝</el-button>
            </template>
            <el-button v-else size="small" link type="warning" @click="reAudit(row)">重新审核</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pageNum"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 拒绝对话框 -->
    <el-dialog v-model="rejectVisible" title="拒绝原因" width="420px" :close-on-click-modal="false">
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="4"
        placeholder="请输入拒绝原因"
        maxlength="200"
        show-word-limit
      />
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="rejecting">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getCarAuthList, auditCarAuth } from '@/api/car-auth'
import { useAdminStore } from '../../store/admin'

const adminStore = useAdminStore()
const isReadonlyRole = computed(() => adminStore.userInfo?.role === 'readonly')

const list = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(15)
const filterStatus = ref<number | string>('')

// 拒绝
const rejectVisible = ref(false)
const rejectTarget = ref<any>(null)
const rejectReason = ref('')
const rejecting = ref(false)

// 图片地址解析：处理相对路径
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
function resolveImg(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  if (path.startsWith('/uploads/')) {
    if (API_BASE && !API_BASE.endsWith('/')) return `${API_BASE}${path}`
    return path
  }
  return path
}

function formatTime(val: string | number | Date): string {
  if (!val) return '-'
  const d = new Date(val)
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
    const params: any = { page: pageNum.value, pageSize: pageSize.value }
    if (filterStatus.value !== '' && filterStatus.value !== null && filterStatus.value !== undefined) {
      params.status = filterStatus.value
    }
    const res: any = await getCarAuthList(params)
    const data = res?.data || res
    list.value = data?.list || []
    total.value = data?.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pageNum.value = 1
  fetchList()
}

async function approve(row: any) {
  try {
    await auditCarAuth({ id: row.id, status: 1 })
    ElMessage.success('已通过')
    fetchList()
    adminStore.fetchPendingAuditCount()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

function reject(row: any) {
  rejectTarget.value = row
  rejectReason.value = ''
  rejectVisible.value = true
}

async function confirmReject() {
  if (!rejectTarget.value) return
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请输入拒绝原因')
    return
  }
  rejecting.value = true
  try {
    await auditCarAuth({ id: rejectTarget.value.id, status: 2, rejectReason: rejectReason.value.trim() })
    ElMessage.success('已拒绝')
    rejectVisible.value = false
    fetchList()
    adminStore.fetchPendingAuditCount()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    rejecting.value = false
  }
}

async function reAudit(row: any) {
  try {
    await auditCarAuth({ id: row.id, status: 0 })
    ElMessage.success('已退回待审核')
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.car-auth-page {
  padding: 20px;
}
.table-card {
  .card-header {
    font-size: 16px;
    font-weight: 600;
  }
}
.filter-bar {
  display: flex;
  align-items: center;
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
