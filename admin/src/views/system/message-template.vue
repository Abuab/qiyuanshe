<template>
  <div class="message-template-list">
    <div class="page-header">
      <h2 class="page-title">消息模板管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        添加模板
      </el-button>
    </div>

    <div class="card">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm" class="filter-form">
          <el-form-item label="分类">
            <el-select v-model="filterForm.category" placeholder="全部" clearable style="width: 140px" @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option label="系统通知" value="notification" />
              <el-option label="欢迎消息" value="greeting" />
              <el-option label="提醒" value="reminder" />
              <el-option label="营销" value="marketing" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="filterForm.keyword"
              placeholder="模板名称/内容"
              clearable
              style="width: 200px"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="模板名称" min-width="160" />
        <el-table-column prop="category" label="分类" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="categoryType(row.category)">
              {{ categoryLabel(row.category) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="useCount" label="使用次数" width="90" align="center" sortable="custom" />
        <el-table-column prop="lastUsedAt" label="最近使用" width="160" sortable="custom">
          <template #default="{ row }">
            {{ row.lastUsedAt ? formatTime(row.lastUsedAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper" v-if="total > filterForm.limit">
        <el-pagination
          v-model:current-page="filterForm.page"
          :page-size="filterForm.limit"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="fetchData"
        />
      </div>
    </div>

    <!-- 编辑/添加弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑模板' : '添加模板'"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" placeholder="运营后台显示名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" style="width: 200px">
            <el-option label="系统通知" value="notification" />
            <el-option label="欢迎消息" value="greeting" />
            <el-option label="提醒" value="reminder" />
            <el-option label="营销" value="marketing" />
          </el-select>
        </el-form-item>
        <el-form-item label="消息标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="消息标题，支持占位符 {nickname}"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item label="消息内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="5"
            placeholder="消息内容，支持占位符：{nickname}、{referral} 等"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="占位符说明">
          <div class="placeholder-list">
            <div
              v-for="(ph, idx) in form.placeholders || []"
              :key="idx"
              class="placeholder-item"
            >
              <el-input
                v-model="ph.key"
                placeholder="变量名"
                style="width: 120px"
              />
              <el-input
                v-model="ph.label"
                placeholder="说明"
                style="width: 160px"
              />
              <el-input
                v-model="ph.example"
                placeholder="示例值"
                style="width: 120px"
              />
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                circle
                @click="removePlaceholder(idx)"
              />
            </div>
            <el-button size="small" type="primary" plain @click="addPlaceholder">
              <el-icon><Plus /></el-icon>
              添加占位符
            </el-button>
          </div>
          <div class="form-tip">定义模板中可用的占位符，方便运营人员了解模板功能</div>
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
import { Plus, Delete } from '@element-plus/icons-vue'
import { messageTemplateApi, type MessageTemplate } from '../../api/message-template'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number>(0)
const formRef = ref()
const tableData = ref<MessageTemplate[]>([])
const total = ref(0)

const filterForm = reactive({
  page: 1,
  limit: 20,
  category: '',
  keyword: '',
})

const form = reactive({
  name: '',
  title: '',
  content: '',
  category: 'notification',
  placeholders: [] as { key: string; label: string; example: string }[],
  sortOrder: 0,
})

const rules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  title: [{ required: true, message: '请输入消息标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入消息内容', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = { notification: '系统通知', greeting: '欢迎', reminder: '提醒', marketing: '营销' }
  return map[cat] || cat
}

function categoryType(cat: string): string {
  const map: Record<string, string> = { notification: '', greeting: 'success', reminder: 'warning', marketing: 'danger' }
  return map[cat] || ''
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function addPlaceholder() {
  form.placeholders.push({ key: '', label: '', example: '' })
}

function removePlaceholder(idx: number) {
  form.placeholders.splice(idx, 1)
}

async function fetchData() {
  loading.value = true
  try {
    const res = await messageTemplateApi.list({
      page: filterForm.page,
      limit: filterForm.limit,
      category: filterForm.category || undefined,
      keyword: filterForm.keyword || undefined,
    })
    if (res.success && res.data) {
      tableData.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  filterForm.page = 1
  fetchData()
}

function handleReset() {
  filterForm.category = ''
  filterForm.keyword = ''
  filterForm.page = 1
  fetchData()
}

function handleCreate() {
  isEdit.value = false
  editId.value = 0
  form.name = ''
  form.title = ''
  form.content = ''
  form.category = 'notification'
  form.placeholders = []
  form.sortOrder = 0
  dialogVisible.value = true
}

function handleEdit(row: MessageTemplate) {
  isEdit.value = true
  editId.value = row.id
  form.name = row.name
  form.title = row.title
  form.content = row.content
  form.category = row.category
  form.placeholders = row.placeholders ? [...row.placeholders] : []
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
    const data = { ...form, placeholders: form.placeholders.filter(p => p.key) }
    if (isEdit.value) {
      await messageTemplateApi.update(editId.value, data)
      ElMessage.success('模板更新成功')
    } else {
      await messageTemplateApi.create(data)
      ElMessage.success('模板创建成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: MessageTemplate) {
  await ElMessageBox.confirm(`确定要删除模板「${row.name}」吗？`, '确认删除', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  })
  try {
    await messageTemplateApi.remove(row.id)
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
.message-template-list {
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

  .filter-bar {
    margin-bottom: 16px;
  }

  .pagination-wrapper {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }

  .placeholder-list {
    .placeholder-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}
</style>
