<template>
  <div class="question-edit">
    <div class="page-header">
      <el-button @click="handleBack" :icon="ArrowLeft">返回</el-button>
      <h2 class="page-title">{{ isEdit ? '编辑问题' : '添加问题' }}</h2>
    </div>

    <div class="card">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        class="question-form"
      >
        <el-form-item label="问题标题" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="请输入问题标题"
            style="width: 400px"
          />
        </el-form-item>

        <el-form-item label="问题描述" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="5"
            placeholder="请输入问题描述"
            style="width: 600px"
          />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-switch
            v-model="formData.status"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>

        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" />
          <span class="sort-tip">数字越小越靠前</span>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            保存
          </el-button>
          <el-button @click="handleBack">返回</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { adminQuestion } from '../../api'
import type { FormInstance, FormRules } from 'element-plus'

interface QuestionFormData {
  title: string
  content: string
  status: number
  sortOrder: number
}

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const isEdit = computed(() => !!route.params.id)

const defaultFormData: QuestionFormData = {
  title: '',
  content: '',
  status: 1,
  sortOrder: 0,
}

const formData = reactive<QuestionFormData>({ ...defaultFormData })

const formRules: FormRules = {
  title: [{ required: true, message: '请输入问题标题', trigger: 'blur' }],
}

onMounted(() => {
  if (isEdit.value) {
    fetchData()
  }
})

async function fetchData() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    const res = await adminQuestion.detail(id)
    if (res.success && res.data) {
      Object.assign(formData, res.data)
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取问题信息失败')
  } finally {
    loading.value = false
  }
}

function handleBack() {
  router.back()
}

async function handleSubmit() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    if (isEdit.value) {
      const res = await adminQuestion.update(Number(route.params.id), formData)
      if (res.success) {
        ElMessage.success('更新成功')
        // 如果有返回数据，直接更新formData
        if (res.data) {
          Object.assign(formData, res.data)
        } else {
          // 否则重新获取数据确保状态同步
          await fetchData()
        }
        // 保存成功后返回列表页
        router.push('/question/list')
      } else {
        ElMessage.error(res.message || '更新失败')
      }
    } else {
      const res = await adminQuestion.create(formData)
      if (res.success) {
        ElMessage.success('添加成功')
        router.push('/question/list')
      } else {
        ElMessage.error(res.message || '添加失败')
      }
    }
  } catch (error) {
    console.error(error)
    ElMessage.error(isEdit.value ? '更新失败' : '添加失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.question-edit {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
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

.question-form {
  max-width: 700px;
}

.sort-tip {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}
</style>
