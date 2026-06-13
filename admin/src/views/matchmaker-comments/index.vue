<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">红娘评语管理</h2>
    </div>

    <el-card class="content-card">
      <div class="toolbar">
        <el-button type="primary" @click="openCreateDialog">新增评语</el-button>
      </div>

      <el-table :data="list" border stripe v-loading="loading" style="width: 100%" row-key="id">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="红娘" width="120">
          <template #default="{ row }">
            {{ row.matchmaker?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="会员" width="160">
          <template #default="{ row }">
            {{ getUserName(row.userId) }}
          </template>
        </el-table-column>
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

    <el-dialog v-model="showDialog" title="新增评语" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="红娘" required>
          <el-select
            v-model="form.matchmakerId"
            placeholder="请选择红娘"
            filterable
            style="width:100%"
          >
            <el-option
              v-for="m in matchmakerOptions"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="会员" required>
          <el-select
            v-model="form.userId"
            placeholder="请选择会员"
            filterable
            remote
            :remote-method="searchUsers"
            :loading="userSearchLoading"
            style="width:100%"
          >
            <el-option
              v-for="u in userOptions"
              :key="u.id"
              :label="`${u.nickname} (ID:${u.id})`"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="评语" required>
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="评语内容" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="评分">
          <el-rate v-model="form.rating" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :disabled="!form.matchmakerId || !form.userId || !form.content.trim()">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminSystem } from '../../api'
import { adminMatchmaker } from '../../api/matchmaker'
import { adminUsers } from '../../api'

interface UserOption { id: number; nickname: string }
interface MatchmakerOption { id: number; name: string }

const loading = ref(false)
const list = ref<any[]>([])
const showDialog = ref(false)
const form = reactive({ matchmakerId: null as number | null, userId: null as number | null, content: '', rating: 5 })
const pagination = reactive({ page: 1, limit: 20, total: 0 })

const matchmakerOptions = ref<MatchmakerOption[]>([])
const userOptions = ref<UserOption[]>([])
const userSearchLoading = ref(false)

// 缓存已加载的用户名称
const userNameMap = new Map<number, string>()

onMounted(() => {
  fetchList()
  loadMatchmakers()
})

async function fetchList() {
  loading.value = true
  try {
    const res = await adminSystem.getMatchmakerComments(pagination.page, pagination.limit)
    list.value = (res.data as any)?.list || []
    pagination.total = (res.data as any)?.total || 0
    // 缓存列表中出现的用户名称
    for (const item of list.value) {
      if (!userNameMap.has(item.userId)) {
        userNameMap.set(item.userId, `用户${item.userId}`)
      }
    }
  } catch (e) { console.error(e) }
  loading.value = false
}

async function loadMatchmakers() {
  try {
    const res = await adminMatchmaker.list({ limit: 100 })
    if (res.success && res.data) {
      matchmakerOptions.value = (res.data as any).list || []
    }
  } catch (e) { console.error(e) }
}

async function searchUsers(query: string) {
  if (!query || query.trim().length < 2) {
    userOptions.value = []
    return
  }
  userSearchLoading.value = true
  try {
    const res = await adminUsers.list({ keyword: query, limit: 20, page: 1 } as any)
    if (res.success && res.data) {
      const users = (res.data as any).list || []
      userOptions.value = users.map((u: any) => ({ id: u.id, nickname: u.nickname }))
      for (const u of userOptions.value) {
        userNameMap.set(u.id, u.nickname)
      }
    }
  } catch (e) { console.error(e) }
  userSearchLoading.value = false
}

function getUserName(userId: number): string {
  return userNameMap.get(userId) || `用户${userId}`
}

function openCreateDialog() {
  form.matchmakerId = null
  form.userId = null
  form.content = ''
  form.rating = 5
  userOptions.value = []
  showDialog.value = true
}

async function handleCreate() {
  if (!form.matchmakerId || !form.userId || !form.content.trim()) {
    ElMessage.warning('请填写完整信息')
    return
  }
  try {
    const res = await adminSystem.createMatchmakerComment({
      matchmakerId: form.matchmakerId,
      userId: form.userId,
      content: form.content.trim(),
      rating: form.rating,
    })
    if (res.success) {
      ElMessage.success('创建成功')
      showDialog.value = false
      fetchList()
    }
  } catch (e) { ElMessage.error('创建失败') }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
    await adminSystem.deleteMatchmakerComment(id)
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
