<template>
  <div class="user-detail">
    <div class="page-header">
      <el-button @click="handleBack" :icon="ArrowLeft">返回</el-button>
      <h2 class="page-title">用户详情</h2>
    </div>

    <div v-loading="loading">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="avatar-card">
            <div class="avatar-wrapper">
              <el-avatar :size="120" :src="userInfo?.avatar || defaultAvatar" />
            </div>
            <div class="user-name">{{ userInfo?.nickname }}</div>
            <div class="user-id">ID: {{ userInfo?.id }}</div>
            <div class="user-tags">
              <el-tag v-if="userInfo?.isVip" :type="getVipTagType(userInfo?.vipLevel)" size="small">
                {{ getVipName(userInfo?.vipLevel) }}
              </el-tag>
              <el-tag v-else type="info" size="small">普通用户</el-tag>
              <el-tag :type="getStatusTagType(userInfo?.status)" size="small">
                {{ getStatusName(userInfo?.status) }}
              </el-tag>
            </div>
          </el-card>
        </el-col>

        <el-col :span="18">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <span>基本信息</span>
              </div>
            </template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="昵称">{{ userInfo?.nickname }}</el-descriptions-item>
              <el-descriptions-item label="性别">
                {{ userInfo?.gender === 1 ? '男' : userInfo?.gender === 2 ? '女' : '未知' }}
              </el-descriptions-item>
              <el-descriptions-item label="年龄">{{ userInfo?.age || '-' }}</el-descriptions-item>
              <el-descriptions-item label="手机号">{{ userInfo?.phone || '-' }}</el-descriptions-item>
              <el-descriptions-item label="身高">{{ userInfo?.height ? userInfo.height + 'cm' : '-' }}</el-descriptions-item>
              <el-descriptions-item label="体重">{{ userInfo?.weight ? userInfo.weight + 'kg' : '-' }}</el-descriptions-item>
              <el-descriptions-item label="学历">{{ userInfo?.education || '-' }}</el-descriptions-item>
              <el-descriptions-item label="职业">{{ userInfo?.occupation || '-' }}</el-descriptions-item>
              <el-descriptions-item label="注册时间">
                {{ formatDate(userInfo?.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="最后登录">
                {{ formatDate(userInfo?.lastLoginAt) }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mt-20">
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>认证信息</span>
              </div>
            </template>
            <div class="auth-list">
              <div class="auth-item">
                <el-icon :color="userInfo?.realNameAuth === 1 ? '#67c23a' : '#909399'">
                  <CircleCheck v-if="userInfo?.realNameAuth === 1" />
                  <CircleClose v-else />
                </el-icon>
                <span>实名认证</span>
                <el-tag :type="userInfo?.realNameAuth === 1 ? 'success' : 'info'" size="small">
                  {{ userInfo?.realNameAuth === 1 ? '已认证' : '未认证' }}
                </el-tag>
              </div>
              <div class="auth-item">
                <el-icon :color="userInfo?.educationAuth === 1 ? '#67c23a' : '#909399'">
                  <CircleCheck v-if="userInfo?.educationAuth === 1" />
                  <CircleClose v-else />
                </el-icon>
                <span>学历认证</span>
                <el-tag :type="userInfo?.educationAuth === 1 ? 'success' : 'info'" size="small">
                  {{ userInfo?.educationAuth === 1 ? '已认证' : '未认证' }}
                </el-tag>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>VIP信息</span>
              </div>
            </template>
            <div class="vip-info" v-if="userInfo?.isVip">
              <div class="vip-level">
                <el-icon color="#E6A23C"><Medal /></el-icon>
                <span>{{ getVipName(userInfo?.vipLevel) }}</span>
              </div>
              <div class="vip-expire">
                到期时间: {{ formatDate(userInfo?.vipExpireTime) }}
              </div>
            </div>
            <div v-else class="no-vip">
              <el-icon><User /></el-icon>
              <span>普通用户</span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-card class="mt-20">
        <template #header>
          <div class="card-header">
            <span>用户照片 ({{ photos.length }})</span>
          </div>
        </template>
        <div class="photo-list" v-if="photos.length > 0">
          <div v-for="photo in photos" :key="photo.id" class="photo-item">
            <el-image
              :src="photo.photoUrl"
              :preview-src-list="photos.map(p => p.photoUrl)"
              fit="cover"
              class="photo-image"
            />
            <div class="photo-status">
              <el-tag :type="getPhotoStatusType(photo.auditStatus)" size="small">
                {{ getPhotoStatusName(photo.auditStatus) }}
              </el-tag>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无照片" />
      </el-card>

      <el-card class="mt-20">
        <template #header>
          <div class="card-header">
            <span>操作</span>
          </div>
        </template>
        <div class="action-buttons">
          <el-button
            :type="userInfo?.status === 1 ? 'warning' : 'success'"
            @click="handleToggleStatus"
          >
            {{ userInfo?.status === 1 ? '禁用用户' : '启用用户' }}
          </el-button>
          <el-button type="info" @click="handleResetPassword">重置密码</el-button>
          <el-button type="primary" @click="handleSetVip">调整VIP</el-button>
          <el-button type="success" @click="handleSendNotify">发送通知</el-button>
        </div>
      </el-card>
    </div>

    <el-dialog v-model="vipDialogVisible" title="调整VIP等级" width="400px">
      <el-form :model="vipForm" label-width="100px">
        <el-form-item label="VIP等级" required>
          <el-select v-model="vipForm.level" style="width: 200px">
            <el-option label="普通用户" :value="0" />
            <el-option label="黄金会员" :value="1" />
            <el-option label="钻石会员" :value="2" />
            <el-option label="至尊VIP" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="有效期">
          <el-input-number v-model="vipForm.days" :min="1" :max="3650" />
          <span class="ml-10">天</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vipDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleVipSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="notifyDialogVisible" title="发送通知" width="500px">
      <el-form :model="notifyForm" label-width="80px">
        <el-form-item label="通知内容" required>
          <el-input
            v-model="notifyForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入通知内容..."
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="notifyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleNotifySubmit">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  CircleCheck,
  CircleClose,
  Medal,
  User,
} from '@element-plus/icons-vue'
import { adminUsers } from '../../api'
import type { User as UserType, UserPhoto } from '../../api/user'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const defaultAvatar = '/static/default-avatar.png'
const userInfo = ref<UserType | null>(null)
const photos = ref<UserPhoto[]>([])

const vipDialogVisible = ref(false)
const notifyDialogVisible = ref(false)

const vipForm = reactive({
  level: 0,
  days: 30,
})

const notifyForm = reactive({
  content: '',
})

onMounted(() => {
  fetchUserDetail()
})

async function fetchUserDetail() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    const [userRes, photosRes] = await Promise.all([
      adminUsers.detail(id),
      adminUsers.getPhotos(id),
    ])

    if (userRes.success) {
      userInfo.value = userRes.data ?? null
    }

    if (photosRes.success) {
      photos.value = photosRes.data || []
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取用户详情失败')
  } finally {
    loading.value = false
  }
}

function handleBack() {
  router.back()
}

async function handleToggleStatus() {
  if (!userInfo.value) return
  const action = userInfo.value.status === 1 ? '禁用' : '启用'

  try {
    await ElMessageBox.confirm(
      `确定要${action}该用户吗？`,
      `确认${action}`,
      { type: 'warning' }
    )

    await adminUsers.updateStatus(userInfo.value.id, userInfo.value.status === 1 ? 0 : 1)
    ElMessage.success(`${action}成功`)
    fetchUserDetail()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

async function handleResetPassword() {
  if (!userInfo.value) return

  try {
    await ElMessageBox.confirm(
      '确定要重置该用户密码吗？密码将重置为默认密码123456',
      '重置密码',
      { type: 'warning' }
    )

    await adminUsers.resetPassword(userInfo.value.id)
    ElMessage.success('密码重置成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

function handleSetVip() {
  if (!userInfo.value) return
  vipForm.level = userInfo.value.vipLevel || 0
  vipForm.days = 30
  vipDialogVisible.value = true
}

async function handleVipSubmit() {
  if (!userInfo.value) return

  try {
    await adminUsers.updateVip(userInfo.value.id, {
      level: vipForm.level,
      days: vipForm.days,
    })
    ElMessage.success('VIP设置成功')
    vipDialogVisible.value = false
    fetchUserDetail()
  } catch (error) {
    console.error(error)
  }
}

function handleSendNotify() {
  if (!userInfo.value) return
  notifyForm.content = ''
  notifyDialogVisible.value = true
}

async function handleNotifySubmit() {
  if (!userInfo.value || !notifyForm.content.trim()) {
    ElMessage.warning('请输入通知内容')
    return
  }

  try {
    await adminUsers.sendNotification(userInfo.value.id, notifyForm.content)
    ElMessage.success('通知已发送')
    notifyDialogVisible.value = false
  } catch (error) {
    console.error(error)
  }
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getVipName(level: number | undefined) {
  const map: Record<number, string> = {
    0: '普通用户',
    1: '黄金会员',
    2: '钻石会员',
    3: '至尊VIP',
  }
  return map[level || 0] || '普通用户'
}

function getVipTagType(level: number | undefined) {
  const map: Record<number, string> = {
    0: 'info',
    1: 'warning',
    2: 'primary',
    3: 'danger',
  }
  return map[level || 0] || 'info'
}

function getStatusName(status: number | undefined) {
  const map: Record<number, string> = {
    0: '禁用',
    1: '正常',
    2: '待审核',
  }
  return map[status || 0] || '未知'
}

function getStatusTagType(status: number | undefined) {
  const map: Record<number, string> = {
    0: 'danger',
    1: 'success',
    2: 'warning',
  }
  return map[status || 0] || 'info'
}

function getPhotoStatusName(status: number) {
  const map: Record<number, string> = {
    0: '待审核',
    1: '已通过',
    2: '已拒绝',
  }
  return map[status] || '未知'
}

function getPhotoStatusType(status: number) {
  const map: Record<number, string> = {
    0: 'warning',
    1: 'success',
    2: 'danger',
  }
  return map[status] || 'info'
}
</script>

<style lang="scss" scoped>
.user-detail {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;

  .page-title {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
  }
}

.mt-20 {
  margin-top: 20px;
}

.avatar-card {
  text-align: center;

  .avatar-wrapper {
    margin-bottom: 16px;
  }

  .user-name {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .user-id {
    font-size: 14px;
    color: #909399;
    margin-bottom: 16px;
  }

  .user-tags {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
}

.info-card {
  .card-header {
    font-weight: bold;
  }
}

.card-header {
  font-weight: bold;
}

.auth-list {
  .auth-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #ebeef5;

    &:last-child {
      border-bottom: none;
    }

    span {
      flex: 1;
    }
  }
}

.vip-info {
  text-align: center;

  .vip-level {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 18px;
    font-weight: bold;
    color: #e6a23c;
    margin-bottom: 12px;
  }

  .vip-expire {
    color: #666;
    font-size: 14px;
  }
}

.no-vip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
  font-size: 16px;
}

.photo-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;

  .photo-item {
    position: relative;
    border-radius: 8px;
    overflow: hidden;

    .photo-image {
      width: 100%;
      height: 150px;
      display: block;
    }

    .photo-status {
      position: absolute;
      bottom: 8px;
      right: 8px;
    }
  }
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.ml-10 {
  margin-left: 10px;
}
</style>
