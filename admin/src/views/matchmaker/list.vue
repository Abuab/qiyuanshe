<template>
  <div class="matchmaker-list">
    <div class="page-header">
      <h2 class="page-title">红娘列表</h2>
      <div class="header-actions">
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          添加红娘
        </el-button>
      </div>
    </div>

    <div class="card">
      <el-table
        ref="tableRef"
        :data="tableData"
        v-loading="loading"
        row-key="id"
        :default-sort="{ prop: 'sortOrder', order: 'ascending' }"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="头像" width="100">
          <template #default="{ row }">
            <el-avatar :size="60" :src="row.avatar" />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" min-width="120" />
        <el-table-column prop="title" label="头衔" min-width="150">
          <template #default="{ row }">
            {{ row.title || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="wechat" label="微信号" width="150">
          <template #default="{ row }">
            {{ row.wechat || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="电话" width="120">
          <template #default="{ row }">
            {{ row.phone || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success" size="small">启用</el-tag>
            <el-tag v-else type="info" size="small">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="100" sortable>
          <template #default="{ row }">
            <span class="sort-order">{{ row.sortOrder || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <el-table-column label="排序操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                :icon="Top"
                size="small"
                @click="handleMoveUp(row)"
                :disabled="isFirst(row)"
              />
              <el-button
                :icon="Bottom"
                size="small"
                @click="handleMoveDown(row)"
                :disabled="isLast(row)"
              />
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="deleteDialogVisible" title="删除确认" width="400px">
      <p>确定要删除红娘 <strong>{{ currentMatchmaker?.name }}</strong> 吗？此操作不可逆。</p>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Top, Bottom } from '@element-plus/icons-vue'
import { adminMatchmaker } from '../../api'
import type { Matchmaker } from '../../api/matchmaker'

const router = useRouter()

const loading = ref(false)
const tableData = ref<Matchmaker[]>([])
const deleteDialogVisible = ref(false)
const currentMatchmaker = ref<Matchmaker | null>(null)

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const res = await adminMatchmaker.list({ page: 1, limit: 100 })
    if (res.success && res.data) {
      tableData.value = (res.data.list || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取红娘列表失败')
  } finally {
    loading.value = false
  }
}

function handleCreate() {
  router.push('/matchmaker/edit')
}

function handleEdit(row: Matchmaker) {
  router.push(`/matchmaker/edit/${row.id}`)
}

function handleDelete(row: Matchmaker) {
  currentMatchmaker.value = row
  deleteDialogVisible.value = true
}

async function confirmDelete() {
  if (!currentMatchmaker.value) return

  try {
    await adminMatchmaker.delete(currentMatchmaker.value.id)
    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error(error)
    ElMessage.error('删除失败')
  }
}

function isFirst(row: Matchmaker) {
  const index = tableData.value.findIndex((item) => item.id === row.id)
  return index === 0
}

function isLast(row: Matchmaker) {
  const index = tableData.value.findIndex((item) => item.id === row.id)
  return index === tableData.value.length - 1
}

async function handleMoveUp(row: Matchmaker) {
  const index = tableData.value.findIndex((item) => item.id === row.id)
  if (index <= 0) return

  const current = tableData.value[index]
  const prev = tableData.value[index - 1]

  try {
    // 采用递减方式确保排序有效：当前项设为 prev.sortOrder - 1
    const newSortOrder = (prev.sortOrder || 0) - 1
    await adminMatchmaker.sort(current.id, newSortOrder)
    ElMessage.success('排序已更新')
    fetchData()
  } catch (error) {
    console.error(error)
    ElMessage.error('排序更新失败')
  }
}

async function handleMoveDown(row: Matchmaker) {
  const index = tableData.value.findIndex((item) => item.id === row.id)
  if (index >= tableData.value.length - 1) return

  const current = tableData.value[index]
  const next = tableData.value[index + 1]

  try {
    // 采用递增方式确保排序有效：当前项设为 next.sortOrder + 1
    const newSortOrder = (next.sortOrder || 0) + 1
    await adminMatchmaker.sort(current.id, newSortOrder)
    ElMessage.success('排序已更新')
    fetchData()
  } catch (error) {
    console.error(error)
    ElMessage.error('排序更新失败')
  }
}
</script>

<style lang="scss" scoped>
.matchmaker-list {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  .page-title {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
  }
}

.card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
}

.sort-order {
  font-weight: bold;
  color: #409eff;
}
</style>
