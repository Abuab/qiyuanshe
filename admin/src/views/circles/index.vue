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
        <el-table-column label="成员" width="80" align="center">
          <template #default="{ row }">
            {{ memberCountMap[row.id] ?? 0 }}
          </template>
        </el-table-column>
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

    <el-dialog v-model="showDialog" :title="isEdit ? '编辑圈子' : '新增圈子'" width="560px">
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
        <el-form-item label="Banner">
          <div style="display:flex;align-items:center;gap:12px">
            <el-upload
              :show-file-list="false"
              :http-request="handleBannerUpload"
              :before-upload="beforeUpload"
              accept="image/*"
            >
              <el-button :loading="bannerUploading">上传图片</el-button>
            </el-upload>
            <el-image v-if="form.bannerImage" :src="form.bannerImage" style="width:80px;height:40px;border-radius:4px;border:1px solid #dcdfe6" fit="cover" />
          </div>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="2" placeholder="圈子描述" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item v-if="isEdit" label="状态">
          <el-switch v-model="form.statusBool" active-text="启用" inactive-text="禁用" />
        </el-form-item>

        <!-- 成员管理（仅编辑时） -->
        <el-form-item v-if="isEdit" label="成员">
          <div style="width:100%">
            <div style="display:flex;gap:8px;margin-bottom:8px">
              <el-select
                v-model="selectedUserId"
                filterable
                remote
                :remote-method="searchUser"
                :loading="searchingUser"
                placeholder="搜索用户昵称"
                clearable
                value-key="id"
                style="flex:1"
              >
                <el-option
                  v-for="u in userOptions"
                  :key="u.id"
                  :label="u.nickname"
                  :value="u.id"
                />
              </el-select>
              <el-button type="primary" @click="addMember" :disabled="!selectedUserId">添加</el-button>
            </div>
            <div class="member-list">
              <el-tag
                v-for="m in currentMembers"
                :key="m.id"
                closable
                @close="removeMember(m.id)"
                style="margin:4px"
              >
                <el-avatar :src="m.avatar" :size="20" style="margin-right:4px;vertical-align:middle" />
                {{ m.nickname }}
              </el-tag>
              <span v-if="currentMembers.length === 0" style="color:#999;font-size:13px">暂无成员</span>
            </div>
          </div>
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
const memberCountMap = ref<Record<number, number>>({})
const showDialog = ref(false)
const isEdit = ref(false)
const editId = ref(0)
const saving = ref(false)
const iconUploading = ref(false)
const bannerUploading = ref(false)
const form = reactive({ name: '', icon: '', bannerImage: '', description: '', sort: 0, statusBool: true })

// 成员管理
const selectedUserId = ref<number | null>(null)
const userOptions = ref<any[]>([])
const searchingUser = ref(false)
const currentMembers = ref<any[]>([])

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

async function handleBannerUpload(options: any) {
  bannerUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', options.file)
    const res = await adminSystem.upload(fd)
    if (res.success && res.data?.url) {
      form.bannerImage = res.data.url
      ElMessage.success('上传成功')
    }
  } catch (e) {
    ElMessage.error('上传失败')
  }
  bannerUploading.value = false
}

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  try { const res = await adminSystem.getCircles(); list.value = (res.data as any) || [] }
  catch (e) { console.error(e) }
  finally { loading.value = false }
  // 加载每个圈子的成员数
  for (const c of list.value) {
    try {
      const res = await adminSystem.getCircleMembers(c.id)
      memberCountMap.value[c.id] = (res.data as any[])?.length ?? 0
    } catch { /* ignore */ }
  }
}

async function searchUser(keyword: string) {
  if (!keyword || keyword.trim().length === 0) { userOptions.value = []; return }
  searchingUser.value = true
  try {
    const res = await adminSystem.searchUsers(keyword)
    userOptions.value = (res.data as any[]) || []
  } catch { /* ignore */ }
  searchingUser.value = false
}

async function addMember() {
  if (!selectedUserId.value || !editId.value) return
  try {
    await adminSystem.addCircleMember(editId.value, selectedUserId.value)
    const found = userOptions.value.find(u => u.id === selectedUserId.value)
    if (found && !currentMembers.value.some(m => m.id === found.id)) {
      currentMembers.value.push({ id: found.id, nickname: found.nickname, avatar: found.avatar })
    }
    selectedUserId.value = null
    userOptions.value = []
    memberCountMap.value[editId.value] = currentMembers.value.length
  } catch {
    ElMessage.error('添加失败')
  }
}

async function removeMember(userId: number) {
  if (!editId.value) return
  try {
    await adminSystem.removeCircleMember(editId.value, userId)
    currentMembers.value = currentMembers.value.filter(m => m.id !== userId)
    memberCountMap.value[editId.value] = currentMembers.value.length
    ElMessage.success('已移除')
  } catch {
    ElMessage.error('移除失败')
  }
}

async function loadMembers(circleId: number) {
  try {
    const res = await adminSystem.getCircleMembers(circleId)
    currentMembers.value = (res.data as any[]) || []
  } catch { currentMembers.value = [] }
}

function openDialog(row?: any) {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    Object.assign(form, { name: row.name, icon: row.icon || '', bannerImage: row.bannerImage || '', description: row.description || '', sort: row.sort, statusBool: row.status === 1 })
    loadMembers(row.id)
  } else {
    isEdit.value = false
    editId.value = 0
    Object.assign(form, { name: '', icon: '', bannerImage: '', description: '', sort: 0, statusBool: true })
    currentMembers.value = []
  }
  selectedUserId.value = null
  userOptions.value = []
  showDialog.value = true
}

async function handleSave() {
  saving.value = true
  try {
    const data = {
      name: form.name,
      icon: form.icon,
      bannerImage: form.bannerImage,
      description: form.description,
      sort: form.sort,
      status: form.statusBool ? 1 : 0,
    }
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
  } catch {
    return
  }
  try {
    await adminSystem.deleteCircle(id)
    ElMessage.success('已删除')
    fetchList()
  } catch {
    ElMessage.error('删除失败，请稍后重试')
  }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; color: #303133; margin: 0; }
.content-card { margin-bottom: 20px; }
.toolbar { margin-bottom: 16px; }
.member-list { min-height: 32px; }
</style>
