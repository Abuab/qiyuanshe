<template>
  <div class="feedback-list">
    <div class="page-header">
      <h2 class="page-title">问题反馈</h2>
    </div>

    <div class="card">
      <!-- 筛选区 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm">
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 140px" @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option label="未处理" :value="0" />
              <el-option label="已处理" :value="1" />
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
        <el-table-column prop="userId" label="用户ID" width="100" />
        <el-table-column prop="content" label="反馈内容" min-width="240">
          <template #default="{ row }">
            <span class="text-ellipsis">{{ truncateText(row.content, 30) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="hasImages" label="图片" width="80">
          <template #default="{ row }">
            <el-tag :type="row.images?.length > 0 ? 'success' : 'info'" size="small">
              {{ row.images?.length > 0 ? `${row.images.length}张` : '无' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'warning' : 'success'" size="small">
              {{ row.status === 0 ? '未处理' : '已处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看详情</el-button>
            <el-button
              v-if="row.status === 0"
              type="success"
              link
              @click="handleProcess(row)"
            >标记已处理</el-button>
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

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="反馈详情" width="600px">
      <template v-if="currentDetail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="反馈ID">{{ currentDetail.id }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ currentDetail.userId }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatDate(currentDetail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentDetail.status === 0 ? 'warning' : 'success'" size="small">
              {{ currentDetail.status === 0 ? '未处理' : '已处理' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="反馈内容">
            <div class="feedback-full-content">{{ currentDetail.content }}</div>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.images?.length > 0" label="截图">
            <div class="detail-images">
              <el-image
                v-for="(url, idx) in currentDetail.images"
                :key="idx"
                :src="url"
                fit="cover"
                :preview-src-list="currentDetail.images"
                :initial-index="idx"
                style="width: 120px; height: 120px; margin-right: 8px; margin-bottom: 8px; border-radius: 6px;"
              />
            </div>
          </el-descriptions-item>
        </el-descriptions>
        <div v-if="currentDetail.status === 0" class="detail-actions">
          <el-button type="success" @click="handleProcessFromDetail">标记为已处理</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminFeedback, type FeedbackItem } from '../../api/feedback'

const loading = ref(false)
const tableData = ref<FeedbackItem[]>([])
const detailVisible = ref(false)
const currentDetail = ref<FeedbackItem | null>(null)

const filterForm = reactive({
  status: '' as string | number,
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

const fetchList = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      limit: pagination.limit,
    }
    if (filterForm.status !== '') {
      params.status = filterForm.status
    }
    const res: any = await adminFeedback.list(params)
    tableData.value = res.data?.list || []
    pagination.total = res.data?.total || 0
  } catch {
    // error handled by interceptor
  } finally {
    loading.value = false
  }
}

const truncateText = (text: string, maxLen: number) => {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const handleSearch = () => {
  pagination.page = 1
  fetchList()
}

const handleReset = () => {
  filterForm.status = ''
  pagination.page = 1
  fetchList()
}

const handleSizeChange = () => {
  pagination.page = 1
  fetchList()
}

const handlePageChange = () => {
  fetchList()
}

const handleView = async (row: FeedbackItem) => {
  try {
    const res: any = await adminFeedback.detail(row.id)
    currentDetail.value = res.data
    detailVisible.value = true
  } catch {
    // error handled by interceptor
  }
}

const handleProcess = async (row: FeedbackItem) => {
  try {
    await ElMessageBox.confirm('确认将此反馈标记为已处理？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })
    await adminFeedback.process(row.id)
    ElMessage.success('已标记为已处理')
    fetchList()
  } catch {
    // user cancelled or error
  }
}

const handleProcessFromDetail = async () => {
  if (!currentDetail.value) return
  try {
    await ElMessageBox.confirm('确认将此反馈标记为已处理？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })
    await adminFeedback.process(currentDetail.value.id)
    ElMessage.success('已标记为已处理')
    currentDetail.value!.status = 1
    fetchList()
  } catch {
    // user cancelled or error
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.feedback-list {
  .page-header {
    margin-bottom: 20px;
  }

  .page-title {
    font-size: 22px;
    font-weight: 600;
    color: #303133;
    margin: 0;
  }

  .card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
  }

  .filter-bar {
    margin-bottom: 20px;
  }

  .text-ellipsis {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .feedback-full-content {
    white-space: pre-wrap;
    line-height: 1.7;
    color: #333;
  }

  .detail-images {
    display: flex;
    flex-wrap: wrap;
  }

  .detail-actions {
    margin-top: 20px;
    text-align: right;
  }
}
</style>
