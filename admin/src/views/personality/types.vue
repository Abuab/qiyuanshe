<template>
  <div class="type-page">
    <div class="page-header">
      <h2 class="page-title">人格类型定义</h2>
      <el-button type="primary" @click="openCreate">新增类型</el-button>
    </div>

    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" size="default">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="搜索类型名称" clearable @clear="reload" @keyup.enter="reload" style="width:200px" />
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

    <el-card class="table-card" shadow="never">
      <el-table :data="list" v-loading="loading" stripe style="width:100%">
        <el-table-column prop="sort" label="排序" width="70" align="center" />
        <el-table-column label="类型" min-width="160">
          <template #default="{ row }">
            <el-tag size="small">{{ row.code }}</el-tag>
            <strong style="margin:0 6px">{{ row.name }}</strong>
            <span v-if="row.nickname" style="color:#909399">「{{ row.nickname }}」</span>
          </template>
        </el-table-column>
        <el-table-column prop="summary" label="一句话描述" min-width="220" show-overflow-tooltip />
        <el-table-column label="雷达基准值" width="200" align="center">
          <template #default="{ row }">
            <span class="radar-cell">
              能{{ row.radarEnergy }} / 息{{ row.radarInfo }} / 决{{ row.radarDecision }} / 活{{ row.radarLifestyle }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="适配推荐" min-width="120">
          <template #default="{ row }">
            <el-tag v-for="c in (row.matchTypes || [])" :key="c" size="small" type="success" style="margin:2px">{{ c }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch :model-value="row.isEnabled === 1" size="small" @change="toggleEnabled(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-popconfirm title="确认删除该类型？" @confirm="handleDelete(row)">
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

    <el-dialog
      :title="editForm.id ? '编辑人格类型' : '新增人格类型'"
      v-model="editVisible"
      width="680px"
      destroy-on-close
    >
      <el-form :model="editForm" :rules="rules" ref="formRef" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="类型编码" prop="code">
              <el-input v-model="editForm.code" placeholder="如 INTJ" maxlength="10" :disabled="!!editForm.id" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="中文名称" prop="name">
              <el-input v-model="editForm.name" placeholder="如 建筑师" maxlength="50" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="花名">
          <el-input v-model="editForm.nickname" placeholder="花名（可选）" maxlength="50" />
        </el-form-item>
        <el-form-item label="一句话描述">
          <el-input v-model="editForm.summary" placeholder="一句话描述（可选）" maxlength="255" />
        </el-form-item>
        <el-form-item label="详细性格解析">
          <el-input v-model="editForm.description" type="textarea" :rows="4" placeholder="详细性格解析文案（可选）" />
        </el-form-item>

        <el-divider content-position="left">四维度雷达图基准值（0-100）</el-divider>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="能量来源" prop="radarEnergy">
              <el-slider v-model="editForm.radarEnergy" :min="0" :max="100" show-input />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="信息获取" prop="radarInfo">
              <el-slider v-model="editForm.radarInfo" :min="0" :max="100" show-input />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="决策方式" prop="radarDecision">
              <el-slider v-model="editForm.radarDecision" :min="0" :max="100" show-input />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生活方式" prop="radarLifestyle">
              <el-slider v-model="editForm.radarLifestyle" :min="0" :max="100" show-input />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider />
        <el-form-item label="适配推荐类型">
          <el-select v-model="editForm.matchTypes" multiple filterable placeholder="选择最匹配的类型（可多选）" style="width:100%">
            <el-option
              v-for="t in typeOptions"
              :key="t.code"
              :label="`${t.code} ${t.name}`"
              :value="t.code"
              :disabled="t.code === editForm.code"
            />
          </el-select>
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
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  personalityTypeApi,
  type PersonalityTypeItem,
  type PersonalityTypeOption,
} from '../../api/personality'

const list = ref<PersonalityTypeItem[]>([])
const loading = ref(false)
const filters = reactive({ keyword: '', isEnabled: undefined as number | undefined })
const pagination = reactive({ page: 1, limit: 20, total: 0 })

const loadList = async () => {
  loading.value = true
  try {
    const res = await personalityTypeApi.getList({
      page: pagination.page,
      limit: pagination.limit,
      keyword: filters.keyword || undefined,
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

const typeOptions = ref<PersonalityTypeOption[]>([])
const loadOptions = async () => {
  try {
    const res = await personalityTypeApi.options()
    if (res.success && res.data) typeOptions.value = res.data
  } catch { /* ignore */ }
}

const editVisible = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const editForm = reactive({
  id: 0,
  code: '',
  name: '',
  nickname: '',
  summary: '',
  description: '',
  radarEnergy: 50,
  radarInfo: 50,
  radarDecision: 50,
  radarLifestyle: 50,
  matchTypes: [] as string[],
  sort: 1,
  isEnabled: 1,
})

const radarRule = [{ type: 'number' as const, min: 0, max: 100, message: '基准值需在0-100之间', trigger: 'change' }]
const rules: FormRules = {
  code: [{ required: true, message: '请输入类型编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入中文名称', trigger: 'blur' }],
  sort: [{ required: true, message: '请输入排序权重', trigger: 'blur' }],
  radarEnergy: radarRule,
  radarInfo: radarRule,
  radarDecision: radarRule,
  radarLifestyle: radarRule,
}

const resetForm = () => {
  Object.assign(editForm, {
    id: 0, code: '', name: '', nickname: '', summary: '', description: '',
    radarEnergy: 50, radarInfo: 50, radarDecision: 50, radarLifestyle: 50,
    matchTypes: [], sort: 1, isEnabled: 1,
  })
}

const openCreate = () => {
  resetForm()
  editVisible.value = true
}

const openEdit = (row: PersonalityTypeItem) => {
  Object.assign(editForm, {
    id: row.id,
    code: row.code,
    name: row.name,
    nickname: row.nickname || '',
    summary: row.summary || '',
    description: row.description || '',
    radarEnergy: row.radarEnergy,
    radarInfo: row.radarInfo,
    radarDecision: row.radarDecision,
    radarLifestyle: row.radarLifestyle,
    matchTypes: [...(row.matchTypes || [])],
    sort: row.sort,
    isEnabled: row.isEnabled,
  })
  editVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const payload = {
      code: editForm.code.trim().toUpperCase(),
      name: editForm.name.trim(),
      nickname: editForm.nickname.trim(),
      summary: editForm.summary.trim(),
      description: editForm.description.trim(),
      radarEnergy: editForm.radarEnergy,
      radarInfo: editForm.radarInfo,
      radarDecision: editForm.radarDecision,
      radarLifestyle: editForm.radarLifestyle,
      matchTypes: editForm.matchTypes,
      sort: editForm.sort,
      isEnabled: editForm.isEnabled,
    }
    if (editForm.id) {
      await personalityTypeApi.update(editForm.id, payload)
      ElMessage.success('更新成功')
    } else {
      await personalityTypeApi.create(payload)
      ElMessage.success('新增成功')
    }
    editVisible.value = false
    loadList()
    loadOptions()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally { saving.value = false }
}

const toggleEnabled = async (row: PersonalityTypeItem) => {
  const next = row.isEnabled === 1 ? 0 : 1
  try {
    await personalityTypeApi.setStatus(row.id, next)
    row.isEnabled = next
  } catch { /* ignore */ }
}

const handleDelete = async (row: PersonalityTypeItem) => {
  try {
    await personalityTypeApi.remove(row.id)
    ElMessage.success('删除成功')
    loadList()
    loadOptions()
  } catch { /* ignore */ }
}

onMounted(() => {
  loadList()
  loadOptions()
})
</script>

<style lang="scss" scoped>
.type-page { padding: 20px; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title { margin: 0; font-size: 20px; font-weight: 600; }
.filter-card { margin-bottom: 12px; }
.table-card {
  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
.radar-cell { font-size: 12px; color: #606266; }
.tip { margin-left: 10px; color: #909399; font-size: 12px; }
</style>
