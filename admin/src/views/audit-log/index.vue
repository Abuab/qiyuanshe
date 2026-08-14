<template>
  <div class="audit-log-page">
    <div class="page-header">
      <h2 class="page-title">操作审计日志</h2>
    </div>

    <div class="card">
      <!-- 筛选区 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm">
          <el-form-item label="操作模块">
            <el-select v-model="filterForm.module" placeholder="全部" clearable filterable style="width: 150px">
              <el-option label="登录认证" value="auth" />
              <el-option label="用户管理" value="users" />
              <el-option label="用户资料" value="user-profiles" />
              <el-option label="审核管理" value="audit" />
              <el-option label="单身承诺审核" value="single-promise/admin" />
              <el-option label="红娘管理" value="matchmakers" />
              <el-option label="红娘评价" value="matchmaker-comments" />
              <el-option label="聊天监控" value="chat" />
              <el-option label="举报管理" value="reports" />
              <el-option label="反馈管理" value="feedbacks" />
              <el-option label="问答管理" value="questions" />
              <el-option label="圈子管理" value="circles" />
              <el-option label="成功案例" value="success-cases" />
              <el-option label="活动管理" value="activities" />
              <el-option label="订单管理" value="payment" />
              <el-option label="VIP管理" value="vip-packages" />
              <el-option label="VIP配置" value="vip-config" />
              <el-option label="人格测试" value="personality" />
              <el-option label="引导文案" value="guide" />
              <el-option label="AI管理" value="ai" />
              <el-option label="AI快捷提问" value="quick-questions" />
              <el-option label="到店认证" value="store-cert" />
              <el-option label="系统配置" value="system" />
              <el-option label="协议日志存储" value="agreement-log-storage" />
              <el-option label="文件上传" value="upload" />
              <el-option label="MFA认证" value="mfa" />
              <el-option label="个人资料" value="profile" />
              <el-option label="子账号管理" value="admin-users" />
            </el-select>
          </el-form-item>
          <el-form-item label="操作类型">
            <el-select v-model="filterForm.action" placeholder="全部" clearable style="width: 130px">
              <el-option label="创建" value="创建" />
              <el-option label="更新" value="更新" />
              <el-option label="删除" value="删除" />
              <el-option label="查询" value="查询" />
            </el-select>
          </el-form-item>
          <el-form-item label="操作人">
            <el-input v-model="filterForm.adminUsername" placeholder="用户名" clearable style="width: 140px" @keyup.enter="handleSearch" />
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 260px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="adminUsername" label="操作人" width="120" />
        <el-table-column prop="module" label="操作模块" width="130" show-overflow-tooltip />
        <el-table-column prop="action" label="操作" min-width="100" />
        <el-table-column prop="method" label="方法" width="80">
          <template #default="{ row }">
            <el-tag
              :type="methodTagType(row.method)"
              size="small"
            >
              {{ row.method }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="操作详情" min-width="180" show-overflow-tooltip />
        <el-table-column prop="url" label="接口路径" min-width="220" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" min-width="140" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="操作时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap" v-if="total > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetchData"
          @size-change="handleSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminAuditLogApi } from '@/api/audit-log'
import { formatDate } from '@/utils/date'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const dateRange = ref<[string, string] | null>(null)

const filterForm = reactive({
  module: '',
  action: '',
  adminUsername: '',
})

const pagination = reactive({
  page: 1,
  limit: 20,
})

function methodTagType(method: string): '' | 'success' | 'danger' | 'warning' | 'info' {
  switch (method) {
    case 'POST': return 'success'
    case 'PUT': return 'warning'
    case 'DELETE': return 'danger'
    case 'GET': return 'info'
    default: return ''
  }
}

async function fetchData() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      limit: pagination.limit,
    }
    if (filterForm.module) params.module = filterForm.module
    if (filterForm.action) params.action = filterForm.action
    if (filterForm.adminUsername) params.adminUsername = filterForm.adminUsername
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const res: any = await adminAuditLogApi.list(params)
    tableData.value = res.list || []
    total.value = res.total || 0
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  filterForm.module = ''
  filterForm.action = ''
  filterForm.adminUsername = ''
  dateRange.value = null
  pagination.page = 1
  fetchData()
}

function handleSizeChange() {
  pagination.page = 1
  fetchData()
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.audit-log-page {
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .page-title {
    font-size: 22px;
    font-weight: bold;
    color: #333;
    margin: 0;
  }

  .card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  }

  .filter-bar {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  .pagination-wrap {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
