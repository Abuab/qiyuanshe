<template>
  <div class="user-list">
    <div class="page-header">
      <h2 class="page-title">用户列表</h2>
      <div class="header-actions">
        <el-button type="success" @click="handleExport" :loading="exportLoading">
          <el-icon><Download /></el-icon>
          导出Excel
        </el-button>
      </div>
    </div>

    <div class="card">
      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm" class="filter-form">
          <el-form-item label="关键词">
            <el-input
              v-model="filterForm.keyword"
              placeholder="昵称/ID/手机号"
              clearable
              :prefix-icon="Search"
              style="width: 180px"
            />
          </el-form-item>
          <el-form-item label="性别">
            <el-select v-model="filterForm.gender" placeholder="全部" clearable style="width: 100px">
              <el-option label="全部" :value="undefined" />
              <el-option label="男" :value="1" />
              <el-option label="女" :value="2" />
            </el-select>
          </el-form-item>
          <el-form-item label="会员等级">
            <el-select v-model="filterForm.vipLevel" placeholder="全部" clearable style="width: 120px">
              <el-option label="全部" :value="undefined" />
              <el-option label="普通" :value="0" />
              <el-option label="黄金" :value="1" />
              <el-option label="钻石" :value="2" />
              <el-option label="至尊" :value="3" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 120px">
              <el-option label="全部" :value="undefined" />
              <el-option label="正常" :value="1" />
              <el-option label="禁用" :value="0" />
              <el-option label="待审核" :value="2" />
            </el-select>
          </el-form-item>
          <el-form-item label="注册时间">
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
            <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="batch-actions" v-if="selectedRows.length > 0">
        <el-checkbox v-model="selectAll" @change="handleSelectAll">全选</el-checkbox>
        <span class="selected-count">已选择 {{ selectedRows.length }} 项</span>
        <el-button type="warning" size="small" @click="handleBatchDisable">批量禁用</el-button>
        <el-button type="success" size="small" @click="handleBatchEnable">批量启用</el-button>
      </div>

      <el-table
        ref="tableRef"
        :data="tableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        row-key="id"
        stripe
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" sortable="custom" />
        <el-table-column prop="avatar" label="头像" width="80">
          <template #default="{ row }">
            <el-popover placement="right" :width="200" trigger="hover">
              <template #reference>
                <el-avatar :size="40" :src="row.avatar || defaultAvatar" />
              </template>
              <div class="avatar-preview">
                <el-avatar :size="120" :src="row.avatar || defaultAvatar" />
                <p>{{ row.nickname }}</p>
              </div>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" min-width="120" sortable="custom">
          <template #default="{ row }">
            <span class="nickname">{{ row.nickname }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="gender" label="性别" width="80" sortable="custom">
          <template #default="{ row }">
            <el-tag v-if="row.gender === 1" type="primary" size="small">男</el-tag>
            <el-tag v-else-if="row.gender === 2" type="danger" size="small">女</el-tag>
            <span v-else class="text-info">未知</span>
          </template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="80" sortable="custom">
          <template #default="{ row }">
            {{ row.age || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="120">
          <template #default="{ row }">
            {{ row.phone || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="vipLevel" label="会员等级" width="100" sortable="custom">
          <template #default="{ row }">
            <el-tag v-if="row.vipLevel === 0 || !row.isVip" type="info" size="small">普通</el-tag>
            <el-tag v-else-if="row.vipLevel === 1" type="warning" size="small">黄金</el-tag>
            <el-tag v-else-if="row.vipLevel === 2" type="primary" size="small">钻石</el-tag>
            <el-tag v-else-if="row.vipLevel === 3" effect="dark" size="small">至尊</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="160" sortable="custom">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" sortable="custom">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success" size="small">正常</el-tag>
            <el-tag v-else-if="row.status === 2" type="warning" size="small">待审核</el-tag>
            <el-tag v-else type="danger" size="small">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">详情</el-button>
            <el-button
              type="warning"
              link
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button type="success" link @click="handleSetVip(row)">设为VIP</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <el-dialog v-model="vipDialogVisible" title="调整VIP等级" width="400px">
      <el-form :model="vipForm" label-width="100px">
        <el-form-item label="用户">
          <span>{{ currentUser?.nickname }}</span>
        </el-form-item>
        <el-form-item label="VIP等级" required>
          <el-select v-model="vipForm.level" style="width: 200px">
            <el-option label="普通用户" :value="0" />
            <el-option label="黄金会员" :value="1" />
            <el-option label="钻石会员" :value="2" />
            <el-option label="至尊VIP" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="有效期">
          <el-input-number v-model="vipForm.days" :min="1" :max="3650" />
          <span class="ml-10">天</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vipDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleVipSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="notifyDialogVisible" title="发送通知" width="500px">
      <el-form :model="notifyForm" label-width="80px">
        <el-form-item label="用户">
          <span>{{ currentUser?.nickname }}</span>
        </el-form-item>
        <el-form-item label="通知内容" required>
          <el-input
            v-model="notifyForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入通知内容..."
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="notifyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleNotifySubmit">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Download } from '@element-plus/icons-vue'
import { adminUsers } from '../../api'
import type { User, UserFilter } from '../../api/user'

const router = useRouter()
const loading = ref(false)
const exportLoading = ref(false)
const tableData = ref<User[]>([])
const selectedRows = ref<User[]>([])
const tableRef = ref()
const defaultAvatar = '/static/default-avatar.png'

const filterForm = reactive<UserFilter>({
  keyword: '',
  gender: undefined,
  vipLevel: undefined,
  status: undefined,
  startDate: undefined,
  endDate: undefined,
  sort: 'createdAt',
  order: 'desc',
})

const dateRange = ref<string[]>([])
const selectAll = ref(false)

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

const vipDialogVisible = ref(false)
const notifyDialogVisible = ref(false)
const currentUser = ref<User | null>(null)

const vipForm = reactive({
  level: 0,
  days: 30,
})

const notifyForm = reactive({
  content: '',
})

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const params: UserFilter = {
      page: pagination.page,
      limit: pagination.limit,
      ...filterForm,
    }

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const res = await adminUsers.list(params)
    if (res.success && res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('Fetch data error:', error)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  Object.assign(filterForm, {
    keyword: '',
    gender: undefined,
    vipLevel: undefined,
    status: undefined,
  })
  dateRange.value = []
  pagination.page = 1
  fetchData()
}

function handleSizeChange() {
  pagination.page = 1
  fetchData()
}

function handleCurrentChange() {
  fetchData()
}

function handleSelectionChange(rows: User[]) {
  selectedRows.value = rows
  selectAll.value = rows.length === tableData.value.length
}

function handleSelectAll(val: boolean) {
  if (val) {
    tableData.value.forEach((row) => {
      tableRef.value?.toggleRowSelection(row, true)
    })
  } else {
    tableRef.value?.clearSelection()
  }
}

function handleSortChange({ prop, order }: { prop: string; order: string }) {
  filterForm.sort = prop
  filterForm.order = order === 'ascending' ? 'asc' : 'desc'
  fetchData()
}

function handleView(row: User) {
  router.push(`/user/detail/${row.id}`)
}

async function handleToggleStatus(row: User) {
  const action = row.status === 1 ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}用户 ${row.nickname} 吗？`,
      `确认${action}`,
      { type: 'warning' }
    )
    await adminUsers.update(row.id, { status: row.status === 1 ? 0 : 1 } as any)
    ElMessage.success(`${action}成功`)
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

function handleSetVip(row: User) {
  currentUser.value = row
  vipForm.level = row.vipLevel || 0
  vipForm.days = 30
  vipDialogVisible.value = true
}

async function handleVipSubmit() {
  if (!currentUser.value) return
  try {
    await adminUsers.updateVip(currentUser.value.id, {
      level: vipForm.level,
      days: vipForm.days,
    } as any)
    ElMessage.success('VIP设置成功')
    vipDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error(error)
  }
}

function handleSendNotify(row: User) {
  currentUser.value = row
  notifyForm.content = ''
  notifyDialogVisible.value = true
}

async function handleNotifySubmit() {
  if (!notifyForm.content.trim()) {
    ElMessage.warning('请输入通知内容')
    return
  }
  ElMessage.success('通知已发送')
  notifyDialogVisible.value = false
}

async function handleBatchDisable() {
  if (selectedRows.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要禁用选中的 ${selectedRows.value.length} 个用户吗？`,
      '批量禁用',
      { type: 'warning' }
    )
    const ids = selectedRows.value.map((r) => r.id)
    await adminUsers.batchUpdateStatus(ids, 0)
    ElMessage.success('批量禁用成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

async function handleBatchEnable() {
  if (selectedRows.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要启用选中的 ${selectedRows.value.length} 个用户吗？`,
      '批量启用',
      { type: 'warning' }
    )
    const ids = selectedRows.value.map((r) => r.id)
    await adminUsers.batchUpdateStatus(ids, 1)
    ElMessage.success('批量启用成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

async function handleExport() {
  exportLoading.value = true
  try {
    const params = { ...filterForm }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    await adminUsers.export(params)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
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
</script>

<style lang="scss" scoped>
.user-list {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  margin-bottom: 20px;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;

  .selected-count {
    color: #666;
    font-size: 14px;
  }
}

.nickname {
  font-weight: 500;
}

.text-info {
  color: #909399;
}

.avatar-preview {
  text-align: center;

  p {
    margin-top: 8px;
    font-weight: 500;
  }
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.ml-10 {
  margin-left: 10px;
}
</style>
