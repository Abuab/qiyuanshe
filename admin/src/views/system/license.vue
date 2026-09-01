<template>
  <div class="license-page">
    <div class="page-header">
      <h2 class="page-title">系统授权管理</h2>
      <p class="page-desc">输入 License Key 激活系统；授权过期或未授权时，小程序业务功能与管理后台将被限制</p>
    </div>

    <!-- 未授权警告 -->
    <el-alert
      v-if="!licenseInfo || licenseInfo.status === 'unauthorized'"
      class="unauthorized-alert"
      type="error"
      :closable="false"
      title="系统未授权"
      description="请输入有效的 License Key 激活系统。未激活期间，小程序业务写入功能与管理后台均不可用。"
    />

    <!-- 已激活状态 -->
    <el-card v-if="licenseInfo && licenseInfo.status !== 'unauthorized'" class="status-card">
      <template #header>当前授权信息</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="授权状态">
          <el-tag :type="statusTagType">{{ statusText }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="远程状态">
          <el-tag :type="remoteStatusTagType">{{ remoteStatusText }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="客户ID">{{ licenseInfo.customerId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="客户名称">{{ licenseInfo.customer || '-' }}</el-descriptions-item>
        <el-descriptions-item label="过期时间">{{ licenseInfo.expiresAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="剩余天数">{{ licenseInfo.graceDaysLeft }} 天</el-descriptions-item>
        <el-descriptions-item label="绑定域名">{{ licenseInfo.domain || '不限' }}</el-descriptions-item>
        <el-descriptions-item label="激活实例数">{{ activationCountText }}</el-descriptions-item>
        <el-descriptions-item label="激活时间">{{ licenseInfo.activatedAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="功能白名单" :span="2">
          <el-tag
            v-for="f in licenseInfo.features"
            :key="f"
            size="small"
            class="feature-tag"
            type="info"
          >{{ f }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <div class="card-actions">
        <el-button type="danger" plain :loading="deactivating" @click="handleDeactivate">
          解绑当前服务器
        </el-button>
      </div>
    </el-card>

    <!-- 输入/更新 License -->
    <el-card class="input-card">
      <template #header>更新 License Key</template>
      <el-form label-width="100px">
        <el-form-item label="License Key">
          <el-input
            v-model="licenseKeyInput"
            type="textarea"
            :rows="6"
            placeholder="请粘贴 License Key..."
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="activating" @click="handleActivate">
            激活 / 更新
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { licenseApi, type LicenseInfo, type ActivationSummary } from '../../api/license'

const licenseInfo = ref<LicenseInfo | null>(null)
const activationSummary = ref<ActivationSummary | null>(null)
const licenseKeyInput = ref('')
const activating = ref(false)
const deactivating = ref(false)

const statusText = computed(() => {
  const map: Record<string, string> = {
    valid: '已授权',
    grace_period: '宽限期',
    expired: '已过期',
    unauthorized: '未授权',
  }
  return map[licenseInfo.value?.status || ''] || '未知'
})

const statusTagType = computed(() => {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    valid: 'success',
    grace_period: 'warning',
    expired: 'danger',
    unauthorized: 'danger',
  }
  return map[licenseInfo.value?.status || ''] || 'info'
})

const remoteStatusText = computed(() => {
  const status = licenseInfo.value?.remoteStatus
  if (status === 'revoked') return '已吊销'
  if (status === 'valid') return '正常'
  return status || '未知'
})

const remoteStatusTagType = computed(() => {
  return licenseInfo.value?.remoteStatus === 'revoked' ? 'danger' : 'success'
})

const activationCountText = computed(() => {
  const count = activationSummary.value?.activationCount ?? 0
  const max = activationSummary.value?.maxActivations ?? licenseInfo.value?.maxActivations ?? 1
  return `${count} / ${max}`
})

onMounted(async () => {
  await Promise.all([fetchStatus(), fetchActivations()])
})

async function fetchStatus() {
  try {
    const res = await licenseApi.getStatus()
    if (res.success && res.data) {
      licenseInfo.value = res.data
    }
  } catch (error) {
    console.error('获取授权状态失败:', error)
  }
}

async function handleActivate() {
  const key = licenseKeyInput.value.trim()
  if (!key) {
    ElMessage.warning('请先粘贴 License Key')
    return
  }

  activating.value = true
  try {
    const res = await licenseApi.activate(key)
    if (res.success) {
      ElMessage.success('激活成功')
      licenseKeyInput.value = ''
      await Promise.all([fetchStatus(), fetchActivations()])
    } else {
      ElMessage.error(res.message || '激活失败')
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '激活失败，请检查 License Key 是否正确')
  } finally {
    activating.value = false
  }
}

async function fetchActivations() {
  try {
    const res = await licenseApi.getActivations()
    if (res.success && res.data) {
      activationSummary.value = res.data
    }
  } catch (error) {
    console.error('获取激活实例数失败:', error)
  }
}

async function handleDeactivate() {
  try {
    await ElMessageBox.confirm(
      '解绑后当前服务器将失去授权，所有功能将被锁定，需重新激活后才能使用。确认继续？',
      '解绑确认',
      { type: 'warning', confirmButtonText: '确认解绑', cancelButtonText: '取消' },
    )
  } catch {
    return
  }

  deactivating.value = true
  try {
    const res = await licenseApi.deactivate()
    if (res.success) {
      ElMessage.success('解绑成功')
      await Promise.all([fetchStatus(), fetchActivations()])
    } else {
      ElMessage.error(res.message || '解绑失败')
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '解绑失败，请稍后重试')
  } finally {
    deactivating.value = false
  }
}
</script>

<style scoped lang="scss">
.license-page {
  padding: 20px;

  .page-header {
    margin-bottom: 20px;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: #303133;
      margin: 0 0 8px 0;
    }

    .page-desc {
      font-size: 13px;
      color: #909399;
      margin: 0;
    }
  }

  .unauthorized-alert {
    margin-bottom: 20px;
  }

  .status-card {
    margin-bottom: 20px;
  }

  .input-card {
    max-width: 700px;
  }

  .card-actions {
    margin-top: 16px;
  }

  .feature-tag {
    margin: 2px 4px 2px 0;
  }
}
</style>
