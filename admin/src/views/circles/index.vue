<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">圈子管理</h2>
    </div>

    <el-card class="content-card">
      <div class="toolbar">
        <el-button type="primary" @click="openDialog()">新增圈子</el-button>
      </div>

      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="名称" width="120" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="sort" label="排序" width="60" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showDialog" :title="isEdit ? '编辑圈子' : '新增圈子'" width="480px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称"><el-input v-model="form.name" placeholder="圈子名称" /></el-form-item>
        <el-form-item label="图标">
          <div style="display:flex;align-items:center;gap:12px">
            <el-upload
              :show-file-list="false"
              :http-request="handleIconUpload"
              :before-upload="beforeUpload"
              accept="image/*"
            >
              <el-button type="primary" :loading="iconUploading">上传图片</el-button>
            </el-upload>
            <el-image v-if="form.icon" :src="form.icon" style="width:60px;height:60px;border-radius:4px;border:1px solid #dcdfe6" fit="cover" />
          </div>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="3" placeholder="圈子描述" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item v-if="isEdit" label="状态">
          <el-switch v-model="form.statusBool" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminSystem } from '../../api'

const loading = ref(false)
const list = ref<any[]>([])
const showDialog = ref(false)
const isEdit = ref(false)
const editId = ref(0)
const saving = ref(false)
const iconUploading = ref(false)
const form = reactive({ name: '', icon: '', description: '', sort: 0, statusBool: true })

function beforeUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过5MB')
    return false
  }
  return true
}

async function handleIconUpload(options: any) {
  iconUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', options.file)
    const res = await adminSystem.upload(fd)
    if (res.success && res.data?.url) {
      form.icon = res.data.url
      ElMessage.success('上传成功')
    }
  } catch (e) {
    ElMessage.error('上传失败')
  }
  iconUploading.value = false
}

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  try { const res = await adminSystem.getCircles(); list.value = (res.data as any) || [] }
  catch (e) { console.error(e) }
  loading.value = false
}

function openDialog(row?: any) {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    Object.assign(form, { name: row.name, icon: row.icon, description: row.description, sort: row.sort, statusBool: row.status === 1 })
  } else {
    isEdit.value = false
    editId.value = 0
    Object.assign(form, { name: '', icon: '', description: '', sort: 0, statusBool: true })
  }
  showDialog.value = true
}

async function handleSave() {
  saving.value = true
  try {
    const data = { ...form, status: form.statusBool ? 1 : 0 }
    let res
    if (isEdit.value) res = await adminSystem.updateCircle(editId.value, data)
    else res = await adminSystem.createCircle(data)
    if (res.success) { ElMessage.success(isEdit.value ? '已更新' : '已创建'); showDialog.value = false; fetchList() }
  } catch (e) { ElMessage.error('保存失败') }
  finally { saving.value = false }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
    await adminSystem.deleteCircle(id)
    ElMessage.success('已删除')
    fetchList()
  } catch (e) { /* cancelled */ }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; color: #303133; margin: 0; }
.content-card { margin-bottom: 20px; }
.toolbar { margin-bottom: 16px; }
</style>
