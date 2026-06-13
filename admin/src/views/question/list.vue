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
                <el-image :src="answer.userAvatar" fit="cover" style="width: 40px; height: 40px; border-radius: 50%" class="answer-avatar" @click="goUserDetail(answer.userId)">
                  <template #error>
                    <div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 50%">
                      <el-icon :size="20"><User /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div class="answer-content">
                  <div class="answer-header">
                    <span class="answer-nickname clickable" @click="goUserDetail(answer.userId)">{{ answer.userNickname }}</span>
                    <span class="answer-time">{{ formatDate(answer.createdAt) }}</span>
                  </div>
                  <div class="answer-text">{{ answer.content }}</div>
                </div>
                <div class="answer-actions">
                  <el-tag :type="getAnswerStatusType(answer.status)" size="small">
                    {{ getAnswerStatusName(answer.status) }}
                  </el-tag>
                  <el-button v-if="!isReadonly" type="danger" link size="small" @click="handleDeleteAnswer(row.id, answer.id)">
                    删除
                  </el-button>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无回答" />
          </template>
        </el-table-column>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="问题标题" min-width="200">
          <template #default="{ row }">
            <span class="question-title" @click="handleDetail(row)">{{ row.title }}</span>
          </template>
        </el-table-column>
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
            <span class="answer-count" @click="handleViewAnswers(row)">{{ row.answerCount || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="!isReadonly" label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleDetail(row)">详情</el-button>
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

    <el-dialog v-model="answersVisible" :title="'回答列表 - ' + (currentQuestionTitle || '')" width="700px">
      <div v-loading="answersLoading">
        <div v-if="currentAnswers.length === 0" style="text-align: center; padding: 40px; color: #999;">
          暂无回答
        </div>
        <div v-else class="answer-dialog-list">
          <div class="answer-dialog-item" v-for="answer in currentAnswers" :key="answer.id">
            <div class="answer-dialog-header">
              <el-image :src="answer.userAvatar" fit="cover" style="width: 32px; height: 32px; border-radius: 50%" class="clickable-image" @click="goUserDetail(answer.userId)">
                <template #error>
                  <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 50%">
                    <el-icon :size="16"><User /></el-icon>
                  </div>
                </template>
              </el-image>
              <div class="answer-dialog-meta">
                <span class="answer-dialog-nickname clickable-text" @click="goUserDetail(answer.userId)">{{ answer.userNickname }}</span>
                <span class="answer-dialog-time">{{ formatDate(answer.createdAt) }}</span>
              </div>
              <el-tag :type="getAnswerStatusType(answer.status)" size="small">
                {{ getAnswerStatusName(answer.status) }}
              </el-tag>
            </div>
            <div class="answer-dialog-content">{{ answer.content }}</div>
            <div class="answer-dialog-footer">
              <span>点赞 {{ answer.likeCount || 0 }}</span>
              <el-button v-if="!isReadonly" type="danger" link size="small" @click="handleDeleteAnswerInList(answer)">删除</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, User } from '@element-plus/icons-vue'
import { useAdminStore } from '../../store/admin'
import { adminQuestion } from '../../api'
import { formatDate } from '../../utils/date'
import type { Question, Answer } from '../../api/question'

const router = useRouter()
const adminStore = useAdminStore()
const isReadonly = computed(() => adminStore.userInfo?.role === 'readonly')

const loading = ref(false)
const tableData = ref<Question[]>([])
const expandedRows = ref<number[]>([])
const deleteDialogVisible = ref(false)
const currentQuestionId = ref<number | null>(null)

const answersVisible = ref(false)
const answersLoading = ref(false)
const currentAnswers = ref<Answer[]>([])
const currentQuestionTitle = ref('')
const currentQuestionIdForAnswers = ref<number | null>(null)

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

function handleDetail(row: Question) {
  router.push(`/question/detail/${row.id}`)
}

function goUserDetail(userId: number) {
  router.push(`/user/detail/${userId}`)
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

async function handleViewAnswers(row: Question) {
  currentQuestionIdForAnswers.value = row.id
  currentQuestionTitle.value = row.title
  answersVisible.value = true
  answersLoading.value = true
  try {
    const res = await adminQuestion.getAnswers(row.id)
    if (res.success && res.data) {
      currentAnswers.value = res.data.list || res.data || []
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取回答列表失败')
  } finally {
    answersLoading.value = false
  }
}

async function handleDeleteAnswerInList(answer: Answer) {
  try {
    await ElMessageBox.confirm('确定要删除该回答吗？', '删除确认', { type: 'warning' })
    await adminQuestion.deleteAnswer(answer.id)
    ElMessage.success('删除成功')
    if (currentQuestionIdForAnswers.value) {
      const res = await adminQuestion.getAnswers(currentQuestionIdForAnswers.value)
      if (res.success && res.data) {
        currentAnswers.value = res.data.list || res.data || []
      }
    }
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
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

.question-title {
  color: #409eff;
  cursor: pointer;
  &:hover { text-decoration: underline; }
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

.answer-count {
  font-weight: bold;
  color: #409eff;
  cursor: pointer;
  &:hover { text-decoration: underline; }
}

.answer-dialog-list {
  .answer-dialog-item {
    padding: 16px;
    border-bottom: 1px solid #ebeef5;
    &:last-child { border-bottom: none; }
  }
  .answer-dialog-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .answer-dialog-meta {
    flex: 1;
    .answer-dialog-nickname { font-weight: bold; color: #303133; margin-right: 12px; }
    .answer-dialog-time { font-size: 12px; color: #909399; }
  }
  .answer-dialog-content {
    margin-left: 42px;
    color: #606266;
    line-height: 1.6;
    padding: 8px 0;
  }
  .answer-dialog-footer {
    margin-left: 42px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: #909399;
  }
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
      cursor: pointer;
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

.clickable {
  cursor: pointer;
  &:hover { color: #409eff; }
}

.clickable-image {
  cursor: pointer;
  &:hover { opacity: 0.8; }
}

.clickable-text {
  cursor: pointer;
  &:hover { color: #409eff; text-decoration: underline; }
}
</style>
