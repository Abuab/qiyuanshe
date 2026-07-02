<template>
  <div class="deactivated-users">
    <div class="page-header">
      <h2 class="page-title">已注销用户</h2>
    </div>

    <div class="card">
      <!-- 搜索栏 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm" class="filter-form">
          <div class="filter-row">
            <el-form-item label="关键词">
              <el-input
                v-model="filterForm.keyword"
                placeholder="昵称/手机号"
                clearable
                style="width: 220px"
                @keyup.enter="handleSearch"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">搜索</el-button>
              <el-button @click="handleReset">重置</el-button>
            </el-form-item>
          </div>
        </el-form>
      </div>

      <!-- 表格 -->
      <el-table
        :data="tableData"
        v-loading="loading"
        border
        stripe
        style="width: 100%"
        empty-text="暂无已注销用户"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="头像" width="70" align="center">
          <template #default="{ row }">
            <el-avatar :size="40" :src="row.avatar" />
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="140" show-overflow-tooltip />
        <el-table-column prop="gender" label="性别" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.gender === 1 ? 'primary' : 'danger'" size="small">
              {{ row.gender === 1 ? '男' : row.gender === 2 ? '女' : '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deleteReason" label="注销原因" width="150" show-overflow-tooltip />
        <el-table-column prop="canceledAt" label="注销时间" width="170" align="center">
          <template #default="{ row }">
            {{ row.canceledAt ? formatDate(row.canceledAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleRestore(row)">
              恢复账号
            </el-button>
            <el-popconfirm
              title="彻底删除后数据不可恢复，确认删除？"
              confirm-button-text="确认删除"
              cancel-button-text="取消"
              @confirm="handlePermanentDelete(row)"
            >
              <template #reference>
                <el-button type="danger" size="small" link>彻底删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap" v-if="total > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[15, 30, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminUsers } from '@/api/user'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const pagination = reactive({ page: 1, limit: 15 })
const filterForm = reactive({ keyword: '' })

const fetchData = async () => {
  loading.value = true
  try {
    const res = await adminUsers.getDeactivated({
      page: pagination.page,
      limit: pagination.limit,
      keyword: filterForm.keyword || undefined,
    })
    const data = (res as any)?.data || res
    tableData.value = data.list || []
    total.value = data.total || 0
  } catch (err: any) {
    console.error('fetchData error:', err)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  filterForm.keyword = ''
  pagination.page = 1
  fetchData()
}

const handlePageChange = () => {
  fetchData()
}

const handleSizeChange = () => {
  pagination.page = 1
  fetchData()
}

const handleRestore = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确认恢复用户「${row.nickname}」的账号吗？恢复后用户可正常登录使用。`,
      '恢复确认',
      { confirmButtonText: '确认恢复', cancelButtonText: '取消', type: 'warning' },
    )
    await adminUsers.restoreUser(row.id)
    ElMessage.success('账号已恢复')
    fetchData()
  } catch {
    // 用户取消
  }
}

const handlePermanentDelete = async (row: any) => {
  await adminUsers.permanentDeleteUser(row.id)
  ElMessage.success('已彻底删除')
  fetchData()
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.deactivated-users {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-bar {
  margin-bottom: 16px;
}

.filter-form {
  margin-bottom: 0;
}

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
