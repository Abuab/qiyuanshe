<template>
  <div class="vip-packages">
    <div class="page-header">
      <h2 class="page-title">会员套餐管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        创建套餐
      </el-button>
    </div>

    <div class="card">
      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm">
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 120px" @change="handleSearch">
              <el-option label="全部" :value="undefined" />
              <el-option label="上架" :value="1" />
              <el-option label="下架" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="套餐名称" min-width="140" />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">
            <span class="price-text">&yen;{{ row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="durationDays" label="时长(天)" width="90">
          <template #default="{ row }">
            {{ row.durationDays }}天
          </template>
        </el-table-column>
        <el-table-column label="每日置顶卡" width="100">
          <template #default="{ row }">
            {{ row.dailyTopCards }}张
          </template>
        </el-table-column>
        <el-table-column label="卡有效期" width="100">
          <template #default="{ row }">
            {{ row.topCardValidHours }}小时
          </template>
        </el-table-column>
        <el-table-column label="红线数" width="80">
          <template #default="{ row }">
            {{ row.redLineCount || 0 }}次
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="70" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-switch
              v-model="row.statusChecked"
              :active-value="1"
              :inactive-value="0"
              @change="handleToggleStatus(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑套餐' : '创建套餐'"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="130px"
      >
        <el-form-item label="套餐名称" prop="name">
          <el-input v-model="formData.name" placeholder="如：月度会员" maxlength="20" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <!-- 价格以「元」为单位输入，后端保存时自动 ×100 转为「分」存储 -->
            <el-form-item label="价格" prop="price">
              <el-input-number
                v-model="formData.price"
                :min="0"
                :precision="2"
                :step="1"
                placeholder="元"
                controls-position="right"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="会员时长" prop="durationDays">
              <el-input-number
                v-model="formData.durationDays"
                :min="1"
                :max="3650"
                placeholder="天"
                controls-position="right"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="每日置顶卡数">
              <el-input-number
                v-model="formData.dailyTopCards"
                :min="0"
                :max="99"
                controls-position="right"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="每张卡有效期">
              <el-input-number
                v-model="formData.topCardValidHours"
                :min="1"
                :max="720"
                controls-position="right"
                style="width:100%"
              />
              <span style="margin-left:4px;color:#909399">小时</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="赠送红线数">
              <el-input-number
                v-model="formData.redLineCount"
                :min="0"
                :max="999"
                controls-position="right"
                style="width:100%"
              />
              <span style="margin-left:4px;color:#909399">次（终身累计）</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序权重">
              <el-input-number
                v-model="formData.sortOrder"
                :min="0"
                :max="9999"
                placeholder="越大越靠前"
                controls-position="right"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="是否上架">
          <el-switch
            v-model="formData.statusChecked"
            :active-value="1"
            :inactive-value="0"
          />
        </el-form-item>
        <el-form-item label="文案描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="5"
            placeholder="套餐详细介绍..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="特性标签">
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            <el-tag
              v-for="(tag, idx) in formData.featuresArr"
              :key="idx"
              closable
              @close="removeFeature(idx)"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-if="featureInputVisible"
              ref="featureInputRef"
              v-model="featureInputValue"
              size="small"
              style="width:120px"
              @keyup.enter="addFeature"
              @blur="addFeature"
            />
            <el-button v-else size="small" @click="showFeatureInput">+ 添加</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { vipPackages, type VipPackage } from '../../api/vip'

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const featureInputRef = ref()
const featureInputVisible = ref(false)
const featureInputValue = ref('')

const filterForm = reactive({ status: undefined as number | undefined })

const pagination = reactive({ page: 1, limit: 20, total: 0 })
const tableData = ref<(VipPackage & { statusChecked: number })[]>([])

const rules: FormRules = {
  name: [{ required: true, message: '请输入套餐名称', trigger: 'blur' }],
  price: [
    { required: true, message: '请输入价格', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '价格必须大于0', trigger: 'blur' },
  ],
  durationDays: [
    { required: true, message: '请输入时长', trigger: 'blur' },
    { type: 'number', min: 1, message: '时长必须大于0', trigger: 'blur' },
  ],
}

const formData = reactive({
  name: '',
  price: 0,
  durationDays: 30,
  dailyTopCards: 0,
  topCardValidHours: 24,
  redLineCount: 0,
  sortOrder: 0,
  statusChecked: 1,
  description: '',
  featuresArr: [] as string[],
})

async function fetchList() {
  loading.value = true
  try {
    const res: any = await vipPackages.list(pagination.page, pagination.limit)
    const list: VipPackage[] = res.list || []
    tableData.value = list.map((item) => ({
      ...item,
      statusChecked: item.status,
    }))
    pagination.total = res.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

function handleReset() {
  filterForm.status = undefined
  pagination.page = 1
  fetchList()
}

function handleCreate() {
  editingId.value = null
  formData.name = ''
  formData.price = 0
  formData.durationDays = 30
  formData.dailyTopCards = 0
  formData.topCardValidHours = 24
  formData.redLineCount = 0
  formData.sortOrder = 0
  formData.statusChecked = 1
  formData.description = ''
  formData.featuresArr = []
  dialogVisible.value = true
}

function handleEdit(row: VipPackage & { statusChecked: number }) {
  editingId.value = row.id
  formData.name = row.name
  formData.price = row.price
  formData.durationDays = row.durationDays
  formData.dailyTopCards = row.dailyTopCards
  formData.topCardValidHours = row.topCardValidHours
  formData.redLineCount = row.redLineCount || 0
  formData.sortOrder = row.sortOrder
  formData.statusChecked = row.status
  formData.description = row.description || ''
  formData.featuresArr = row.features || []
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      const payload = {
        name: formData.name,
        price: formData.price,
        durationDays: formData.durationDays,
        dailyTopCards: formData.dailyTopCards,
        topCardValidHours: formData.topCardValidHours,
        redLineCount: formData.redLineCount,
        sortOrder: formData.sortOrder,
        status: formData.statusChecked,
        description: formData.description,
        features: formData.featuresArr,
      }
      if (editingId.value) {
        await vipPackages.update(editingId.value, payload)
        ElMessage.success('更新成功')
      } else {
        await vipPackages.create(payload)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      fetchList()
    } finally {
      submitLoading.value = false
    }
  })
}

async function handleToggleStatus(row: VipPackage & { statusChecked: number }) {
  try {
    await vipPackages.toggleStatus(row.id)
    ElMessage.success(row.statusChecked === 1 ? '已上架' : '已下架')
  } catch {
    row.statusChecked = row.statusChecked === 1 ? 0 : 1 // 回滚
  }
}

async function handleDelete(row: VipPackage) {
  try {
    await ElMessageBox.confirm(`确定删除套餐"${row.name}"？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    await vipPackages.remove(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch {
    // 取消
  }
}

// 特性标签操作
function showFeatureInput() {
  featureInputVisible.value = true
  nextTick(() => featureInputRef.value?.focus())
}

function addFeature() {
  const val = featureInputValue.value.trim()
  if (val && !formData.featuresArr.includes(val)) {
    formData.featuresArr.push(val)
  }
  featureInputValue.value = ''
  featureInputVisible.value = false
}

function removeFeature(idx: number) {
  formData.featuresArr.splice(idx, 1)
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.vip-packages {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.filter-bar {
  margin-bottom: 16px;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.price-text {
  color: #f56c6c;
  font-weight: 600;
}
</style>
