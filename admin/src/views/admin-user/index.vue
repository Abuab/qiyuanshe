<template>
  <div class="admin-user-list">
    <div class="page-header">
      <h2 class="page-title">子账号管理</h2>
      <el-button type="primary" @click="handleAdd">新增子账号</el-button>
    </div>

    <div class="card">
      <el-table :data="tableData" v-loading="loading" row-key="id">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="账号" width="140" />
        <el-table-column prop="nickname" label="姓名" width="120">
          <template #default="{ row }">
            {{ row.nickname || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" size="small">
              {{ getRoleName(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="MFA" width="70">
          <template #default="{ row }">
            <el-tag :type="row.isMfaEnabled ? 'success' : 'info'" size="small">
              {{ row.isMfaEnabled ? '已开启' : '未开启' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="row.role !== 'super_admin'">
              <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
              <el-button type="warning" link @click="handleResetPwd(row)">重置密码</el-button>
              <el-popconfirm
                title="确定要删除该子账号吗？"
                @confirm="handleDelete(row.id)"
              >
                <template #reference>
                  <el-button type="danger" link>删除</el-button>
                </template>
              </el-popconfirm>
            </template>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑子账号' : '新增子账号'"
      width="480px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" placeholder="请输入登录账号" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="密码" :prop="isEdit ? '' : 'password'">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="isEdit ? '留空则不修改密码' : '请输入密码'"
            show-password
          />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="form.nickname" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="超级管理员" value="super_admin" />
            <el-option label="红娘" value="matchmaker" />
            <el-option label="运营" value="operator" />
            <el-option label="只读" value="readonly" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="resetPwdVisible" title="重置密码" width="380px">
      <el-form :model="resetPwdForm" label-width="80px">
        <el-form-item label="新密码" required>
          <el-input
            v-model="resetPwdForm.password"
            type="password"
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetPwdLoading" @click="confirmResetPwd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminAccountApi } from '../../api/admin-user'
import type { AdminAccount } from '../../api/admin-user'

const loading = ref(false)
const tableData = ref<AdminAccount[]>([])

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const submitLoading = ref(false)

const form = reactive({
  username: '',
  password: '',
  nickname: '',
  role: 'readonly',
  status: 1,
})

const formRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const resetPwdVisible = ref(false)
const resetPwdLoading = ref(false)
const resetPwdForm = reactive({ password: '' })
const resetPwdUserId = ref<number | null>(null)

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const res = await adminAccountApi.list()
    if (res.success && res.data) {
      tableData.value = res.data.list || []
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取子账号列表失败')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.username = ''
  form.password = ''
  form.nickname = ''
  form.role = 'readonly'
  form.status = 1
  isEdit.value = false
  editId.value = null
}

function handleAdd() {
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: AdminAccount) {
  isEdit.value = true
  editId.value = row.id
  form.username = row.username
  form.password = ''
  form.nickname = row.nickname || ''
  form.role = row.role
  form.status = row.status
  dialogVisible.value = true
}

async function handleSubmit() {
  submitLoading.value = true
  try {
    const data: any = {
      nickname: form.nickname,
      role: form.role,
      status: form.status,
    }
    if (form.password) data.password = form.password
    if (!isEdit.value) data.username = form.username

    if (isEdit.value && editId.value) {
      await adminAccountApi.update(editId.value, data)
      ElMessage.success('更新成功')
    } else {
      await adminAccountApi.create({
        username: form.username,
        password: form.password,
        nickname: form.nickname,
        role: form.role,
        status: form.status,
      })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch (error: any) {
    ElMessage.error(error?.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

function handleResetPwd(row: AdminAccount) {
  resetPwdUserId.value = row.id
  resetPwdForm.password = ''
  resetPwdVisible.value = true
}

async function confirmResetPwd() {
  if (!resetPwdForm.password || !resetPwdUserId.value) {
    ElMessage.warning('请输入新密码')
    return
  }
  resetPwdLoading.value = true
  try {
    await adminAccountApi.update(resetPwdUserId.value, { password: resetPwdForm.password })
    ElMessage.success('密码重置成功')
    resetPwdVisible.value = false
  } catch (error: any) {
    ElMessage.error(error?.message || '重置失败')
  } finally {
    resetPwdLoading.value = false
  }
}

async function handleDelete(id: number) {
  try {
    await adminAccountApi.delete(id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败')
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function getRoleName(role: string) {
  const map: Record<string, string> = {
    super_admin: '超级管理员',
    matchmaker: '红娘',
    operator: '运营',
    readonly: '只读',
  }
  return map[role] || role
}

function getRoleTagType(role: string) {
  const map: Record<string, string> = {
    super_admin: 'danger',
    matchmaker: 'warning',
    operator: 'success',
    readonly: 'info',
  }
  return map[role] || 'info'
}
</script>

<style lang="scss" scoped>
.admin-user-list {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
</style>
