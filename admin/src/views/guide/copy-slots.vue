<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">文案配置</h2>
      <el-button type="primary" @click="openCreate">新增文案位</el-button>
    </div>

    <el-card shadow="never">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="name" label="文案位名称" min-width="140" />
        <el-table-column prop="code" label="编码" min-width="160">
          <template #default="{ row }">
            <span class="code-text">{{ row.code }}</span>
            <el-tag v-if="row.isSystem" size="small" type="info" style="margin-left: 6px">系统</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pageLocation" label="页面位置" min-width="140" show-overflow-tooltip />
        <el-table-column label="展示模式" width="120">
          <template #default="{ row }">
            <el-tag :type="modeTagType(row.displayMode)" size="small">{{ modeLabel(row.displayMode) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="itemCount" label="文案数" width="90" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">
              {{ row.isEnabled ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goDetail(row)">管理文案/看板</el-button>
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-popconfirm
              v-if="!row.isSystem"
              title="确认删除该文案位及其下所有文案？"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      :title="editForm.id ? '编辑文案位' : '新增文案位'"
      v-model="editVisible"
      width="560px"
      destroy-on-close
    >
      <el-form :model="editForm" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="编码" prop="code">
          <el-input v-model="editForm.code" :disabled="!!editForm.id" placeholder="小写字母/数字/下划线" />
          <div class="tip" v-if="editForm.id">编码创建后不可修改</div>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="editForm.name" maxlength="50" />
        </el-form-item>
        <el-form-item label="页面位置">
          <el-input v-model="editForm.pageLocation" maxlength="100" />
        </el-form-item>
        <el-form-item label="展示模式" prop="displayMode">
          <el-select v-model="editForm.displayMode" style="width: 100%">
            <el-option label="轮播展示（按权重随机一条）" value="carousel" />
            <el-option label="A/B 测试（均分展示，独立统计）" value="ab_test" />
            <el-option label="全展示（同时展示全部）" value="all" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" maxlength="255" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="editForm.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="editForm.isEnabled" :active-value="1" :inactive-value="0" />
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
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { copySlotApi } from '../../api/guide'
import type { CopySlotItem, CopyDisplayMode } from '../../api/guide'

const router = useRouter()
const list = ref<CopySlotItem[]>([])
const loading = ref(false)
const saving = ref(false)
const editVisible = ref(false)
const formRef = ref<FormInstance>()

const editForm = reactive<any>({
  id: 0,
  code: '',
  name: '',
  pageLocation: '',
  displayMode: 'carousel' as CopyDisplayMode,
  remark: '',
  sort: 0,
  isEnabled: 1,
})

const rules: FormRules = {
  code: [
    { required: true, message: '请输入编码', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9_]{1,49}$/, message: '小写字母开头，仅含小写字母/数字/下划线，长度2-50', trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  displayMode: [{ required: true, message: '请选择展示模式', trigger: 'change' }],
}

const modeLabel = (m: CopyDisplayMode) =>
  ({ carousel: '轮播', ab_test: 'A/B测试', all: '全展示' })[m] || m
const modeTagType = (m: CopyDisplayMode) =>
  ({ carousel: 'primary', ab_test: 'warning', all: 'success' })[m] || 'info'

const loadList = async () => {
  loading.value = true
  try {
    const res = await copySlotApi.getList()
    if (res.success && res.data) list.value = res.data
  } catch { /* ignore */ }
  finally { loading.value = false }
}

const openCreate = () => {
  Object.assign(editForm, {
    id: 0, code: '', name: '', pageLocation: '',
    displayMode: 'carousel', remark: '', sort: 0, isEnabled: 1,
  })
  editVisible.value = true
}

const openEdit = (row: CopySlotItem) => {
  Object.assign(editForm, {
    id: row.id, code: row.code, name: row.name,
    pageLocation: row.pageLocation || '', displayMode: row.displayMode,
    remark: row.remark || '', sort: row.sort, isEnabled: row.isEnabled,
  })
  editVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const payload = {
      code: editForm.code.trim(),
      name: editForm.name.trim(),
      pageLocation: editForm.pageLocation.trim(),
      displayMode: editForm.displayMode,
      remark: editForm.remark.trim(),
      sort: editForm.sort,
      isEnabled: editForm.isEnabled,
    }
    if (editForm.id) {
      await copySlotApi.update(editForm.id, payload)
      ElMessage.success('更新成功')
    } else {
      await copySlotApi.create(payload)
      ElMessage.success('新增成功')
    }
    editVisible.value = false
    loadList()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: CopySlotItem) => {
  try {
    await copySlotApi.remove(row.id)
    ElMessage.success('删除成功')
    loadList()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

const goDetail = (row: CopySlotItem) => {
  router.push({ name: 'GuideCopyDetail', params: { slotId: row.id } })
}

onMounted(loadList)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title { font-size: 18px; font-weight: 600; margin: 0; }
.code-text { font-family: monospace; color: #606266; }
.tip { color: #909399; font-size: 12px; margin-top: 4px; }
</style>
