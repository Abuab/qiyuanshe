<template>
  <div class="page">
    <!-- 面包屑 -->
    <el-breadcrumb separator="/">
      <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item>成功案例</el-breadcrumb-item>
    </el-breadcrumb>

    <div class="page-header">
      <h2 class="page-title">成功案例管理</h2>
    </div>

    <!-- 搜索 & 操作栏 -->
    <el-card class="content-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索昵称/标题"
            clearable
            style="width: 220px"
            @clear="onSearch"
            @keyup.enter="onSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-date-picker
            v-model="searchDates"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 260px; margin-left: 12px"
            @change="onSearch"
          />
          <el-button type="primary" @click="onSearch" style="margin-left: 12px">搜索</el-button>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" @click="openDialog()">新增案例</el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="发送者" width="160">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:8px">
              <el-avatar v-if="row.userAvatar" :src="row.userAvatar" :size="32" />
              <span>{{ row.displayNickname || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <el-table-column label="发布日期" width="110">
          <template #default="{ row }">{{ row.publishDate || '-' }}</template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="60" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            <el-button size="small" @click="previewCase(row)">预览</el-button>
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

    <!-- ========== 新增/编辑弹窗 ========== -->
    <el-dialog
      v-model="showDialog"
      :title="isEdit ? '编辑案例' : '新增案例'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="100px">
        <!-- 发送者头像 -->
        <el-form-item label="发送者头像">
          <div style="display:flex;align-items:center;gap:12px">
            <el-avatar v-if="form.senderAvatar" :src="form.senderAvatar" :size="48" />
            <el-upload
              :show-file-list="false"
              :http-request="handleAvatarUpload"
              :before-upload="beforeUpload"
              accept="image/*"
            >
              <el-button :loading="avatarUploading">
                {{ form.senderAvatar ? '替换头像' : '上传头像' }}
              </el-button>
            </el-upload>
            <el-button
              v-if="form.senderAvatar"
              size="small"
              type="danger"
              @click="form.senderAvatar = ''"
            >
              删除
            </el-button>
          </div>
        </el-form-item>

        <!-- 显示昵称 -->
        <el-form-item label="显示昵称" required>
          <el-input v-model="form.displayNickname" placeholder="如：小张&小李" maxlength="50" show-word-limit />
        </el-form-item>

        <!-- 标题 -->
        <el-form-item label="标题" required>
          <el-input
            v-model="form.title"
            placeholder="如：12月26日喜报我们要结婚啦"
            maxlength="200"
            show-word-limit
          />
          <div style="color:#909399;font-size:12px;margin-top:4px">该标题在小程序端以粉色大字展示</div>
        </el-form-item>

        <!-- 正文 -->
        <el-form-item label="正文内容" required>
          <el-input
            v-model="form.storyContent"
            type="textarea"
            :rows="6"
            placeholder="脱单故事内容，支持换行"
            maxlength="5000"
            show-word-limit
          />
        </el-form-item>

        <!-- 图片上传（多图） -->
        <el-form-item label="图片上传">
          <div class="photo-upload-area">
            <div v-for="(p, idx) in form.photos" :key="idx" class="photo-item">
              <el-image :src="p" style="width:100px;height:100px;border-radius:8px" fit="cover" @click="previewPhoto(p)" />
              <div class="photo-actions">
                <el-button
                  :disabled="idx === 0"
                  size="small"
                  :icon="ArrowUp"
                  circle
                  @click="movePhoto(idx, -1)"
                />
                <el-button
                  :disabled="idx === form.photos.length - 1"
                  size="small"
                  :icon="ArrowDown"
                  circle
                  @click="movePhoto(idx, 1)"
                />
                <el-button size="small" :icon="Delete" circle type="danger" @click="removePhoto(idx)" />
              </div>
            </div>
            <div v-if="form.photos.length < 9" class="photo-upload-btn">
              <el-upload
                :show-file-list="false"
                :http-request="handlePhotoUpload"
                :before-upload="beforePhotoUpload"
                accept="image/*"
              >
                <el-button :loading="photoUploading">+ 上传图片</el-button>
              </el-upload>
              <span style="color:#999;font-size:12px;margin-top:4px">最多9张 ({{ form.photos.length }}/9)</span>
            </div>
          </div>
          <div style="color:#909399;font-size:12px;margin-top:4px">
            图片按排序展示；单张限宽，多张2-3列网格
          </div>
        </el-form-item>

        <!-- 发布日期 -->
        <el-form-item label="发布日期">
          <el-date-picker
            v-model="form.publishDate"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <!-- 排序 -->
        <el-form-item label="排序权重">
          <el-input-number v-model="form.sort" :min="0" />
          <span style="margin-left:8px;color:#999;font-size:12px">数字越小越靠前</span>
        </el-form-item>

        <!-- 状态 -->
        <el-form-item label="状态">
          <el-switch
            v-model="form.statusBool"
            active-text="启用"
            inactive-text="禁用"
            @change="form.status = form.statusBool ? 1 : 0"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存并返回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, ArrowUp, ArrowDown, Delete } from '@element-plus/icons-vue'
import { adminSystem } from '../../api'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const pagination = reactive({ page: 1, limit: 20, total: 0 })

// 搜索
const searchKeyword = ref('')
const searchDates = ref<[string, string] | null>(null)

// 表单
const showDialog = ref(false)
const isEdit = ref(false)
const editId = ref(0)
const photoUploading = ref(false)
const form = reactive<Record<string, any>>({
  title: '',
  displayNickname: '',
  senderAvatar: '',
  storyContent: '',
  photos: [] as string[],
  publishDate: '',
  sort: 0,
  status: 1,
  statusBool: true,
})

onMounted(() => { fetchList() })

// ========== 列表 ==========
async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: pagination.page, limit: pagination.limit }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (searchDates.value) {
      params.dateFrom = searchDates.value[0]
      params.dateTo = searchDates.value[1]
    }
    const res = await adminSystem.getSuccessCases(params)
    list.value = (res.data as any)?.list || []
    pagination.total = (res.data as any)?.total || 0
  } catch (e) { console.error(e) }
  loading.value = false
}

function onSearch() {
  pagination.page = 1
  fetchList()
}

// ========== 弹窗 ==========
function openDialog(row?: any) {
  resetForm()
  if (row) {
    isEdit.value = true
    editId.value = row.id
    Object.assign(form, {
      title: row.title || '',
      displayNickname: row.displayNickname || '',
      senderAvatar: row.userAvatar || '',
      storyContent: row.storyContent || '',
      photos: row.photos || [],
      publishDate: row.publishDate || '',
      sort: row.sort || 0,
      status: row.status ?? 1,
      statusBool: (row.status ?? 1) === 1,
    })
  }
  showDialog.value = true
}

function resetForm() {
  isEdit.value = false
  editId.value = 0
  Object.assign(form, {
    title: '', displayNickname: '', senderAvatar: '', storyContent: '', photos: [],
    publishDate: '', sort: 0, status: 1, statusBool: true,
  })
}

// 发送者头像上传
const avatarUploading = ref(false)
const handleAvatarUpload = async (options: any) => {
  avatarUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', options.file)
    const res = await adminSystem.upload(fd)
    if (res.success && res.data?.url) {
      form.senderAvatar = res.data.url
      ElMessage.success('上传成功')
    } else {
      ElMessage.error('上传失败')
    }
  } catch (e) { ElMessage.error('上传失败') }
  avatarUploading.value = false
}

// 图片上传
function beforePhotoUpload(file: File) {
  if (!file.type.startsWith('image/')) { ElMessage.warning('请选择图片文件'); return false }
  if (file.size > 5 * 1024 * 1024) { ElMessage.warning('图片大小不能超过5MB'); return false }
  return true
}

async function handlePhotoUpload(options: any) {
  photoUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', options.file)
    const res = await adminSystem.upload(fd)
    if (res.success && res.data?.url) {
      form.photos.push(res.data.url)
    } else {
      ElMessage.error('上传失败')
    }
  } catch (e) { ElMessage.error('上传失败') }
  photoUploading.value = false
}

function movePhoto(idx: number, dir: number) {
  const arr = [...form.photos]
  const newIdx = idx + dir
  ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
  form.photos = arr
}

function removePhoto(idx: number) { form.photos.splice(idx, 1) }
function previewPhoto(url: string) { window.open(url, '_blank') }

// 保存
async function handleSave() {
  if (!form.title) { ElMessage.warning('请输入标题'); return }
  if (!form.storyContent) { ElMessage.warning('请输入正文内容'); return }
  saving.value = true
  try {
    const data: Record<string, any> = {
      title: form.title,
      displayNickname: form.displayNickname,
      senderAvatar: form.senderAvatar,
      storyContent: form.storyContent,
      photos: form.photos,
      publishDate: form.publishDate || null,
      sort: form.sort,
      status: form.status,
    }
    let res
    if (isEdit.value) res = await adminSystem.updateSuccessCase(editId.value, data)
    else res = await adminSystem.createSuccessCase(data)
    if (res.success) {
      ElMessage.success(isEdit.value ? '已更新' : '已创建')
      showDialog.value = false
      fetchList()
    }
  } catch (e) { ElMessage.error('保存失败') }
  finally { saving.value = false }
}

// 删除
async function handleDelete(row: any) {
  const tip = row.status === 1 ? '该案例当前为"启用"状态，确定删除？' : '确定删除？'
  try {
    await ElMessageBox.confirm(tip, '提示', { type: 'warning' })
    await adminSystem.deleteSuccessCase(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch (e) { /* cancelled */ }
}

// 预览
function previewCase(row: any) {
  // 打开小程序端详情页预览（需配合域名）
  ElMessage.info(`案例 ID: ${row.id}，小程序端路径: /pages/success-case-detail/index?id=${row.id}`)
}

// ========== 上传校验 ==========
function beforeUpload(file: File) {
  if (!file.type.startsWith('image/')) { ElMessage.warning('请选择图片文件'); return false }
  if (file.size > 5 * 1024 * 1024) { ElMessage.warning('图片大小不能超过5MB'); return false }
  return true
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { margin: 16px 0; }
.page-title { font-size: 20px; font-weight: 600; color: #303133; margin: 0; }
.content-card { margin-bottom: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.toolbar-left { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.toolbar-right { display: flex; gap: 8px; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }

/* 图片上传 */
.photo-upload-area { display: flex; flex-wrap: wrap; gap: 12px; }
.photo-item { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.photo-actions { display: flex; gap: 4px; }
.photo-upload-btn { display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 100px; height: 100px; border: 1px dashed #dcdfe6; border-radius: 8px; }
</style>
