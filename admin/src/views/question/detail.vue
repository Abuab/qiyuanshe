<template>
  <div class="question-detail" v-loading="loading">
    <div class="page-header">
      <el-button link @click="$router.push('/question/list')">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
      <el-button v-if="!isReadonly" type="primary" @click="$router.push(`/question/edit/${questionId}`)">
        <el-icon><Edit /></el-icon> 编辑问题
      </el-button>
    </div>

    <div v-if="question" class="detail-content">
      <!-- 问题基本信息 -->
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <h3>问题详情</h3>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="问题ID">{{ question.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag v-if="question.status === 1" type="success" size="small">启用</el-tag>
            <el-tag v-else type="info" size="small">禁用</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="问题标题" :span="2">
            <strong>{{ question.title }}</strong>
          </el-descriptions-item>
          <el-descriptions-item label="问题描述" :span="2">
            {{ question.content || '暂无描述' }}
          </el-descriptions-item>
          <el-descriptions-item label="排序">{{ question.sortOrder }}</el-descriptions-item>
          <el-descriptions-item label="回答数">
            <span class="answer-count">{{ question.answerCount || 0 }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(question.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(question.updatedAt) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 回答列表 -->
      <el-card class="answer-card">
        <template #header>
          <div class="card-header">
            <h3>回答列表（共 {{ answerTotal }} 条）</h3>
          </div>
        </template>
        <el-table :data="answers" v-loading="answersLoading" stripe>
          <el-table-column label="回答人" width="160">
            <template #default="{ row }">
              <div class="answer-user" @click="$router.push(`/user/detail/${row.userId}`)" style="cursor: pointer">
                <el-image :src="row.userAvatar" fit="cover" style="width: 32px; height: 32px; border-radius: 50%">
                  <template #error>
                    <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border-radius:50%">
                      <el-icon :size="16"><User /></el-icon>
                    </div>
                  </template>
                </el-image>
                <span class="answer-nickname">{{ row.userNickname }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="content" label="回答内容" min-width="250" show-overflow-tooltip />
          <el-table-column prop="createdAt" label="回答时间" width="170">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="likeCount" label="点赞数" width="90" align="center" />
          <el-table-column prop="status" label="审核状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getAnswerStatusType(row.status)" size="small">
                {{ getAnswerStatusName(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="!isReadonly" label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" link size="small" @click="handleDeleteAnswer(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper" v-if="answerTotal > answerLimit">
          <el-pagination
            v-model:current-page="answerPage"
            :page-size="answerLimit"
            :total="answerTotal"
            layout="total, prev, pager, next"
            @current-change="fetchAnswers"
          />
        </div>
      </el-card>
    </div>

    <el-empty v-else description="问题不存在" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Edit, User } from '@element-plus/icons-vue'
import { useAdminStore } from '../../store/admin'
import { adminQuestion } from '../../api'
import type { Question, Answer } from '../../api/question'

const route = useRoute()
const adminStore = useAdminStore()
const isReadonly = computed(() => adminStore.userInfo?.role === 'readonly')

const questionId = Number(route.params.id)
const loading = ref(false)
const question = ref<Question | null>(null)

const answersLoading = ref(false)
const answers = ref<Answer[]>([])
const answerPage = ref(1)
const answerLimit = ref(20)
const answerTotal = ref(0)

onMounted(() => {
  fetchDetail()
  fetchAnswers()
})

async function fetchDetail() {
  loading.value = true
  try {
    const res = await adminQuestion.detail(questionId)
    if (res.success && res.data) {
      question.value = res.data
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取问题详情失败')
  } finally {
    loading.value = false
  }
}

async function fetchAnswers() {
  answersLoading.value = true
  try {
    const res = await adminQuestion.getAnswers(questionId, answerPage.value, answerLimit.value)
    if (res.success && res.data) {
      answers.value = res.data.list || []
      answerTotal.value = res.data.total || 0
      // Update question answerCount if it changed
      if (question.value && answerTotal.value !== question.value.answerCount) {
        question.value.answerCount = answerTotal.value
      }
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取回答列表失败')
  } finally {
    answersLoading.value = false
  }
}

async function handleDeleteAnswer(row: Answer) {
  try {
    await ElMessageBox.confirm('确定要删除该回答吗？', '删除确认', { type: 'warning' })
    await adminQuestion.deleteAnswer(row.id)
    ElMessage.success('删除成功')
    // If this was the last item on current page and not page 1, go back a page
    if (answers.value.length === 1 && answerPage.value > 1) {
      answerPage.value--
    }
    fetchAnswers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

function formatDate(dateStr?: string) {
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
.question-detail {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.info-card {
  margin-bottom: 20px;
}

.answer-card {
  .card-header h3 { margin: 0; font-size: 16px; }
}

.answer-count {
  font-weight: bold;
  color: #409eff;
}

.answer-user {
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover .answer-nickname {
    color: #409eff;
  }
  .answer-nickname {
    font-size: 13px;
    color: #303133;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
