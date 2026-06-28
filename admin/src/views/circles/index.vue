<template>
  <div class="page">
    <!-- 面包屑 -->
    <el-breadcrumb separator="/">
      <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item>圈子管理</el-breadcrumb-item>
    </el-breadcrumb>

    <div class="page-header">
      <h2 class="page-title">圈子管理</h2>
    </div>

    <el-card class="content-card">
      <div class="toolbar">
        <el-button type="primary" @click="openFormDrawer()">新增圈子</el-button>
      </div>

      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="名称" width="140" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="sort" label="排序" width="70" align="center" />
        <el-table-column label="成员数量" width="90" align="center">
          <template #default="{ row }">
            {{ memberCountMap[row.id] ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="openFormDrawer(row)">编辑</el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row)">删除</el-button>
            <el-button type="warning" size="small" link @click="openMemberDialog(row)">配置成员</el-button>
            <el-button size="small" link @click="openBannerDialog(row)">配置Banner</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ==================== 新增/编辑抽屉 ==================== -->
    <el-drawer
      v-model="showFormDrawer"
      :title="isEdit ? '编辑圈子' : '新增圈子'"
      direction="rtl"
      size="480px"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="请输入圈子名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入圈子描述（选填）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.statusBool" active-text="启用" inactive-text="禁用" />
        </el-form-item>
        <el-form-item label="Banner图">
          <div class="upload-area">
            <el-upload
              :show-file-list="false"
              :http-request="handleBannerUpload"
              :before-upload="beforeUpload"
              accept="image/*"
            >
              <el-button type="primary" :loading="bannerUploading">
                {{ form.bannerImage ? '更换图片' : '上传图片' }}
              </el-button>
            </el-upload>
            <div v-if="form.bannerImage" class="upload-preview">
              <el-image
                :src="form.bannerImage"
                style="width:200px;height:93px;border-radius:6px;border:1px solid #dcdfe6"
                fit="cover"
                :preview-src-list="[form.bannerImage]"
                preview-teleported
              />
              <el-button type="danger" size="small" link @click="form.bannerImage = ''">删除</el-button>
            </div>
            <span v-else class="upload-tip">建议尺寸 750×350</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showFormDrawer = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-drawer>

    <!-- ==================== Banner管理弹窗 ==================== -->
    <el-dialog v-model="showBannerDialog" title="配置Banner" width="500px">
      <div class="banner-dialog-content">
        <el-upload
          :show-file-list="false"
          :http-request="handleBannerDialogUpload"
          :before-upload="beforeUpload"
          accept="image/*"
          class="banner-upload-btn"
        >
          <el-button type="primary" :loading="bannerDialogUploading">
            {{ bannerDialogImage ? '更换图片' : '上传图片' }}
          </el-button>
        </el-upload>
        <span class="banner-tip">建议尺寸 750×350，支持 JPG/PNG，大小不超过5MB</span>
        <div v-if="bannerDialogImage" class="banner-preview-wrap">
          <el-image
            :src="bannerDialogImage"
            style="width:100%;max-width:400px;border-radius:6px;border:1px solid #dcdfe6"
            fit="cover"
            :preview-src-list="[bannerDialogImage]"
            preview-teleported
          />
          <el-button type="danger" size="small" link @click="bannerDialogImage = ''">删除图片</el-button>
        </div>
        <div v-else class="banner-empty">
          <span>尚未上传Banner图片</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="showBannerDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBannerSave" :loading="bannerSaving">保存</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 成员管理（穿梭框） ==================== -->
    <MemberTransfer
      v-model:visible="showMemberDialog"
      :circle-id="memberCircleId"
      @saved="onMemberSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminSystem } from '../../api'
import MemberTransfer from './MemberTransfer.vue'

const loading = ref(false)
const list = ref<any[]>([])
const memberCountMap = ref<Record<number, number>>({})

// ===== 表单抽屉 =====
const showFormDrawer = ref(false)
const isEdit = ref(false)
const editId = ref(0)
const saving = ref(false)
const bannerUploading = ref(false)
const form = reactive({
  name: '',
  description: '',
  sort: 0,
  statusBool: true,
  bannerImage: '',
})

// ===== Banner 弹窗 =====
const showBannerDialog = ref(false)
const bannerDialogCircleId = ref(0)
const bannerDialogImage = ref('')
const bannerDialogUploading = ref(false)
const bannerSaving = ref(false)

// ===== 成员管理 =====
const showMemberDialog = ref(false)
const memberCircleId = ref(0)

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

async function doUpload(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await adminSystem.upload(fd)
  if ((res as any).success && (res as any).data?.url) {
    return (res as any).data.url
  }
  throw new Error('上传失败')
}

async function handleBannerUpload(options: any) {
  bannerUploading.value = true
  try {
    form.bannerImage = await doUpload(options.file)
    ElMessage.success('上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
  bannerUploading.value = false
}

async function handleBannerDialogUpload(options: any) {
  bannerDialogUploading.value = true
  try {
    bannerDialogImage.value = await doUpload(options.file)
    ElMessage.success('上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
  bannerDialogUploading.value = false
}

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  try {
    const res = await adminSystem.getCircles()
    list.value = ((res as any).data as any[]) || []
  } catch (e) {
    console.error(e)
  }
  loading.value = false
  // 加载每个圈子的成员数
  for (const c of list.value) {
    try {
      const res = await adminSystem.getCircleMembers(c.id)
      memberCountMap.value[c.id] = ((res as any).data as any[])?.length ?? 0
    } catch {
      /* ignore */
    }
  }
}

// ===== 表单抽屉 =====
function openFormDrawer(row?: any) {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    form.name = row.name || ''
    form.description = row.description || ''
    form.sort = row.sort ?? 0
    form.statusBool = row.status === 1
    form.bannerImage = row.bannerImage || ''
  } else {
    isEdit.value = false
    editId.value = 0
    form.name = ''
    form.description = ''
    form.sort = 0
    form.statusBool = true
    form.bannerImage = ''
  }
  showFormDrawer.value = true
}

async function handleSave() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入圈子名称')
    return
  }
  saving.value = true
  try {
    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      sort: form.sort,
      status: form.statusBool ? 1 : 0,
      bannerImage: form.bannerImage,
    }
    let res: any
    if (isEdit.value) {
      res = await adminSystem.updateCircle(editId.value, data)
    } else {
      res = await adminSystem.createCircle(data)
    }
    if ((res as any).success) {
      ElMessage.success(isEdit.value ? '已更新' : '已创建')
      showFormDrawer.value = false
      fetchList()
    }
  } catch {
    ElMessage.error('保存失败')
  }
  saving.value = false
}

// ===== 删除 =====
async function handleDelete(row: any) {
  const memberCount = memberCountMap.value[row.id] ?? 0
  const message =
    memberCount > 0
      ? `该圈子下有 ${memberCount} 个成员，确定要删除吗？删除后成员关联将一并清除。`
      : '确定删除该圈子吗？'

  try {
    await ElMessageBox.confirm(message, '删除确认', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await adminSystem.deleteCircle(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch {
    ElMessage.error('删除失败，请稍后重试')
  }
}

// ===== Banner 弹窗 =====
function openBannerDialog(row: any) {
  bannerDialogCircleId.value = row.id
  bannerDialogImage.value = row.bannerImage || ''
  showBannerDialog.value = true
}

async function handleBannerSave() {
  bannerSaving.value = true
  try {
    const res = await adminSystem.updateCircle(bannerDialogCircleId.value, {
      bannerImage: bannerDialogImage.value,
    })
    if ((res as any).success) {
      ElMessage.success('Banner已保存')
      showBannerDialog.value = false
      fetchList()
    }
  } catch {
    ElMessage.error('保存失败')
  }
  bannerSaving.value = false
}

// ===== 成员管理 =====
function openMemberDialog(row: any) {
  memberCircleId.value = row.id
  showMemberDialog.value = true
}

function onMemberSaved(circleId: number) {
  // 更新成员数缓存
  adminSystem.getCircleMembers(circleId).then(res => {
    memberCountMap.value[circleId] = ((res as any).data as any[])?.length ?? 0
  })
}
</script>

<style scoped>
.page {
  padding: 20px;
}
.page-header {
  margin: 16px 0 20px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}
.content-card {
  margin-bottom: 20px;
}
.toolbar {
  margin-bottom: 16px;
}

/* 上传区域 */
.upload-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.upload-preview {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.upload-tip {
  color: #909399;
  font-size: 12px;
}

/* Banner 弹窗 */
.banner-dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.banner-upload-btn {
  margin-bottom: 4px;
}
.banner-tip {
  color: #909399;
  font-size: 13px;
}
.banner-preview-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.banner-empty {
  padding: 40px 0;
  color: #c0c4cc;
  font-size: 14px;
}
</style>
