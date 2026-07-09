<template>
  <div class="agreement-log-storage-page">
    <el-card class="config-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>协议同意记录存储配置</span>
        </div>
      </template>

      <!-- 存储方式选择 -->
      <el-form :model="form" label-width="140px" size="default">
        <el-form-item label="存储方式">
          <el-radio-group v-model="form.storageType" @change="onStorageTypeChange">
            <el-radio value="local">本地数据库</el-radio>
            <el-radio value="sls">阿里云 SLS</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="本地备份（双写）">
          <el-switch v-model="form.localBackup" active-text="开启" inactive-text="关闭" />
          <div class="form-tip" style="margin-left: 12px">使用 SLS 时，是否同时在本地保留一份数据（建议开启）</div>
        </el-form-item>

        <!-- SLS 配置（仅 SLS 模式显示） -->
        <template v-if="form.storageType === 'sls'">
          <el-divider content-position="left">阿里云 SLS 配置</el-divider>

          <el-form-item label="SLS Project 名称">
            <el-input v-model="form.slsProject" placeholder="如：my-project" style="max-width: 360px" />
          </el-form-item>

          <el-form-item label="SLS Logstore 名称">
            <el-input v-model="form.slsLogstore" placeholder="如：agreement-logs" style="max-width: 360px" />
          </el-form-item>

          <el-form-item label="SLS 地域（Endpoint）">
            <el-select v-model="form.slsEndpoint" placeholder="请选择地域" style="max-width: 360px">
              <el-option label="杭州 (cn-hangzhou.log.aliyuncs.com)" value="cn-hangzhou.log.aliyuncs.com" />
              <el-option label="北京 (cn-beijing.log.aliyuncs.com)" value="cn-beijing.log.aliyuncs.com" />
              <el-option label="上海 (cn-shanghai.log.aliyuncs.com)" value="cn-shanghai.log.aliyuncs.com" />
              <el-option label="深圳 (cn-shenzhen.log.aliyuncs.com)" value="cn-shenzhen.log.aliyuncs.com" />
              <el-option label="成都 (cn-chengdu.log.aliyuncs.com)" value="cn-chengdu.log.aliyuncs.com" />
              <el-option label="香港 (cn-hongkong.log.aliyuncs.com)" value="cn-hongkong.log.aliyuncs.com" />
              <el-option label="新加坡 (ap-southeast-1.log.aliyuncs.com)" value="ap-southeast-1.log.aliyuncs.com" />
              <el-option label="美国硅谷 (us-west-1.log.aliyuncs.com)" value="us-west-1.log.aliyuncs.com" />
            </el-select>
          </el-form-item>

          <el-form-item label="AccessKey ID">
            <el-input v-model="form.slsAccessKeyId" placeholder="请输入 AccessKey ID" style="max-width: 360px" />
          </el-form-item>

          <el-form-item label="AccessKey Secret">
            <el-input
              v-model="form._slsAccessKeySecret"
              type="password"
              show-password
              :placeholder="form.slsAccessKeySecretMasked ? '已设置（显示脱敏）' : '请输入 AccessKey Secret'"
              style="max-width: 360px"
            />
            <div class="form-tip" style="margin-left: 12px" v-if="form.slsAccessKeySecretMasked">
              当前: {{ form.slsAccessKeySecretMasked }}
            </div>
          </el-form-item>

          <el-form-item>
            <el-button type="success" :loading="testing" @click="handleTestConnection">
              测试连接
            </el-button>
            <span v-if="testResult !== null" :class="testResult.success ? 'test-ok' : 'test-fail'" style="margin-left: 12px">
              {{ testResult.success ? '连接成功' : '连接失败: ' + testResult.message }}
            </span>
          </el-form-item>
        </template>

        <el-divider />
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">
            保存配置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据迁移 -->
    <el-card class="config-card" shadow="never" style="margin-top: 16px" v-if="form.storageType !== 'local'">
      <template #header>
        <div class="card-header">
          <span>数据迁移</span>
        </div>
      </template>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #title>
          当前使用 SLS 存储，如果需要将历史本地数据迁移至 SLS，请使用下方功能。
        </template>
      </el-alert>

      <el-space wrap>
        <el-button :loading="migrating === 'local-to-sls'" @click="handleMigrate('local', 'sls')">
          从本地迁移至 SLS
        </el-button>
        <el-button :loading="migrating === 'sls-to-local'" @click="handleMigrate('sls', 'local')">
          从 SLS 迁移至本地
        </el-button>
      </el-space>

      <div v-if="migrateMsg" style="margin-top: 10px; color: #67c23a">
        {{ migrateMsg }}
      </div>
    </el-card>

    <!-- 日志查询 -->
    <el-card class="config-card" shadow="never" style="margin-top: 16px">
      <template #header>
        <div class="card-header">
          <span>同意记录查询</span>
        </div>
      </template>

      <el-form :inline="true" size="default">
        <el-form-item label="用户ID">
          <el-input v-model="logQuery.userId" placeholder="用户ID" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="协议类型">
          <el-select v-model="logQuery.agreementType" placeholder="全部" clearable style="width: 180px">
            <el-option label="用户协议" value="USER_AGREEMENT" />
            <el-option label="隐私政策" value="PRIVACY_POLICY" />
            <el-option label="VIP 协议" value="VIP_AGREEMENT" />
            <el-option label="自律公约" value="SELF_DISCIPLINE_STATEMENT" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="logQuery._timeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQueryLogs">查询</el-button>
          <el-button @click="handleExportLogs">导出 CSV</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="logs" border stripe v-loading="logLoading" style="margin-top: 10px">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="nickname" label="用户昵称" width="120" />
        <el-table-column prop="userId" label="用户ID" width="80" />
        <el-table-column prop="phone" label="手机号" width="130">
          <template #default="{ row }">
            {{ maskPhone(row.phone) }}
          </template>
        </el-table-column>
        <el-table-column prop="agreementType" label="协议类型" width="110" />
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column prop="action" label="操作" width="80">
          <template #default="{ row }">
            <el-tag :type="row.action === 'agree' ? 'success' : 'danger'" size="small">
              {{ row.action === 'agree' ? '同意' : '不同意' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ipAddress" label="IP地址" width="140" />
        <el-table-column prop="userAgent" label="UserAgent" min-width="200" show-overflow-tooltip />
        <el-table-column prop="storageSource" label="存储来源" width="100">
          <template #default="{ row }">
            <el-tag :type="row.storageSource === 'sls' ? '' : 'info'" size="small">
              {{ row.storageSource === 'sls' ? 'SLS' : '本地' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="180" />
      </el-table>

      <div class="table-footer" style="margin-top: 12px; display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="logPage"
          v-model:page-size="logPageSize"
          :total="logTotal"
          layout="total, prev, pager, next"
          @current-change="handleQueryLogs"
          @size-change="handleQueryLogs"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { agreementLogStorage, type StorageConfig } from '@/api/agreement-log-storage'
import { ElMessage, ElMessageBox } from 'element-plus'

/** 手机号脱敏：保留前3后4，中间4位显示为**** */
function maskPhone(phone: string): string {
  if (!phone) return '-'
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const saving = ref(false)
const testing = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

const form = reactive<StorageConfig & { _slsAccessKeySecret: string }>({
  storageType: 'local',
  localBackup: true,
  slsProject: '',
  slsLogstore: '',
  slsEndpoint: '',
  slsAccessKeyId: '',
  slsAccessKeySecretMasked: '',
  _slsAccessKeySecret: '',
})

onMounted(async () => {
  try {
    const res = await agreementLogStorage.getConfig()
    if (res.data) {
      Object.assign(form, res.data)
    }
  } catch {
    // ignore
  }
  // 默认加载同意记录，避免初始为空
  handleQueryLogs()
})

const onStorageTypeChange = (val: string) => {
  if (val === 'local') {
    ElMessage.info('切换为本地存储后，新数据将写入 MySQL，历史记录保留在原位置')
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const payload: any = {
      storageType: form.storageType,
      localBackup: form.localBackup,
    }
    if (form.storageType === 'sls') {
      payload.slsProject = form.slsProject
      payload.slsLogstore = form.slsLogstore
      payload.slsEndpoint = form.slsEndpoint
      payload.slsAccessKeyId = form.slsAccessKeyId
      if (form._slsAccessKeySecret) {
        payload.slsAccessKeySecret = form._slsAccessKeySecret
      }
    }
    const res = await agreementLogStorage.updateConfig(payload)
    if (res.data) {
      Object.assign(form, res.data)
      form._slsAccessKeySecret = '' // 清空输入
    }
    ElMessage.success('配置已保存')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleTestConnection = async () => {
  if (!form.slsProject || !form.slsLogstore || !form.slsEndpoint || !form.slsAccessKeyId) {
    ElMessage.warning('请填写完整的 SLS 配置')
    return
  }
  const secret = form._slsAccessKeySecret || promptForSecret()
  if (!secret) {
    ElMessage.warning('请输入 AccessKey Secret')
    return
  }
  testing.value = true
  testResult.value = null
  try {
    const res = await agreementLogStorage.testConnection({
      slsProject: form.slsProject,
      slsLogstore: form.slsLogstore,
      slsEndpoint: form.slsEndpoint,
      slsAccessKeyId: form.slsAccessKeyId,
      slsAccessKeySecret: secret,
    })
    testResult.value = (res.data as any) || { success: false, message: '未知结果' }
  } catch (e: any) {
    testResult.value = { success: false, message: e?.response?.data?.message || '请求失败' }
  } finally {
    testing.value = false
  }
}

const promptForSecret = (): string => {
  // 使用 Element Plus 的 MessageBox prompt
  return '' // Simplified; use ElMessageBox.prompt in real implementation
}

// 迁移
const migrating = ref<string | null>(null)
const migrateMsg = ref('')

const handleMigrate = async (from: 'local' | 'sls', to: 'local' | 'sls') => {
  const key = `${from}-to-${to}`
  try {
    await ElMessageBox.confirm(
      `确定要将数据从 ${from === 'sls' ? 'SLS' : '本地'} 迁移至 ${to === 'sls' ? 'SLS' : '本地'} 吗？`,
      '确认迁移',
      { type: 'warning' },
    )
  } catch {
    return
  }
  migrating.value = key
  migrateMsg.value = ''
  try {
    const res = await agreementLogStorage.migrate({ from, to })
    migrateMsg.value = `迁移完成，共迁移 ${res.data?.migrated || 0} 条记录`
    ElMessage.success(migrateMsg.value)
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '迁移失败')
  } finally {
    migrating.value = null
  }
}

// 日志查询
const logs = ref<any[]>([])
const logLoading = ref(false)
const logTotal = ref(0)
const logPage = ref(1)
const logPageSize = ref(20)

const logQuery = reactive<{
  userId: string
  agreementType: string
  _timeRange: [string, string] | null
}>({
  userId: '',
  agreementType: '',
  _timeRange: null,
})

const handleQueryLogs = async () => {
  logLoading.value = true
  try {
    const params: any = {
      page: logPage.value,
      pageSize: logPageSize.value,
    }
    if (logQuery.userId) params.userId = parseInt(logQuery.userId)
    if (logQuery.agreementType) params.agreementType = logQuery.agreementType
    if (logQuery._timeRange) {
      params.startTime = logQuery._timeRange[0]
      params.endTime = logQuery._timeRange[1]
    }
    const res = await agreementLogStorage.getLogs(params)
    logs.value = res.data?.items || []
    logTotal.value = res.data?.total || 0
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '查询失败')
  } finally {
    logLoading.value = false
  }
}

const handleExportLogs = async () => {
  try {
    const params: any = {}
    if (logQuery.userId) params.userId = parseInt(logQuery.userId)
    if (logQuery._timeRange) {
      params.startTime = logQuery._timeRange[0]
      params.endTime = logQuery._timeRange[1]
    }
    const blob = await agreementLogStorage.exportLogs(params)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agreement-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e: any) {
    ElMessage.error('导出失败')
  }
}
</script>

<style scoped>
.agreement-log-storage-page {
  padding: 16px;
  max-width: 1100px;
}

.card-header {
  font-weight: 600;
  font-size: 15px;
}

.form-tip {
  font-size: 12px;
  color: #999;
}

.test-ok {
  color: #67c23a;
  font-weight: 500;
}
.test-fail {
  color: #f56c6c;
  font-weight: 500;
}
</style>
