<template>
  <div class="question-list">
    <div class="page-header">
      <h2 class="page-title">问答列表</h2>
      <div class="header-actions">
        <el-button v-if="!isReadonly" type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          添加问题
        </el-button>
      </div>
    </div>

    <div class="card">
      <el-table
        ref="tableRef"
        :data="tableData"
        v-loading="loading"
        row-key="id"
        :expand-row-keys="expandedRows"
        @expand-change="handleExpandChange"
      >
        <el-table-column type="expand" width="50">
          <template #default="{ row }">
            <div class="answer-list" v-if="row.answers && row.answers.length > 0">
              <div class="answer-item" v-for="answer in row.answers" :key="answer.id">
                <el-avatar :size="40" :src="answer.userAvatar" class="answer-avatar" />
                <div class="answer-content">
                  <div class="answer-header">
                    <span class="answer-nickname">{{ answer.userNickname }}</span>
                    <span class="answer-time">{{ formatDate(answer.createdAt) }}</span>
                  </div>
                  <div class="answer-text">{{ answer.content }}</div>
                </div>
                <div class="answer-actions">
                  <el-tag :type="getAnswerStatusType(answer.status)" size="small">
                    {{ getAnswerStatusName(answer.status) }}
                  </el-tag>
                  <el-button type="danger" link size="small" @click="handleDeleteAnswer(row.id, answer.id)">
                    删除
                  </el-button>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无回答" />
          </template>
        </el-table-column>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="问题标题" min-width="200" />
        <el-table-column prop="content" label="内容摘要" min-width="200">
          <template #default="{ row }">
            <span class="content-preview">{{ row.content }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success" size="small">启用</el-tag>
            <el-tag v-else type="info" size="small">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="100" sortable />
        <el-table-column prop="answerCount" label="回答数" width="100">
          <template #default="{ row }">
            <span class="answer-count">{{ row.answerCount || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="!isReadonly" label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="deleteDialogVisible" title="删除确认" width="400px">
      <p>确定要删除该问题吗？此操作不可逆。</p>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useAdminStore } from '../../store/admin'
import { adminQuestion } from '../../api'
import type { Question, Answer } from '../../api/question'

const router = useRouter()
const adminStore = useAdminStore()
const isReadonly = computed(() => adminStore.userInfo?.role === 'readonly')

const loading = ref(false)
const tableData = ref<Question[]>([])
const expandedRows = ref<number[]>([])
const deleteDialogVisible = ref(false)
const currentQuestionId = ref<number | null>(null)

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const res = await adminQuestion.list({ page: 1, limit: 100 })
    if (res.success && res.data) {
      tableData.value = res.data.list || []
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取问答列表失败')
  } finally {
    loading.value = false
  }
}

function handleCreate() {
  router.push('/question/edit')
}

function handleEdit(row: Question) {
  router.push(`/question/edit/${row.id}`)
}

function handleDelete(row: Question) {
  currentQuestionId.value = row.id
  deleteDialogVisible.value = true
}

async function confirmDelete() {
  if (!currentQuestionId.value) return

  try {
    await adminQuestion.delete(currentQuestionId.value)
    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error(error)
    ElMessage.error('删除失败')
  }
}

async function handleDeleteAnswer(questionId: number, answerId: number) {
  try {
    await ElMessageBox.confirm('确定要删除该回答吗？', '删除确认', { type: 'warning' })
    await adminQuestion.deleteAnswer(answerId)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

async function handleExpandChange(row: Question, expanded: boolean) {
  if (expanded && (!row.answers || row.answers.length === 0)) {
    try {
      const res = await adminQuestion.getAnswers(row.id)
      if (res.success && res.data) {
        row.answers = res.data.list || []
      }
    } catch (error) {
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

function getAnswerStatusName(status: number) {
  const map: Record<number, string> = {
    0: '待审核',
    1: '已通过',
    2: '已拒绝',
  }
  return map[status] || '未知'
}

function getAnswerStatusType(status: number) {
  const map: Record<number, string> = {
    0: 'warning',
    1: 'success',
    2: 'danger',
  }
  return map[status] || 'info'
}
</script>

<style lang="scss" scoped>
.question-list {
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

.content-preview {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #666;
}

.answer-count {
  font-weight: bold;
  color: #409eff;
}

.answer-list {
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin: 10px 0;

  .answer-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #ebeef5;

    &:last-child {
      border-bottom: none;
    }

    .answer-avatar {
      flex-shrink: 0;
    }

    .answer-content {
      flex: 1;
      min-width: 0;

      .answer-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 4px;

        .answer-nickname {
          font-weight: bold;
          color: #303133;
        }

        .answer-time {
          font-size: 12px;
          color: #909399;
        }
      }

      .answer-text {
        color: #606266;
        line-height: 1.5;
      }
    }

    .answer-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
  }
}
</style>
