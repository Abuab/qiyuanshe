<template>
  <div class="notice-page">
    <div class="page-header">
      <h2 class="page-title">公告管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>新增公告
      </el-button>
    </div>

    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'popup'" type="danger">弹窗</el-tag>
            <el-tag v-else type="primary">列表</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              active-color="#13ce66"
              @change="(val: boolean) => handleToggleStatus(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑公告' : '新增公告'"
      width="600px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入公告标题" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            placeholder="请输入公告内容"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="展示类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="list">列表公告</el-radio>
            <el-radio value="popup">弹窗公告</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { noticeApi } from '../../api/notice'
import type { Notice } from '../../api/notice'
import type { FormInstance, FormRules } from 'element-plus'

const loading = ref(false)
const tableData = ref<Notice[]>([])
const pagination = reactive({ page: 1, limit: 20, total: 0 })

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(0)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  title: '',
  content: '',
  type: 'list' as 'popup' | 'list',
  sortOrder: 0,
  status: 1,
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

onMounted(() => fetchData())

async function fetchData() {
  loading.value = true
  try {
    const res = await noticeApi.list({ page: pagination.page, limit: pagination.limit })
    if (res.success && res.data) {
      tableData.value = res.data.list
      pagination.total = res.data.total
    }
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

function handleCreate() {
  isEdit.value = false
  editId.value = 0
  form.title = ''
  form.content = ''
  form.type = 'list'
  form.sortOrder = 0
  form.status = 1
  dialogVisible.value = true
}

function handleEdit(row: Notice) {
  isEdit.value = true
  editId.value = row.id
  form.title = row.title
  form.content = row.content
  form.type = row.type
  form.sortOrder = row.sortOrder
  form.status = row.status
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitLoading.value = true
  try {
    const data = {
      title: form.title,
      content: form.content,
      type: form.type,
      sortOrder: form.sortOrder,
      status: form.status,
    }
    if (isEdit.value) {
      await noticeApi.update(editId.value, data)
      ElMessage.success('更新成功')
    } else {
      await noticeApi.create(data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: Notice) {
  try {
    await ElMessageBox.confirm(`确定删除公告「${row.title}」？`, '确认删除', { type: 'warning' })
    await noticeApi.remove(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

async function handleToggleStatus(row: Notice, val: boolean) {
  try {
    await noticeApi.update(row.id, { status: val ? 1 : 0 } as any)
    ElMessage.success(val ? '已启用' : '已禁用')
    row.status = val ? 1 : 0
  } catch {
    ElMessage.error('操作失败')
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<style lang="scss" scoped>
.notice-page { padding: 20px; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  .page-title { font-size: 20px; font-weight: bold; margin: 0; }
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
