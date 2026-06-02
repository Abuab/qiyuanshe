<template>
  <div class="activity-signups">
    <div class="page-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>活动管理</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/activity/list' }">活动列表</el-breadcrumb-item>
        <el-breadcrumb-item>报名管理</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="stats-cards">
      <el-card class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总报名数</div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-value">{{ stats.pending }}</div>
        <div class="stat-label">待确认</div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-value">{{ stats.confirmed }}</div>
        <div class="stat-label">已确认</div>
      </el-card>
    </div>

    <div class="card">
      <el-table v-loading="loading" :data="signupList" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :size="40" :src="row.userAvatar">
              <el-icon><User /></el-icon>
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column prop="realName" label="真实姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="报名时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 0"
              type="success"
              link
              size="small"
              @click="handleConfirm(row)"
            >
              确认
            </el-button>
            <el-button
              v-if="row.status !== 2"
              type="danger"
              link
              size="small"
              @click="handleCancel(row)"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="limit"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import { adminActivity } from '../../api'
import type { ActivitySignup } from '../../api/activity'

const route = useRoute()
const activityId = Number(route.params.id)

const loading = ref(false)
const signupList = ref<ActivitySignup[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const stats = ref({ total: 0, pending: 0, confirmed: 0 })

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

function getStatusLabel(status: number) {
  const map: Record<number, string> = {
    0: '待确认',
    1: '已确认',
    2: '已取消',
  }
  return map[status] || '未知'
}

function getStatusTagType(status: number) {
  const map: Record<number, string> = {
    0: 'warning',
    1: 'success',
    2: 'info',
  }
  return map[status] || ''
}

async function fetchData() {
  loading.value = true
  try {
    const res = await adminActivity.getSignups(activityId, {
      page: page.value,
      limit: limit.value,
    })
    if (res.success && res.data) {
      signupList.value = res.data.list
      total.value = res.data.total
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取报名列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const res = await adminActivity.getSignupStats(activityId)
    if (res.success && res.data) {
      stats.value = res.data
    }
  } catch (error) {
    console.error(error)
  }
}

async function handleConfirm(row: ActivitySignup) {
  try {
    const res = await adminActivity.confirmSignup(row.id)
    if (res.success) {
      ElMessage.success('确认成功')
      fetchData()
      fetchStats()
    } else {
      ElMessage.error(res.message || '确认失败')
    }
  } catch (error: any) {
    console.error(error)
    ElMessage.error(error.message || '确认失败')
  }
}

async function handleCancel(row: ActivitySignup) {
  try {
    const res = await adminActivity.cancelSignup(row.id)
    if (res.success) {
      ElMessage.success('取消成功')
      fetchData()
      fetchStats()
    } else {
      ElMessage.error(res.message || '取消失败')
    }
  } catch (error: any) {
    console.error(error)
    ElMessage.error(error.message || '取消失败')
  }
}

function handleSizeChange() {
  page.value = 1
  fetchData()
}

function handleCurrentChange() {
  fetchData()
}

onMounted(() => {
  fetchData()
  fetchStats()
})
</script>

<style lang="scss" scoped>
.activity-signups {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.stats-cards {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  text-align: center;

  .stat-value {
    font-size: 32px;
    font-weight: bold;
    color: #FF6B9D;
    margin-bottom: 8px;
  }

  .stat-label {
    font-size: 14px;
    color: #606266;
  }
}

.card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
