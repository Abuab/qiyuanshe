<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">成功案例管理</h2>
    </div>

    <el-card class="content-card">
      <div class="toolbar">
        <el-button type="primary" @click="openDialog()">新增案例</el-button>
      </div>

      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image v-if="row.cover" :src="row.cover" style="width:80px;height:60px" fit="cover" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" width="150" />
        <el-table-column label="故事" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.storyContent?.slice(0, 80) }}</template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="60" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '显示' : '隐藏' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          layout="prev, pager, next"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <el-dialog v-model="showDialog" :title="isEdit ? '编辑案例' : '新增案例'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="标题"><el-input v-model="form.title" placeholder="案例标题" /></el-form-item>
        <el-form-item label="封面">
          <div style="display:flex;align-items:center;gap:12px">
            <el-upload
              :show-file-list="false"
              :http-request="handleCoverUpload"
              :before-upload="beforeUpload"
              accept="image/*"
            >
              <el-button type="primary" :loading="coverUploading">上传图片</el-button>
            </el-upload>
            <el-image v-if="form.cover" :src="form.cover" style="width:80px;height:60px;border-radius:4px;border:1px solid #dcdfe6" fit="cover" />
          </div>
        </el-form-item>
        <el-form-item label="男方ID"><el-input v-model="form.maleUserId" placeholder="男方用户ID" /></el-form-item>
        <el-form-item label="女方ID"><el-input v-model="form.femaleUserId" placeholder="女方用户ID" /></el-form-item>
        <el-form-item label="故事内容"><el-input v-model="form.storyContent" type="textarea" :rows="6" placeholder="故事内容" /></el-form-item>
        <el-form-item label="图片URL"><el-input v-model="form.photosStr" type="textarea" :rows="3" placeholder="每行一个图片URL" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
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
const coverUploading = ref(false)
const form = reactive({ title: '', cover: '', maleUserId: '', femaleUserId: '', storyContent: '', photosStr: '', sort: 0 })
const pagination = reactive({ page: 1, limit: 20, total: 0 })

onMounted(() => fetchList())

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

async function handleCoverUpload(options: any) {
  coverUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', options.file)
    const res = await adminSystem.upload(fd)
    if (res.success && res.data?.url) {
      form.cover = res.data.url
      ElMessage.success('上传成功')
    }
  } catch (e) {
    ElMessage.error('上传失败')
  }
  coverUploading.value = false
}

async function fetchList() {
  loading.value = true
  try {
    const res = await adminSystem.getSuccessCases(pagination.page, pagination.limit)
    list.value = (res.data as any)?.list || []
    pagination.total = (res.data as any)?.total || 0
  } catch (e) { console.error(e) }
  loading.value = false
}

function openDialog(row?: any) {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    Object.assign(form, {
      title: row.title, cover: row.cover || '', maleUserId: row.maleUserId || '', femaleUserId: row.femaleUserId || '',
      storyContent: row.storyContent || '', sort: row.sort || 0,
      photosStr: row.photos?.join('\n') || '',
    })
  } else {
    isEdit.value = false; editId.value = 0
    Object.assign(form, { title: '', cover: '', maleUserId: '', femaleUserId: '', storyContent: '', photosStr: '', sort: 0 })
  }
  showDialog.value = true
}

async function handleSave() {
  saving.value = true
  try {
    const data = {
      title: form.title,
      cover: form.cover,
      maleUserId: +form.maleUserId || null,
      femaleUserId: +form.femaleUserId || null,
      storyContent: form.storyContent,
      sort: form.sort,
      photos: form.photosStr.split('\n').filter(Boolean),
    }
    let res
    if (isEdit.value) res = await adminSystem.updateSuccessCase(editId.value, data)
    else res = await adminSystem.createSuccessCase(data)
    if (res.success) { ElMessage.success(isEdit.value ? '已更新' : '已创建'); showDialog.value = false; fetchList() }
  } catch (e) { ElMessage.error('保存失败') }
  finally { saving.value = false }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
    await adminSystem.deleteSuccessCase(id)
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
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
