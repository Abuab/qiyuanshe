<template>
  <div class="ai-provider-page">
    <!-- 页头 -->
    <div class="page-header">
      <h2 class="page-title">AI Provider 管理</h2>
      <div class="header-actions">
        <el-select
          v-model="currentStrategy"
          placeholder="负载均衡策略"
          style="width: 160px; margin-right: 12px"
          @change="onStrategyChange"
        >
          <el-option label="权重分配" value="weighted" />
          <el-option label="主备模式" value="primary_backup" />
          <el-option label="轮询" value="round_robin" />
        </el-select>
        <el-tag v-if="activeProviderName" type="success" effect="light" size="large">
          活跃: {{ activeProviderName }}
        </el-tag>
        <el-button :loading="seedLoading" @click="onSeedFromEnv">从 .env 同步</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">添加 Provider</el-button>
      </div>
    </div>

    <!-- 摘要卡片 -->
    <el-row :gutter="16" class="summary-row">
      <el-col :span="8">
        <el-card shadow="never">
          <div class="summary-item">
            <span class="summary-label">启用 Provider</span>
            <span class="summary-val">{{ enabledCount }} / {{ providers.length }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <div class="summary-item">
            <span class="summary-label">当前策略</span>
            <span class="summary-val">{{ strategyLabel }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <div class="summary-item">
            <span class="summary-label">冷却中</span>
            <span class="summary-val" :class="{ 'text-danger': cooldownList.length > 0 }">
              {{ cooldownList.length }} 个
            </span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Provider 表格 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header-row">
          <span>Provider 列表</span>
          <el-button text :icon="Refresh" @click="fetchProviders">刷新</el-button>
        </div>
      </template>
      <el-table :data="providers" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="displayName" label="服务商" min-width="120" />
        <el-table-column prop="providerKey" label="标识" width="100" />
        <el-table-column prop="modelName" label="模型" min-width="140" />
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.isEnabled === 1"
              @change="(val: boolean) => onToggleEnabled(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="默认" width="80" align="center">
          <template #default="{ row }">
            <el-radio
              :model-value="row.isDefault === 1"
              @change="() => onSetDefault(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="权重" width="80" align="center">
          <template #default="{ row }">
            <el-input-number
              :model-value="row.weight"
              :min="0"
              :max="100"
              size="small"
              controls-position="right"
              style="width: 80px"
              @change="(val: number | undefined) => onWeightChange(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="80" align="center">
          <template #default="{ row }">
            <el-input-number
              :model-value="row.priority"
              :min="1"
              :max="999"
              size="small"
              controls-position="right"
              style="width: 80px"
              @change="(val: number | undefined) => onPriorityChange(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="余额/告警" min-width="130">
          <template #default="{ row }">
            <div class="balance-cell">
              <span v-if="balanceMap[row.id] !== undefined" class="balance-val">
                {{ balanceMap[row.id] >= 0 ? '$' + balanceMap[row.id] : '不支持' }}
              </span>
              <el-button v-else text size="small" :loading="balanceLoadingMap[row.id]" @click="onQueryBalance(row)">
                查询中
              </el-button>
              <el-tag
                v-if="alertMap[row.id]"
                :type="alertMap[row.id] === 'alerting' ? 'danger' : 'success'"
                size="small"
              >
                {{ alertMap[row.id] === 'alerting' ? '告警' : '正常' }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="success" size="small" @click="onTestConnection(row)">测试</el-button>
            <el-popconfirm title="确定删除此 Provider？" @confirm="onDelete(row)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="620px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="120px">
        <el-form-item label="服务商类型" prop="providerKey">
          <el-select v-model="form.providerKey" placeholder="选择服务商" :disabled="isEdit">
            <el-option label="DeepSeek" value="deepseek" />
            <el-option label="Kimi (月之暗面)" value="kimi" />
            <el-option label="OpenAI" value="openai" />
            <el-option label="通义千问" value="qwen" />
            <el-option label="文心一言" value="ernie" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="显示名称" prop="displayName">
          <el-input v-model="form.displayName" placeholder="如：DeepSeek V3" />
        </el-form-item>
        <el-form-item label="API Key" prop="apiKey">
          <el-input
            v-model="form.apiKey"
            type="password"
            show-password
            :placeholder="isEdit ? '留空则保持原 Key 不变' : '请输入 API Key'"
          />
        </el-form-item>
        <el-form-item label="API Base" prop="apiBase">
          <el-input v-model="form.apiBase" placeholder="https://api.deepseek.com" />
        </el-form-item>
        <el-form-item label="模型名称" prop="modelName">
          <el-input v-model="form.modelName" placeholder="deepseek-chat" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="权重">
              <el-input-number v-model="form.weight" :min="0" :max="100" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级">
              <el-input-number v-model="form.priority" :min="1" :max="999" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="余额查询URL">
          <el-input v-model="form.balanceQueryUrl" placeholder="留空表示不支持余额查询" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="启用">
              <el-switch v-model="form.isEnabled" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设为默认">
              <el-switch v-model="form.isDefault" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 测试连接结果 -->
      <el-alert
        v-if="testResult"
        :title="testResult"
        :type="testResultType"
        :closable="false"
        style="margin-top: 12px"
      />

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button :loading="testLoading" @click="onTestFormConnection">测试连接</el-button>
        <el-button type="primary" :loading="submitLoading" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { aiProviderApi, type ProviderConfigVO, type LoadBalanceStrategy } from '../../../api/ai-provider'

const providers = ref<ProviderConfigVO[]>([])
const loading = ref(false)
const currentStrategy = ref<LoadBalanceStrategy>('weighted')
const activeProviderName = ref('')
const cooldownList = ref<number[]>([])
const balanceMap = ref<Record<number, number>>({})
const balanceLoadingMap = ref<Record<number, boolean>>({})
const alertMap = ref<Record<number, string>>({})
const seedLoading = ref(false)

const enabledCount = computed(() => providers.value.filter(p => p.isEnabled === 1).length)
const strategyLabel = computed(() => {
  const map: Record<string, string> = { weighted: '权重分配', primary_backup: '主备模式', round_robin: '轮询' }
  return map[currentStrategy.value] || currentStrategy.value
})

// ==================== 弹窗 ====================
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const submitLoading = ref(false)
const testLoading = ref(false)
const testResult = ref('')
const testResultType = ref<'success' | 'error'>('success')
const formRef = ref<FormInstance>()

const dialogTitle = computed(() => (isEdit.value ? '编辑 Provider' : '添加 Provider'))

const form = ref({
  providerKey: '',
  displayName: '',
  apiKey: '',
  apiBase: '',
  modelName: '',
  weight: 10,
  priority: 100,
  isEnabled: true,
  isDefault: false,
  balanceQueryUrl: '',
})

const formRules: FormRules = {
  providerKey: [{ required: true, message: '请选择服务商类型', trigger: 'change' }],
  displayName: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
  apiBase: [{ required: true, message: '请输入 API Base', trigger: 'blur' }],
  modelName: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
}

function openCreate() {
  isEdit.value = false
  editId.value = null
  testResult.value = ''
  dialogVisible.value = true
}

function openEdit(row: ProviderConfigVO) {
  isEdit.value = true
  editId.value = row.id
  testResult.value = ''
  form.value = {
    providerKey: row.providerKey,
    displayName: row.displayName,
    apiKey: '',
    apiBase: row.apiBase,
    modelName: row.modelName,
    weight: row.weight,
    priority: row.priority,
    isEnabled: row.isEnabled === 1,
    isDefault: row.isDefault === 1,
    balanceQueryUrl: row.balanceQueryUrl || '',
  }
  dialogVisible.value = true
}

function resetForm() {
  formRef.value?.resetFields()
  testResult.value = ''
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    if (isEdit.value && editId.value) {
      const data: Record<string, any> = { ...form.value }
      if (!data.apiKey) delete data.apiKey
      await aiProviderApi.update(editId.value, data)
      ElMessage.success('Provider 已更新')
    } else {
      await aiProviderApi.create(form.value)
      ElMessage.success('Provider 已添加')
    }
    dialogVisible.value = false
    await fetchProviders()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

// ==================== 行操作 ====================
async function onToggleEnabled(row: ProviderConfigVO, val: boolean) {
  try {
    await aiProviderApi.update(row.id, { isEnabled: val } as any)
    row.isEnabled = val ? 1 : 0
    ElMessage.success(val ? '已启用' : '已禁用')
  } catch {
    // 恢复
  }
}

async function onSetDefault(row: ProviderConfigVO) {
  try {
    await aiProviderApi.setDefault(row.id)
    providers.value.forEach(p => (p.isDefault = p.id === row.id ? 1 : 0))
    ElMessage.success(`${row.displayName} 已设为默认`)
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

async function onWeightChange(row: ProviderConfigVO, val: number | undefined) {
  if (val === undefined) return
  try {
    await aiProviderApi.update(row.id, { weight: val } as any)
    row.weight = val
  } catch {}
}

async function onPriorityChange(row: ProviderConfigVO, val: number | undefined) {
  if (val === undefined) return
  try {
    await aiProviderApi.update(row.id, { priority: val } as any)
    row.priority = val
  } catch {}
}

async function onDelete(row: ProviderConfigVO) {
  try {
    await aiProviderApi.remove(row.id)
    ElMessage.success('已删除')
    await fetchProviders()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

async function onQueryBalance(row: ProviderConfigVO) {
  balanceLoadingMap.value[row.id] = true
  try {
    const res = await aiProviderApi.queryBalance(row.id)
    balanceMap.value[row.id] = res.data?.currentBalance ?? -1
    const alertsRes = await aiProviderApi.getBalanceAlerts()
    alertsRes.data?.forEach((a: any) => {
      alertMap.value[a.providerId] = a.alertStatus
    })
  } catch {
    balanceMap.value[row.id] = -1
  } finally {
    balanceLoadingMap.value[row.id] = false
  }
}

async function onTestConnection(row: ProviderConfigVO) {
  try {
    // 间接通过查询余额测试连接
    await aiProviderApi.queryBalance(row.id)
    ElMessage.success(`${row.displayName} 连接正常`)
  } catch {
    ElMessage.warning(`${row.displayName} 连接测试异常`)
  }
}

async function onTestFormConnection() {
  testLoading.value = true
  testResult.value = ''
  try {
    // 用表单内容临时测试：调用后端测试接口
    await aiProviderApi.testConnection(editId.value || 0)
    testResult.value = '连接成功'
    testResultType.value = 'success'
  } catch {
    testResult.value = '连接失败，请检查 API Key 和 Base URL'
    testResultType.value = 'error'
  } finally {
    testLoading.value = false
  }
}

async function onStrategyChange(strategy: LoadBalanceStrategy) {
  try {
    await aiProviderApi.setStrategy(strategy)
    ElMessage.success(`策略已切换为: ${strategyLabel.value}`)
  } catch (e: any) {
    ElMessage.error(e?.message || '切换失败')
  }
}

// ==================== 数据加载 ====================
async function fetchProviders() {
  loading.value = true
  try {
    const res = await aiProviderApi.getList()
    providers.value = res.data ?? []
    // 活跃 Provider = 第一个启用的
    const first = providers.value.find(p => p.isEnabled === 1)
    activeProviderName.value = first?.displayName || '无'
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function fetchExtra() {
  try {
    const [strategyRes, cooldownRes, alertsRes] = await Promise.allSettled([
      aiProviderApi.getStrategy(),
      aiProviderApi.getCooldownList(),
      aiProviderApi.getBalanceAlerts(),
    ])
    if (strategyRes.status === 'fulfilled') {
      currentStrategy.value = strategyRes.value.data?.strategy ?? 'weighted'
    }
    if (cooldownRes.status === 'fulfilled') {
      cooldownList.value = cooldownRes.value.data?.ids ?? []
    }
    if (alertsRes.status === 'fulfilled') {
      alertsRes.value.data?.forEach((a: any) => {
        alertMap.value[a.providerId] = a.alertStatus
      })
    }
  } catch {}
}

async function onSeedFromEnv() {
  seedLoading.value = true
  try {
    const res = await aiProviderApi.seedFromEnv()
    ElMessage.success(res.data?.message || '同步完成')
    await fetchProviders()
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    seedLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchProviders(), fetchExtra()])
})
</script>

<style lang="scss" scoped>
.ai-provider-page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title { font-size: 22px; font-weight: 600; margin: 0; color: #303133; }
.header-actions { display: flex; align-items: center; gap: 12px; }

.summary-row { margin-bottom: 20px; }
.summary-item { display: flex; justify-content: space-between; align-items: center; }
.summary-label { color: #909399; font-size: 14px; }
.summary-val { font-size: 20px; font-weight: bold; color: #303133; }
.text-danger { color: #F56C6C !important; }

.table-card { margin-bottom: 20px; }
.card-header-row { display: flex; justify-content: space-between; align-items: center; }

.balance-cell { display: flex; align-items: center; gap: 8px; }
.balance-val { font-size: 13px; color: #606266; }
</style>
