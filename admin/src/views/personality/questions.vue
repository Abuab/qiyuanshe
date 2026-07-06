<template>
  <div class="question-page">
    <div class="page-header">
      <h2 class="page-title">题目管理</h2>
      <el-button type="primary" @click="openCreate">新增题目</el-button>
    </div>

    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" size="default">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="搜索题目文本" clearable @clear="reload" @keyup.enter="reload" style="width:200px" />
        </el-form-item>
        <el-form-item label="维度">
          <el-select v-model="filters.dimensionId" placeholder="全部维度" clearable @change="reload" style="width:150px">
            <el-option v-for="d in dimensions" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.isEnabled" placeholder="全部" clearable @change="reload" style="width:100px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="reload">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="batch-bar" v-if="selectedIds.length > 0">
      <span>已选 {{ selectedIds.length }} 项</span>
      <el-button size="small" @click="batchEnable(1)">批量启用</el-button>
      <el-button size="small" @click="batchEnable(0)">批量禁用</el-button>
      <el-button size="small" type="danger" @click="batchDelete">批量删除</el-button>
    </div>

    <el-card class="table-card" shadow="never">
      <el-table :data="list" v-loading="loading" @selection-change="onSelectionChange" stripe style="width:100%">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="sort" label="排序" width="70" align="center" />
        <el-table-column prop="content" label="题目文本" min-width="240" show-overflow-tooltip />
        <el-table-column label="所属维度" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.dimension" size="small">{{ row.dimension.name }}</el-tag>
            <span v-else style="color:#f56c6c">维度缺失</span>
          </template>
        </el-table-column>
        <el-table-column label="选项方向" min-width="220">
          <template #default="{ row }">
            <div v-for="opt in row.options" :key="opt.id" class="opt-line">
              <el-tag size="small" type="info">{{ opt.optionLabel }}</el-tag>
              <span class="opt-text">{{ opt.content }}</span>
              <el-tag size="small" type="success">+{{ opt.score }} {{ opt.directionKey }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch :model-value="row.isEnabled === 1" size="small" @change="toggleEnabled(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="primary" size="small" @click="moveUp(row)">↑</el-button>
            <el-button link type="primary" size="small" @click="moveDown(row)">↓</el-button>
            <el-popconfirm title="确认删除该题目？" @confirm="handleDelete(row)">
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

    <!-- 题目编辑 -->
    <el-dialog
      :title="editForm.id ? '编辑题目' : '新增题目'"
      v-model="editVisible"
      width="640px"
      destroy-on-close
    >
      <el-form :model="editForm" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="题目文本" prop="content">
          <el-input v-model="editForm.content" type="textarea" :rows="2" placeholder="请输入题目文本" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="所属维度" prop="dimensionId">
          <el-select v-model="editForm.dimensionId" placeholder="请选择维度" style="width:100%" @change="onDimensionChange">
            <el-option v-for="d in enabledDimensions" :key="d.id" :label="`${d.name}（${d.directionAKey}/${d.directionBKey}）`" :value="d.id" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">选项配置（两个选项须指向该维度的不同方向）</el-divider>

        <div v-for="(opt, idx) in editForm.options" :key="idx" class="option-block">
          <div class="option-title">选项 {{ opt.optionLabel }}</div>
          <el-form-item
            :label="'选项文本'"
            :prop="`options.${idx}.content`"
            :rules="{ required: true, message: '选项文本不能为空', trigger: 'blur' }"
          >
            <el-input v-model="opt.content" placeholder="请输入选项文本" maxlength="500" />
          </el-form-item>
          <el-form-item
            :label="'指向方向'"
            :prop="`options.${idx}.directionKey`"
            :rules="{ required: true, message: '请选择方向', trigger: 'change' }"
          >
            <el-select v-model="opt.directionKey" placeholder="请选择方向" style="width:60%" :disabled="!currentDimension">
              <el-option
                v-for="dir in dimensionDirections"
                :key="dir.key"
                :label="`${dir.label}（${dir.key}）`"
                :value="dir.key"
              />
            </el-select>
            <span class="tip">加分值</span>
            <el-input-number v-model="opt.score" :min="0" :max="99" :controls="false" style="width:70px" />
          </el-form-item>
        </div>

        <el-divider />
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  personalityQuestionApi,
  personalityDimensionApi,
  type PersonalityQuestionItem,
  type PersonalityDimensionItem,
} from '../../api/personality'

// ========== 列表 ==========
const list = ref<PersonalityQuestionItem[]>([])
const loading = ref(false)
const filters = reactive({ keyword: '', dimensionId: undefined as number | undefined, isEnabled: undefined as number | undefined })
const pagination = reactive({ page: 1, limit: 20, total: 0 })
const selectedIds = ref<number[]>([])

const loadList = async () => {
  loading.value = true
  try {
    const res = await personalityQuestionApi.getList({
      page: pagination.page,
      limit: pagination.limit,
      keyword: filters.keyword || undefined,
      dimensionId: filters.dimensionId,
      isEnabled: filters.isEnabled,
    })
    if (res.success && res.data) {
      list.value = res.data.items || []
      pagination.total = res.data.total || 0
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
}
const reload = () => { pagination.page = 1; loadList() }

// ========== 维度 ==========
const dimensions = ref<PersonalityDimensionItem[]>([])
const enabledDimensions = computed(() => dimensions.value.filter(d => d.isEnabled === 1))
const loadDimensions = async () => {
  try {
    const res = await personalityDimensionApi.list()
    if (res.success && res.data) dimensions.value = res.data
  } catch { /* ignore */ }
}

const onSelectionChange = (rows: PersonalityQuestionItem[]) => {
  selectedIds.value = rows.map(r => r.id)
}

// ========== 编辑 ==========
const editVisible = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const editForm = reactive({
  id: 0,
  content: '',
  dimensionId: undefined as number | undefined,
  sort: 1,
  isEnabled: 1,
  options: [
    { optionLabel: 'A', content: '', directionKey: '', score: 1 },
    { optionLabel: 'B', content: '', directionKey: '', score: 1 },
  ],
})

const rules: FormRules = {
  content: [{ required: true, message: '请输入题目文本', trigger: 'blur' }],
  dimensionId: [{ required: true, message: '请选择所属维度', trigger: 'change' }],
  sort: [{ required: true, message: '请输入排序权重', trigger: 'blur' }],
}

const currentDimension = computed(() => dimensions.value.find(d => d.id === editForm.dimensionId) || null)
const dimensionDirections = computed(() => {
  const d = currentDimension.value
  if (!d) return []
  return [
    { key: d.directionAKey, label: d.directionALabel },
    { key: d.directionBKey, label: d.directionBLabel },
  ]
})

const onDimensionChange = () => {
  // 维度变化后，默认两个选项分别指向两个方向，避免残留旧维度方向
  const dirs = dimensionDirections.value
  if (dirs.length === 2) {
    editForm.options[0].directionKey = dirs[0].key
    editForm.options[1].directionKey = dirs[1].key
  } else {
    editForm.options[0].directionKey = ''
    editForm.options[1].directionKey = ''
  }
}

const resetForm = () => {
  editForm.id = 0
  editForm.content = ''
  editForm.dimensionId = undefined
  editForm.sort = 1
  editForm.isEnabled = 1
  editForm.options = [
    { optionLabel: 'A', content: '', directionKey: '', score: 1 },
    { optionLabel: 'B', content: '', directionKey: '', score: 1 },
  ]
}

const openCreate = () => {
  resetForm()
  editVisible.value = true
}

const openEdit = (row: PersonalityQuestionItem) => {
  editForm.id = row.id
  editForm.content = row.content
  editForm.dimensionId = row.dimensionId
  editForm.sort = row.sort
  editForm.isEnabled = row.isEnabled
  const sorted = [...(row.options || [])]
  editForm.options = [
    {
      optionLabel: sorted[0]?.optionLabel || 'A',
      content: sorted[0]?.content || '',
      directionKey: sorted[0]?.directionKey || '',
      score: sorted[0]?.score ?? 1,
    },
    {
      optionLabel: sorted[1]?.optionLabel || 'B',
      content: sorted[1]?.content || '',
      directionKey: sorted[1]?.directionKey || '',
      score: sorted[1]?.score ?? 1,
    },
  ]
  editVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const [a, b] = editForm.options
  if (!a.directionKey || !b.directionKey) {
    ElMessage.error('两个选项都必须指向一个方向')
    return
  }
  if (a.directionKey === b.directionKey) {
    ElMessage.error('两个选项必须分别指向该维度的两个不同方向')
    return
  }
  saving.value = true
  try {
    const payload = {
      content: editForm.content.trim(),
      dimensionId: editForm.dimensionId as number,
      sort: editForm.sort,
      isEnabled: editForm.isEnabled,
      options: editForm.options.map(o => ({
        optionLabel: o.optionLabel,
        content: o.content.trim(),
        directionKey: o.directionKey,
        score: o.score,
      })),
    }
    if (editForm.id) {
      await personalityQuestionApi.update(editForm.id, payload)
      ElMessage.success('更新成功')
    } else {
      await personalityQuestionApi.create(payload)
      ElMessage.success('新增成功')
    }
    editVisible.value = false
    loadList()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally { saving.value = false }
}

const toggleEnabled = async (row: PersonalityQuestionItem) => {
  const next = row.isEnabled === 1 ? 0 : 1
  try {
    await personalityQuestionApi.setStatus(row.id, next)
    row.isEnabled = next
  } catch { /* ignore */ }
}

const handleDelete = async (row: PersonalityQuestionItem) => {
  try {
    await personalityQuestionApi.remove(row.id)
    ElMessage.success('删除成功')
    loadList()
  } catch { /* ignore */ }
}

const moveUp = async (row: PersonalityQuestionItem) => {
  const newSort = Math.max(1, row.sort - 1)
  await personalityQuestionApi.reorder(row.id, newSort)
  loadList()
}
const moveDown = async (row: PersonalityQuestionItem) => {
  await personalityQuestionApi.reorder(row.id, row.sort + 1)
  loadList()
}

const batchEnable = async (isEnabled: number) => {
  if (!selectedIds.value.length) return
  await personalityQuestionApi.batchSetStatus(selectedIds.value, isEnabled)
  ElMessage.success('批量操作成功')
  loadList()
}
const batchDelete = async () => {
  if (!selectedIds.value.length) return
  await personalityQuestionApi.batchRemove(selectedIds.value)
  ElMessage.success('批量删除成功')
  selectedIds.value = []
  loadList()
}

onMounted(() => {
  loadDimensions()
  loadList()
})
</script>

<style lang="scss" scoped>
.question-page { padding: 20px; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title { margin: 0; font-size: 20px; font-weight: 600; }
.filter-card { margin-bottom: 12px; }
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
.opt-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 2px 0;
  .opt-text { flex: 1; font-size: 13px; color: #606266; }
}
.option-block {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px 12px 0;
  margin-bottom: 12px;
  .option-title { font-weight: 600; margin-bottom: 8px; color: #303133; }
}
.tip { margin: 0 8px; color: #909399; font-size: 12px; }
</style>
