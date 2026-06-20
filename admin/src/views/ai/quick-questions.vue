<template>
  <div class="quick-question-page">
    <div class="page-header">
      <h2 class="page-title">快捷问题管理</h2>
      <div class="header-actions">
        <el-button @click="showCategoryDialog = true">管理分类</el-button>
        <el-button type="primary" @click="openCreate">新增问题</el-button>
      </div>
    </div>

    <!-- 搜索过滤栏 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" size="default">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="搜索问题内容" clearable @clear="loadList" @keyup.enter="loadList" style="width:200px" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.categoryId" placeholder="全部分类" clearable @change="loadList" style="width:140px">
            <el-option label="未分类" :value="0" />
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.isEnabled" placeholder="全部" clearable @change="loadList" style="width:100px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 批量操作栏 -->
    <div class="batch-bar" v-if="selectedIds.length > 0">
      <span>已选 {{ selectedIds.length }} 项</span>
      <el-button size="small" @click="batchEnable(1)">批量启用</el-button>
      <el-button size="small" @click="batchEnable(0)">批量禁用</el-button>
      <el-button size="small" type="danger" @click="batchDelete">批量删除</el-button>
    </div>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="list"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        stripe
        style="width:100%"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="content" label="问题内容" min-width="180">
          <template #default="{ row }">
            <el-tag v-if="row.category" size="small" type="info" style="margin-right:6px">{{ row.category.name }}</el-tag>
            {{ row.content }}
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.isEnabled === 1"
              @change="toggleEnabled(row)"
              size="small"
            />
          </template>
        </el-table-column>
        <el-table-column prop="clickCount" label="点击次数" width="90" align="center" />
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="primary" size="small" @click="moveUp(row)">↑</el-button>
            <el-button link type="primary" size="small" @click="moveDown(row)">↓</el-button>
            <el-popconfirm title="确认删除？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          layout="total, prev, pager, next"
          @current-change="loadList"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      :title="editForm.id ? '编辑快捷问题' : '新增快捷问题'"
      v-model="editVisible"
      width="480px"
      destroy-on-close
    >
      <el-form :model="editForm" :rules="formRules" ref="editFormRef" label-width="80px">
        <el-form-item label="问题内容" prop="content">
          <el-input
            v-model="editForm.content"
            placeholder="请输入问题，2-20字"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="所属分类">
          <el-select v-model="editForm.categoryId" placeholder="请选择分类（可选）" clearable style="width:100%">
            <el-option v-for="cat in enabledCategories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序权重">
          <el-input-number v-model="editForm.sort" :min="0" :max="999" controls-position="right" style="width:100%" />
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

    <!-- 分类管理弹窗 -->
    <el-dialog
      title="分类管理"
      v-model="showCategoryDialog"
      width="500px"
      destroy-on-close
    >
      <div style="margin-bottom:12px;display:flex;gap:8px">
        <el-input v-model="newCatName" placeholder="分类名称，最多10字" maxlength="10" style="flex:1" @keyup.enter="addCategory" />
        <el-button type="primary" @click="addCategory" :disabled="!newCatName.trim()">新增</el-button>
      </div>
      <el-table :data="categories" style="width:100%" max-height="350">
        <el-table-column prop="name" label="分类名称" />
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch :model-value="row.isEnabled === 1" size="small" @change="toggleCatEnabled(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="editCat(row)">编辑</el-button>
            <el-popconfirm title="删除分类将清空关联问题的分类，确认？" @confirm="deleteCat(row)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="showCategoryDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 分类编辑小弹窗 -->
    <el-dialog
      title="编辑分类"
      v-model="catEditVisible"
      width="380px"
      destroy-on-close
    >
      <el-form :model="catEditForm" label-width="80px">
        <el-form-item label="分类名称">
          <el-input v-model="catEditForm.name" maxlength="10" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="catEditForm.sort" :min="0" :max="999" controls-position="right" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catEditVisible = false">取消</el-button>
        <el-button type="primary" :loading="catSaving" @click="saveCatEdit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { adminQuickQuestion, type QuickQuestionItem, type QuickQuestionCategoryItem } from '../../api/quick-question'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

// ========== 列表数据 ==========
const list = ref<QuickQuestionItem[]>([])
const loading = ref(false)
const filters = reactive({ keyword: '', categoryId: undefined as number | undefined, isEnabled: undefined as number | undefined })
const pagination = reactive({ page: 1, limit: 20, total: 0 })
const selectedIds = ref<number[]>([])

const loadList = async () => {
  loading.value = true
  try {
    const res = await adminQuickQuestion.getList({
      page: pagination.page,
      limit: pagination.limit,
      keyword: filters.keyword || undefined,
      categoryId: filters.categoryId,
      isEnabled: filters.isEnabled,
    })
    if (res.success && res.data) {
      list.value = res.data.items || []
      pagination.total = res.data.total || 0
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

// ========== 分类数据 ==========
const categories = ref<QuickQuestionCategoryItem[]>([])
const loadCategories = async () => {
  try {
    const res = await adminQuickQuestion.getCategories()
    if (res.success && res.data) {
      categories.value = res.data
    }
  } catch { /* ignore */ }
}
const enabledCategories = computed(() => categories.value.filter(c => c.isEnabled === 1))

// ========== 选择 ==========
const handleSelectionChange = (rows: QuickQuestionItem[]) => {
  selectedIds.value = rows.map(r => r.id)
}

// ========== CRUD 弹窗 ==========
const editVisible = ref(false)
const saving = ref(false)
const editFormRef = ref<FormInstance>()
const editForm = reactive({
  id: 0,
  content: '',
  categoryId: null as number | null,
  sort: 0,
  isEnabled: 1,
})

const formRules: FormRules = {
  content: [
    { required: true, message: '请输入问题内容', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 字之间', trigger: 'blur' },
  ],
}

const openCreate = () => {
  editForm.id = 0
  editForm.content = ''
  editForm.categoryId = null
  editForm.sort = 0
  editForm.isEnabled = 1
  editVisible.value = true
}

const openEdit = (row: QuickQuestionItem) => {
  editForm.id = row.id
  editForm.content = row.content
  editForm.categoryId = row.categoryId
  editForm.sort = row.sort
  editForm.isEnabled = row.isEnabled
  editVisible.value = true
}

const handleSave = async () => {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    if (editForm.id) {
      await adminQuickQuestion.update(editForm.id, {
        content: editForm.content,
        categoryId: editForm.categoryId,
        sort: editForm.sort,
        isEnabled: editForm.isEnabled,
      })
      ElMessage.success('更新成功')
    } else {
      await adminQuickQuestion.create({
        content: editForm.content,
        categoryId: editForm.categoryId,
        sort: editForm.sort,
        isEnabled: editForm.isEnabled,
      })
      ElMessage.success('新增成功')
    }
    editVisible.value = false
    loadList()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally { saving.value = false }
}

const handleDelete = async (row: QuickQuestionItem) => {
  try {
    await adminQuickQuestion.remove(row.id)
    ElMessage.success('删除成功')
    loadList()
  } catch { /* ignore */ }
}

const toggleEnabled = async (row: QuickQuestionItem) => {
  try {
    await adminQuickQuestion.update(row.id, { isEnabled: row.isEnabled === 1 ? 0 : 1 })
    row.isEnabled = row.isEnabled === 1 ? 0 : 1
  } catch { /* ignore */ }
}

// ========== 排序 ==========
const moveUp = async (row: QuickQuestionItem) => {
  const newSort = Math.max(0, row.sort - 1)
  try {
    await adminQuickQuestion.reorder(row.id, newSort)
    row.sort = newSort
    ElMessage.success('排序已调整')
    loadList()
  } catch { /* ignore */ }
}

const moveDown = async (row: QuickQuestionItem) => {
  const newSort = row.sort + 1
  try {
    await adminQuickQuestion.reorder(row.id, newSort)
    row.sort = newSort
    ElMessage.success('排序已调整')
    loadList()
  } catch { /* ignore */ }
}

// ========== 批量操作 ==========
const batchEnable = async (isEnabled: number) => {
  if (selectedIds.value.length === 0) return
  try {
    await adminQuickQuestion.batchSetStatus(selectedIds.value, isEnabled)
    ElMessage.success(isEnabled ? '已批量启用' : '已批量禁用')
    loadList()
  } catch { /* ignore */ }
}

const batchDelete = async () => {
  if (selectedIds.value.length === 0) return
  try {
    await adminQuickQuestion.batchRemove(selectedIds.value)
    ElMessage.success('批量删除成功')
    selectedIds.value = []
    loadList()
  } catch { /* ignore */ }
}

// ========== 分类管理 ==========
const showCategoryDialog = ref(false)
const newCatName = ref('')
const catEditVisible = ref(false)
const catSaving = ref(false)
const catEditForm = reactive({ id: 0, name: '', sort: 0, isEnabled: 1 })

const addCategory = async () => {
  if (!newCatName.value.trim()) return
  try {
    await adminQuickQuestion.createCategory({ name: newCatName.value.trim() })
    ElMessage.success('分类新增成功')
    newCatName.value = ''
    loadCategories()
  } catch { /* ignore */ }
}

const editCat = (row: QuickQuestionCategoryItem) => {
  catEditForm.id = row.id
  catEditForm.name = row.name
  catEditForm.sort = row.sort
  catEditForm.isEnabled = row.isEnabled
  catEditVisible.value = true
}

const saveCatEdit = async () => {
  catSaving.value = true
  try {
    await adminQuickQuestion.updateCategory(catEditForm.id, {
      name: catEditForm.name,
      sort: catEditForm.sort,
      isEnabled: catEditForm.isEnabled,
    })
    ElMessage.success('分类更新成功')
    catEditVisible.value = false
    loadCategories()
  } catch { /* ignore */ }
  finally { catSaving.value = false }
}

const toggleCatEnabled = async (row: QuickQuestionCategoryItem) => {
  try {
    await adminQuickQuestion.updateCategory(row.id, { isEnabled: row.isEnabled === 1 ? 0 : 1 })
    row.isEnabled = row.isEnabled === 1 ? 0 : 1
  } catch { /* ignore */ }
}

const deleteCat = async (row: QuickQuestionCategoryItem) => {
  try {
    await adminQuickQuestion.deleteCategory(row.id)
    ElMessage.success('分类已删除')
    loadCategories()
    loadList()
  } catch { /* ignore */ }
}

onMounted(() => {
  loadList()
  loadCategories()
})
</script>

<style lang="scss" scoped>
.quick-question-page {
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
.header-actions {
  display: flex;
  gap: 8px;
}
.filter-card {
  margin-bottom: 12px;
}
.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f0f7ff;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #606266;
}
.table-card {
  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
