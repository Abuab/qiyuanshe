<template>
  <div class="user-detail" v-loading="loading">
    <div class="page-header">
      <el-button link @click="$router.back()">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
    </div>

    <div v-if="user" class="detail-content">
      <!-- 顶部信息卡片 -->
      <el-card class="header-card">
        <div class="user-header">
          <el-avatar :size="100" :src="user.avatar || defaultAvatar" />
          <div class="header-info">
            <h2 class="user-name">{{ user.nickname }}</h2>
            <div class="user-tags">
              <el-tag v-if="user.gender === 1" type="primary">男</el-tag>
              <el-tag v-else-if="user.gender === 2" type="danger">女</el-tag>
              <span class="tag-label">ID: {{ user.id }}</span>
              <span class="tag-label">{{ user.phone || '未绑定手机' }}</span>
              <el-tag v-if="user.isVip && (user.vipLevel || 0) > 0" type="warning" effect="dark">
                {{ ['', '黄金会员', '钻石会员', '至尊VIP'][user.vipLevel || 0] }}
              </el-tag>
              <el-tag v-if="user.status === 1" type="success">正常</el-tag>
              <el-tag v-else-if="user.status === 2" type="warning">待审核</el-tag>
              <el-tag v-else type="danger">禁用</el-tag>
            </div>
          </div>
          <div class="header-actions">
            <el-button type="warning" @click="handleSetVip">设为VIP</el-button>
            <el-button
              :type="user.status === 1 ? 'danger' : 'success'"
              @click="handleToggleStatus"
            >
              {{ user.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button @click="handleSendNotify">发送通知</el-button>
          </div>
        </div>
      </el-card>

      <!-- Tab内容 -->
      <el-card class="tab-card">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本资料" name="basic">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="性别">
                {{ user.gender === 1 ? '男' : user.gender === 2 ? '女' : '未知' }}
              </el-descriptions-item>
              <el-descriptions-item label="年龄">{{ user.age || '-' }} 岁</el-descriptions-item>
              <el-descriptions-item label="身高">{{ user.height ? user.height + ' cm' : '-' }}</el-descriptions-item>
              <el-descriptions-item label="体重">{{ user.weight ? user.weight + ' kg' : '-' }}</el-descriptions-item>
              <el-descriptions-item label="学历">{{ user.education || '-' }}</el-descriptions-item>
              <el-descriptions-item label="职业">{{ user.occupation || '-' }}</el-descriptions-item>
              <el-descriptions-item label="月收入">{{ user.incomeRange || '-' }}</el-descriptions-item>
              <el-descriptions-item label="住房">{{ user.housingStatus || '-' }}</el-descriptions-item>
              <el-descriptions-item label="车辆">{{ user.carStatus || '-' }}</el-descriptions-item>
              <el-descriptions-item label="婚况">{{ user.maritalStatus || '-' }}</el-descriptions-item>
              <el-descriptions-item label="家乡">{{ user.hometown || '-' }}</el-descriptions-item>
              <el-descriptions-item label="居住地">{{ user.residence || '-' }}</el-descriptions-item>
              <el-descriptions-item label="实名认证">
                <el-tag v-if="user.isRealName" type="success" size="small">已认证</el-tag>
                <el-tag v-else type="info" size="small">未认证</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="注册时间">{{ formatDate(user.createdAt) }}</el-descriptions-item>
              <el-descriptions-item label="最后登录">{{ formatDate(user.lastLoginAt) }}</el-descriptions-item>
              <el-descriptions-item label="VIP到期">
                <span v-if="user.vipExpireTime">{{ formatDate(user.vipExpireTime) }}</span>
                <span v-else>未开通</span>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <el-tab-pane label="个人简介" name="intro">
            <div class="text-content">{{ user.selfIntro || '暂无个人简介' }}</div>
          </el-tab-pane>

          <el-tab-pane label="择偶要求" name="mate">
            <div class="text-content">{{ user.mateRequirement || '暂无择偶要求' }}</div>
          </el-tab-pane>

          <el-tab-pane label="照片墙" name="photos">
            <div v-if="user.photos && user.photos.length > 0" class="photo-grid">
              <el-image
                v-for="photo in user.photos"
                :key="photo.id"
                :src="photo.photoUrl"
                :preview-src-list="user.photos.map(p => p.photoUrl)"
                :initial-index="user.photos.indexOf(photo)"
                fit="cover"
                class="photo-item"
              />
            </div>
            <el-empty v-else description="暂无照片" />
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>

    <el-empty v-else description="用户不存在" />

    <!-- VIP弹窗 -->
    <el-dialog v-model="vipDialogVisible" title="调整VIP等级" width="400px">
      <el-form :model="vipForm" label-width="100px">
        <el-form-item label="用户">{{ user?.nickname }}</el-form-item>
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

    <!-- 通知弹窗 -->
    <el-dialog v-model="notifyDialogVisible" title="发送通知" width="500px">
      <el-form :model="notifyForm" label-width="80px">
        <el-form-item label="用户">{{ user?.nickname }}</el-form-item>
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
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { adminUsers } from '../../api'
import type { User } from '../../api/user'
import type { UserPhoto } from '../../api/user'

interface UserDetail extends User {
  photos?: UserPhoto[]
}

const route = useRoute()
const loading = ref(false)
const user = ref<UserDetail | null>(null)
const activeTab = ref('basic')
const defaultAvatar = '/static/default-avatar.png'

const vipDialogVisible = ref(false)
const notifyDialogVisible = ref(false)

const vipForm = reactive({ level: 0, days: 30 })
const notifyForm = reactive({ content: '' })

onMounted(() => {
  fetchDetail()
})

async function fetchDetail() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    const res = await adminUsers.detail(id)
    if (res.success && res.data) {
      user.value = res.data as UserDetail
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

async function handleToggleStatus() {
  if (!user.value) return
  const action = user.value.status === 1 ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定要${action}用户 ${user.value.nickname} 吗？`, `确认${action}`, { type: 'warning' })
    const res = await adminUsers.updateStatus(user.value.id, user.value.status === 1 ? 0 : 1)
    if (res.success) {
      ElMessage.success(`${action}成功`)
      fetchDetail()
    } else {
      ElMessage.error(res.message || `${action}失败`)
    }
  } catch (e: any) {
    if (e !== 'cancel') console.error(e)
  }
}

function handleSetVip() {
  if (!user.value) return
  vipForm.level = user.value.vipLevel || 0
  vipForm.days = 30
  vipDialogVisible.value = true
}

async function handleVipSubmit() {
  if (!user.value) return
  try {
    const res = await adminUsers.updateVip(user.value.id, { level: vipForm.level, days: vipForm.days } as any)
    if (res.success) {
      ElMessage.success('VIP设置成功')
      vipDialogVisible.value = false
      fetchDetail()
    } else {
      ElMessage.error(res.message || 'VIP设置失败')
    }
  } catch (e: any) {
    console.error(e)
    ElMessage.error(e.message || 'VIP设置失败')
  }
}

function handleSendNotify() {
  notifyForm.content = ''
  notifyDialogVisible.value = true
}

async function handleNotifySubmit() {
  if (!notifyForm.content.trim()) {
    ElMessage.warning('请输入通知内容')
    return
  }
  if (!user.value) return
  try {
    await adminUsers.sendNotification(user.value.id, notifyForm.content)
    ElMessage.success('通知已记录')
    notifyDialogVisible.value = false
  } catch (e) {
    console.error(e)
    ElMessage.error('发送失败')
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<style lang="scss" scoped>
.user-detail { padding: 20px; }

.page-header { margin-bottom: 16px; }

.header-card {
  margin-bottom: 16px;
  .user-header {
    display: flex;
    align-items: center;
    gap: 24px;
  }
  .header-info {
    flex: 1;
    .user-name { margin: 0 0 12px; font-size: 24px; }
    .user-tags {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      .tag-label { color: #999; font-size: 13px; }
    }
  }
  .header-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

.tab-card {
  .text-content {
    padding: 16px;
    min-height: 200px;
    white-space: pre-wrap;
    line-height: 1.8;
    color: #333;
  }
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 16px;
    .photo-item {
      width: 100%;
      aspect-ratio: 3/4;
      border-radius: 8px;
      cursor: pointer;
    }
  }
}

.ml-10 { margin-left: 10px; }
</style>
