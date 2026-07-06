<template>
  <div class="dimension-page">
    <div class="page-header">
      <h2 class="page-title">维度管理</h2>
      <el-button type="primary" @click="openCreate">新增维度</el-button>
    </div>

    <el-card class="table-card" shadow="never">
      <el-table :data="list" v-loading="loading" stripe style="width:100%">
        <el-table-column prop="sort" label="排序" width="70" align="center" />
        <el-table-column prop="name" label="维度名称" min-width="120">
          <template #default="{ row }">
            <el-icon v-if="row.icon" style="margin-right:4px"><Histogram /></el-icon>
            {{ row.name }}
            <el-tag size="small" type="info" style="margin-left:6px">{{ row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="方向A" min-width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.directionAKey }}</el-tag> {{ row.directionALabel }}
          </template>
        </el-table-column>
        <el-table-column label="方向B" min-width="120">
          <template #default="{ row }">
            <el-tag size="small" type="warning">{{ row.directionBKey }}</el-tag> {{ row.directionBLabel }}
          </template>
        </el-table-column>
        <el-table-column prop="icon" label="图标标识" width="120" />
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch :model-value="row.isEnabled === 1" size="small" @change="toggleEnabled(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-popconfirm title="确认删除该维度？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      :title="editForm.id ? '编辑维度' : '新增维度'"
      v-model="editVisible"
      width="520px"
      destroy-on-close
    >
      <el-form :model="editForm" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="维度编码" prop="code">
          <el-input v-model="editForm.code" placeholder="如 energy / info / decision / lifestyle" :disabled="!!editForm.id" />
        </el-form-item>
        <el-form-item label="维度名称" prop="name">
          <el-input v-model="editForm.name" placeholder="如 能量来源" maxlength="30" />
        </el-form-item>
        <el-divider content-position="left">方向A</el-divider>
        <el-form-item label="方向A标识" prop="directionAKey">
          <el-input v-model="editForm.directionAKey" placeholder="如 E" maxlength="20" />
        </el-form-item>
        <el-form-item label="方向A标签" prop="directionALabel">
          <el-input v-model="editForm.directionALabel" placeholder="如 外向型" maxlength="30" />
        </el-form-item>
        <el-divider content-position="left">方向B</el-divider>
        <el-form-item label="方向B标识" prop="directionBKey">
          <el-input v-model="editForm.directionBKey" placeholder="如 I" maxlength="20" />
        </el-form-item>
        <el-form-item label="方向B标签" prop="directionBLabel">
          <el-input v-model="editForm.directionBLabel" placeholder="如 内向型" maxlength="30" />
        </el-form-item>
        <el-divider />
        <el-form-item label="图标标识">
          <el-input v-model="editForm.icon" placeholder="图标名或URL（可选）" maxlength="100" />
        </el-form-item>
        <el-form-item label="排序权重" prop="sort">
          <el-input-number v-model="editForm.sort" :min="1" :max="999" controls-position="right" />
          <span class="tip">数字越小越靠前</span>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch :model-value="editForm.isEnabled === 1" @change="(v: boolean) => editForm.isEnabled = v ? 1 : 0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Histogram } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { personalityDimensionApi, type PersonalityDimensionItem } from '../../api/personality'

const list = ref<PersonalityDimensionItem[]>([])
const loading = ref(false)

const loadList = async () => {
  loading.value = true
  try {
    const res = await personalityDimensionApi.list()
    if (res.success && res.data) list.value = res.data
  } catch { /* ignore */ }
  finally { loading.value = false }
}

const editVisible = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const editForm = reactive({
  id: 0,
  code: '',
  name: '',
  directionAKey: '',
  directionALabel: '',
  directionBKey: '',
  directionBLabel: '',
  icon: '',
  sort: 1,
  isEnabled: 1,
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入维度编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入维度名称', trigger: 'blur' }],
  directionAKey: [{ required: true, message: '请输入方向A标识', trigger: 'blur' }],
  directionALabel: [{ required: true, message: '请输入方向A标签', trigger: 'blur' }],
  directionBKey: [{ required: true, message: '请输入方向B标识', trigger: 'blur' }],
  directionBLabel: [{ required: true, message: '请输入方向B标签', trigger: 'blur' }],
  sort: [{ required: true, message: '请输入排序权重', trigger: 'blur' }],
}

const resetForm = () => {
  editForm.id = 0
  editForm.code = ''
  editForm.name = ''
  editForm.directionAKey = ''
  editForm.directionALabel = ''
  editForm.directionBKey = ''
  editForm.directionBLabel = ''
  editForm.icon = ''
  editForm.sort = 1
  editForm.isEnabled = 1
}

const openCreate = () => {
  resetForm()
  editVisible.value = true
}

const openEdit = (row: PersonalityDimensionItem) => {
  editForm.id = row.id
  editForm.code = row.code
  editForm.name = row.name
  editForm.directionAKey = row.directionAKey
  editForm.directionALabel = row.directionALabel
  editForm.directionBKey = row.directionBKey
  editForm.directionBLabel = row.directionBLabel
  editForm.icon = row.icon || ''
  editForm.sort = row.sort
  editForm.isEnabled = row.isEnabled
  editVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (editForm.directionAKey.trim() === editForm.directionBKey.trim()) {
    ElMessage.error('两个方向标识不能相同')
    return
  }
  saving.value = true
  try {
    const payload = {
      code: editForm.code.trim(),
      name: editForm.name.trim(),
      directionAKey: editForm.directionAKey.trim(),
      directionALabel: editForm.directionALabel.trim(),
      directionBKey: editForm.directionBKey.trim(),
      directionBLabel: editForm.directionBLabel.trim(),
      icon: editForm.icon.trim(),
      sort: editForm.sort,
      isEnabled: editForm.isEnabled,
    }
    if (editForm.id) {
      await personalityDimensionApi.update(editForm.id, payload)
      ElMessage.success('更新成功')
    } else {
      await personalityDimensionApi.create(payload)
      ElMessage.success('新增成功')
    }
    editVisible.value = false
    loadList()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally { saving.value = false }
}

const toggleEnabled = async (row: PersonalityDimensionItem) => {
  const next = row.isEnabled === 1 ? 0 : 1
  try {
    await personalityDimensionApi.setStatus(row.id, next)
    row.isEnabled = next
  } catch { /* ignore */ }
}

const handleDelete = async (row: PersonalityDimensionItem) => {
  try {
    await personalityDimensionApi.remove(row.id)
    ElMessage.success('删除成功')
    loadList()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(loadList)
</script>

<style lang="scss" scoped>
.dimension-page {
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.tip {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}
</style>
