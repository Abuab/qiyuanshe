<template>
  <div class="activity-list">
    <div class="page-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>活动管理</el-breadcrumb-item>
        <el-breadcrumb-item>活动列表</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="card search-area">
      <el-form :model="filterForm" inline>
        <el-form-item label="标题搜索">
          <el-input v-model="filterForm.keyword" placeholder="请输入活动标题" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="类型筛选">
          <el-select v-model="filterForm.activityType" placeholder="全部类型" clearable style="width: 150px">
            <el-option label="全部" value="" />
            <el-option label="最新活动" value="latest" />
            <el-option label="线上互选" value="online" />
            <el-option label="一周CP" value="cp" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态筛选">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="全部" value="" />
            <el-option label="草稿" :value="0" />
            <el-option label="进行中" :value="1" />
            <el-option label="已结束" :value="2" />
            <el-option label="已取消" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
      <el-button v-if="!isReadonly" type="primary" class="add-btn" @click="handleAdd">
        <el-icon><Plus /></el-icon>添加活动
      </el-button>
    </div>

    <div class="card">
      <el-table v-loading="loading" :data="activityList" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="封面图" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.coverImage"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px"
              :preview-src-list="[row.coverImage]"
            >
              <template #error>
                <div style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 4px">
                  <el-icon :size="24"><Picture /></el-icon>
                </div>
              </template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.activityType)" size="small">
              {{ getTypeLabel(row.activityType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="报名截止" width="180">
          <template #default="{ row }">
            {{ row.signUpEndTime ? formatDate(row.signUpEndTime) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="活动时间" width="200">
          <template #default="{ row }">
            {{ formatDate(row.startTime) }} ~<br />
            {{ formatDate(row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="location" label="地点" width="150" show-overflow-tooltip />
        <el-table-column label="已报名/上限" width="120">
          <template #default="{ row }">
            {{ row.currentParticipants }} / {{ row.maxParticipants === 0 ? '不限' : row.maxParticipants }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column v-if="!isReadonly" label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-switch
              v-model="row.isActive"
              :active-value="1"
              :inactive-value="0"
              size="small"
              @change="(val: number) => handleToggleActive(row, val)"
            />
            <el-button type="warning" link size="small" @click="handleEnd(row)" :disabled="row.status !== 1">结束</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
            <el-button type="success" link size="small" @click="handleViewSignups(row)">报名</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="filterForm.page"
          v-model:page-size="filterForm.limit"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Picture } from '@element-plus/icons-vue'
import { useAdminStore } from '../../store/admin'
import { adminActivity } from '../../api'
import type { Activity } from '../../api/activity'

const router = useRouter()
const adminStore = useAdminStore()
const isReadonly = computed(() => adminStore.userInfo?.role === 'readonly')
const loading = ref(false)
const activityList = ref<Activity[]>([])
const total = ref(0)

const filterForm = reactive({
  keyword: '',
  activityType: '',
  status: '',
  page: 1,
  limit: 10,
})

function formatDate(date: string) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    latest: '最新活动',
    online: '线上互选',
    cp: '一周CP',
  }
  return map[type] || type
}

function getTypeTagType(type: string) {
  const map: Record<string, string> = {
    latest: 'danger',
    online: 'primary',
    cp: 'warning',
  }
  return map[type] || ''
}

function getStatusLabel(status: number) {
  const map: Record<number, string> = {
    0: '草稿',
    1: '进行中',
    2: '已结束',
    3: '已取消',
  }
  return map[status] || '未知'
}

function getStatusTagType(status: number) {
  const map: Record<number, string> = {
    0: 'warning',
    1: 'success',
    2: 'info',
    3: 'danger',
  }
  return map[status] || ''
}

async function fetchData() {
  loading.value = true
  try {
    const params: any = {
      page: filterForm.page,
      limit: filterForm.limit,
    }
    if (filterForm.keyword) params.keyword = filterForm.keyword
    if (filterForm.activityType) params.activityType = filterForm.activityType
    if (filterForm.status !== '') params.status = filterForm.status

    const res = await adminActivity.list(params)
    if (res.success && res.data) {
      activityList.value = res.data.list
      total.value = res.data.total
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取活动列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  filterForm.page = 1
  fetchData()
}

function handleReset() {
  filterForm.keyword = ''
  filterForm.activityType = ''
  filterForm.status = ''
  filterForm.page = 1
  fetchData()
}

function handleSizeChange() {
  filterForm.page = 1
  fetchData()
}

function handleCurrentChange() {
  fetchData()
}

function handleAdd() {
  router.push('/activity/edit')
}

function handleEdit(row: Activity) {
  router.push(`/activity/edit/${row.id}`)
}

async function handleToggleActive(row: Activity, val: number) {
  const previousStatus = row.status
  const previousIsActive = row.isActive
  try {
    const newStatus = val === 1 ? 1 : 3
    const res = await adminActivity.updateStatus(row.id, newStatus)
    if (res.success) {
      row.status = newStatus
      row.isActive = val
      ElMessage.success(val === 1 ? '上架成功' : '下架成功')
    } else {
      row.status = previousStatus
      row.isActive = previousIsActive
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error: any) {
    console.error(error)
    row.status = previousStatus
    row.isActive = previousIsActive
    ElMessage.error(error.message || '操作失败')
  }
}

async function handleEnd(row: Activity) {
  try {
    await ElMessageBox.confirm('确定要结束该活动吗？', '确认结束', { type: 'warning' })
    const res = await adminActivity.updateStatus(row.id, 2)
    if (res.success) {
      ElMessage.success('活动已结束')
      fetchData()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error(error)
      ElMessage.error(error.message || '操作失败')
    }
  }
}

async function handleDelete(row: Activity) {
  try {
    await ElMessageBox.confirm('确定要删除该活动吗？此操作不可恢复！', '确认删除', { type: 'warning' })
    const res = await adminActivity.delete(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      fetchData()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error(error)
      ElMessage.error(error.message || '删除失败')
    }
  }
}

function handleViewSignups(row: Activity) {
  router.push(`/activity/signups/${row.id}`)
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.activity-list {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.search-area {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  .add-btn {
    background-color: #409EFF;
    border-color: #409EFF;
    color: #fff;

    &:hover {
      background-color: #66B1FF;
      border-color: #66B1FF;
    }
  }
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
