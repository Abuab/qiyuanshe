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
        <el-table-column label="红娘" width="140">
          <template #default="{ row }">
            <div class="cell-with-avatar">
              <el-avatar v-if="row.matchmaker?.avatar" :src="row.matchmaker.avatar" :size="28" />
              <span>{{ row.matchmaker?.name || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="会员" width="160">
          <template #default="{ row }">
            <div class="cell-with-avatar">
              <el-avatar v-if="row.user?.avatar" :src="row.user.avatar" :size="28" />
              <span>{{ row.user?.nickname || '用户' + row.userId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="评语内容" min-width="200" show-overflow-tooltip />
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ row.createdAt?.slice(0, 16).replace('T', ' ') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="openEditDialog(row)">编辑</el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row.id)">删除</el-button>
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="isEdit ? '编辑评语' : '新增评语'" width="520px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="选择红娘" required>
          <el-select
            v-model="form.matchmakerId"
            placeholder="请选择红娘"
            filterable
            :disabled="isEdit"
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
        <el-form-item label="选择会员" required>
          <el-select
            v-model="form.userId"
            placeholder="输入ID或昵称搜索用户"
            filterable
            :filter-method="filterUsers"
            :loading="userSearchLoading"
            :disabled="isEdit"
            style="width:100%"
            @visible-change="onUserSelectVisibleChange"
          >
            <el-option
              v-for="u in filteredUserOptions"
              :key="u.id"
              :label="`${u.nickname} (ID:${u.id})`"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="评语内容" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="5"
            placeholder="请输入评语内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleSubmit"
          :disabled="!form.matchmakerId || !form.userId || !form.content.trim()"
        >
          {{ isEdit ? '保存修改' : '确认' }}
        </el-button>
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
const isEdit = ref(false)
const editingId = ref(0)
const userSearchLoading = ref(false)
const form = reactive({
  matchmakerId: null as number | null,
  userId: null as number | null,
  content: '',
})
const pagination = reactive({ page: 1, limit: 20, total: 0 })

const matchmakerOptions = ref<MatchmakerOption[]>([])
const userOptions = ref<UserOption[]>([])
const filteredUserOptions = ref<UserOption[]>([])

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

async function loadInitialUsers() {
  userSearchLoading.value = true
  try {
    const res = await adminUsers.list({ limit: 50, page: 1 } as any)
    if (res.success && res.data) {
      const users = (res.data as any).list || []
      userOptions.value = users.map((u: any) => ({ id: u.id, nickname: u.nickname }))
      filteredUserOptions.value = [...userOptions.value]
    }
  } catch (e) { console.error(e) }
  userSearchLoading.value = false
}

function onUserSelectVisibleChange(visible: boolean) {
  if (visible && userOptions.value.length === 0) {
    loadInitialUsers()
  } else if (visible) {
    filteredUserOptions.value = [...userOptions.value]
  }
}

function filterUsers(keyword: string) {
  if (!keyword) {
    filteredUserOptions.value = [...userOptions.value]
    return
  }
  userSearchLoading.value = true
  const kw = keyword.toLowerCase()
  // 本地先过滤
  filteredUserOptions.value = userOptions.value.filter(
    (u) => u.nickname.toLowerCase().includes(kw) || String(u.id) === kw,
  )
  // 同时远程搜索
  adminUsers.list({ keyword, limit: 50, page: 1 } as any).then((res) => {
    if (res.success && res.data) {
      const remoteUsers = (res.data as any).list || []
      const remoteMapped = remoteUsers.map((u: any) => ({ id: u.id, nickname: u.nickname }))
      const merged = [...remoteMapped]
      for (const u of userOptions.value) {
        if (!merged.find((m) => m.id === u.id)) merged.push(u)
      }
      filteredUserOptions.value = merged.filter(
        (u) => u.nickname.toLowerCase().includes(kw) || String(u.id) === kw,
      )
      for (const u of remoteMapped) {
        if (!userOptions.value.find((existing) => existing.id === u.id)) {
          userOptions.value.push(u)
        }
      }
    }
  }).finally(() => {
    userSearchLoading.value = false
  })
}

function openCreateDialog() {
  isEdit.value = false
  editingId.value = 0
  form.matchmakerId = null
  form.userId = null
  form.content = ''
  userOptions.value = []
  filteredUserOptions.value = []
  showDialog.value = true
  loadInitialUsers()
}

function openEditDialog(row: any) {
  isEdit.value = true
  editingId.value = row.id
  form.matchmakerId = row.matchmakerId
  form.userId = row.userId
  form.content = row.content || ''
  userOptions.value = [{ id: row.userId, nickname: row.user?.nickname || '用户' + row.userId }]
  filteredUserOptions.value = [...userOptions.value]
  showDialog.value = true
}

async function handleSubmit() {
  if (!form.matchmakerId || !form.userId || !form.content.trim()) {
    ElMessage.warning('请填写完整信息')
    return
  }
  try {
    if (isEdit.value) {
      await adminSystem.updateMatchmakerComment(editingId.value, {
        content: form.content.trim(),
      })
      ElMessage.success('修改成功')
    } else {
      const res = await adminSystem.createMatchmakerComment({
        matchmakerId: form.matchmakerId,
        userId: form.userId,
        content: form.content.trim(),
      })
      if (res.success) {
        ElMessage.success('创建成功')
      }
    }
    showDialog.value = false
    fetchList()
  } catch (e) {
    ElMessage.error(isEdit.value ? '修改失败' : '创建失败')
  }
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
.cell-with-avatar {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
