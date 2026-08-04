<template>
  <div class="operation-tag-list">
    <div class="page-header">
      <h2 class="page-title">运营标签管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        添加标签
      </el-button>
    </div>

    <div class="card">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
        <template #title>
          在此管理运营标签库。标签可用于用户列表筛选和用户详情页快速标记。
        </template>
      </el-alert>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="标签名称" min-width="140">
          <template #default="{ row }">
            <el-tag :color="row.color" effect="dark" size="small" :style="{ borderColor: row.color }">
              {{ row.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="color" label="颜色" width="100" align="center">
          <template #default="{ row }">
            <div class="color-dot" :style="{ background: row.color }" />
            <span style="font-size:12px;color:#909399">{{ row.color }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="isEnabled" label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.isEnabled === 1"
              size="small"
              @change="toggleEnable(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" align="center">
          <template #default="{ row }">
            <span>{{ row.sortOrder }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 编辑/添加弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑标签' : '添加标签'"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="标签名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入标签名称" maxlength="20" />
        </el-form-item>
        <el-form-item label="标签颜色" prop="color">
          <div class="color-picker-row">
            <el-color-picker v-model="form.color" />
            <el-input v-model="form.color" placeholder="#409EFF" style="width: 120px; margin-left: 8px" maxlength="10" />
            <span class="color-preview">
              预览：<el-tag :color="form.color" effect="dark" size="small" :style="{ borderColor: form.color }">
                {{ form.name || '标签名' }}
              </el-tag>
            </span>
          </div>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { operationTagApi, type OperationTag } from '../../api/operation-tag'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number>(0)
const formRef = ref()
const tableData = ref<OperationTag[]>([])

const form = reactive({
  name: '',
  color: '#409EFF',
  sortOrder: 0,
})

const rules = {
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }],
  color: [{ required: true, message: '请选择颜色', trigger: 'blur' }],
}

async function fetchData() {
  loading.value = true
  try {
    const res = await operationTagApi.list()
    if (res.success && res.data) {
      tableData.value = res.data
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function handleCreate() {
  isEdit.value = false
  editId.value = 0
  form.name = ''
  form.color = '#409EFF'
  form.sortOrder = (tableData.value.length || 0) * 10
  dialogVisible.value = true
}

function handleEdit(row: OperationTag) {
  isEdit.value = true
  editId.value = row.id
  form.name = row.name
  form.color = row.color
  form.sortOrder = row.sortOrder || 0
  dialogVisible.value = true
}

async function handleSave() {
  try {
    await formRef.value.validate()
  } catch {
    // 表单校验未通过，Element Plus 已自动高亮错误字段
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await operationTagApi.update(editId.value, { ...form })
      ElMessage.success('标签更新成功')
    } else {
      await operationTagApi.create({ ...form })
      ElMessage.success('标签创建成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function toggleEnable(row: OperationTag) {
  const newStatus = row.isEnabled === 1 ? 0 : 1
  try {
    await operationTagApi.update(row.id, { isEnabled: newStatus })
    row.isEnabled = newStatus
    ElMessage.success(newStatus ? '已启用' : '已禁用')
  } catch {
    // ignore
  }
}

async function handleDelete(row: OperationTag) {
  await ElMessageBox.confirm(`确定要删除标签「${row.name}」吗？`, '确认删除', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  })
  try {
    await operationTagApi.remove(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch {
    // cancelled or error
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.operation-tag-list {
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: #303133;
      margin: 0;
    }
  }

  .card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
  }

  .color-dot {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid #dcdfe6;
    vertical-align: middle;
    margin-right: 4px;
  }

  .color-picker-row {
    display: flex;
    align-items: center;

    .color-preview {
      margin-left: 12px;
      font-size: 12px;
      color: #909399;
    }
  }
}
</style>
