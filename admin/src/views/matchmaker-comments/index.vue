<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">红娘评语管理</h2>
    </div>

    <el-card class="content-card">
      <div class="toolbar">
        <el-button type="primary" @click="showDialog = true">新增评语</el-button>
      </div>

      <el-table :data="list" border stripe v-loading="loading" style="width: 100%" row-key="id">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="红娘" width="100">
          <template #default="{ row }">
            {{ row.matchmaker?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="userId" label="会员ID" width="80" />
        <el-table-column prop="content" label="评语内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="rating" label="评分" width="80">
          <template #default="{ row }">
            <span v-for="i in 5" :key="i" :style="{ color: i <= row.rating ? '#f5a623' : '#ddd' }">★</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ row.createdAt?.slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
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

    <el-dialog v-model="showDialog" title="新增评语" width="480px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="红娘ID"><el-input v-model="form.matchmakerId" placeholder="红娘ID" /></el-form-item>
        <el-form-item label="会员ID"><el-input v-model="form.userId" placeholder="会员ID" /></el-form-item>
        <el-form-item label="评语"><el-input v-model="form.content" type="textarea" :rows="4" placeholder="评语内容" /></el-form-item>
        <el-form-item label="评分">
          <el-rate v-model="form.rating" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">确认</el-button>
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
const form = reactive({ matchmakerId: '', userId: '', content: '', rating: 5 })
const pagination = reactive({ page: 1, limit: 20, total: 0 })

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  try {
    const res = await adminSystem.getMatchmakerComments(pagination.page, pagination.limit)
    list.value = (res.data as any)?.list || []
    pagination.total = (res.data as any)?.total || 0
  } catch (e) { console.error(e) }
  loading.value = false
}

async function handleCreate() {
  try {
    const res = await adminSystem.createMatchmakerComment({
      matchmakerId: +form.matchmakerId,
      userId: +form.userId,
      content: form.content,
      rating: form.rating,
    })
    if (res.success) {
      ElMessage.success('创建成功')
      showDialog.value = false
      Object.assign(form, { matchmakerId: '', userId: '', content: '', rating: 5 })
      fetchList()
    }
  } catch (e) { ElMessage.error('创建失败') }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
    await adminSystem.deleteMatchmakerComment(id)
    // 先从本地列表移除
    list.value = list.value.filter((r: any) => r.id !== id)
    pagination.total = Math.max(0, pagination.total - 1)
    ElMessage.success('已删除')
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
