<template>
  <div class="ai-switch-page">
    <div class="page-header">
      <h2 class="page-title">AI功能开关</h2>
      <p class="page-desc">控制小程序端AI功能的开启与关闭，关闭后用户将无法使用对应功能</p>
    </div>

    <!-- 总开关卡片 -->
    <el-card class="master-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">AI功能总控</span>
          <el-tag :type="masterSwitch?.enabled ? 'success' : 'danger'">
            {{ masterSwitch?.enabled ? '已开启' : '已关闭' }}
          </el-tag>
        </div>
      </template>

      <div class="master-body">
        <div class="master-info">
          <el-icon :size="32" :color="masterSwitch?.enabled ? '#67C23A' : '#F56C6C'">
            <component :is="masterSwitch?.enabled ? 'CircleCheckFilled' : 'CircleCloseFilled'" />
          </el-icon>
          <div class="master-text">
            <p class="master-status-text">
              {{ masterSwitch?.enabled ? '所有AI功能正常运行中' : '所有AI功能已关闭' }}
            </p>
            <p class="master-time" v-if="masterSwitch?.lastModifiedAt">
              最后修改：{{ formatTime(masterSwitch.lastModifiedAt) }}
            </p>
          </div>
        </div>

        <el-button
          :type="masterSwitch?.enabled ? 'danger' : 'success'"
          @click="toggleMaster"
          :loading="masterLoading"
          v-if="isSuperAdmin"
        >
          {{ masterSwitch?.enabled ? '关闭总控' : '开启总控' }}
        </el-button>
        <el-tooltip v-else content="仅超级管理员可操作总开关" placement="top">
          <el-button disabled>{{ masterSwitch?.enabled ? '关闭总控' : '开启总控' }}</el-button>
        </el-tooltip>
      </div>
    </el-card>

    <el-divider />

    <!-- 子开关列表 -->
    <div class="sub-title">子功能开关</div>

    <el-card v-for="sw in subSwitches" :key="sw.key" class="sub-card" shadow="never">
      <div class="sub-body">
        <div class="sub-info">
          <span class="sub-label">{{ sw.label }}</span>
          <el-tag :type="sw.enabled ? 'success' : 'danger'" size="small">
            {{ sw.enabled ? '开启' : '关闭' }}
          </el-tag>
          <span class="sub-time" v-if="sw.lastModifiedAt">
            最后修改：{{ formatTime(sw.lastModifiedAt) }}
          </span>
        </div>

        <el-switch
          :model-value="sw.enabled"
          :loading="subLoading === sw.key"
          @change="(val: boolean) => toggleSub(sw, val)"
          :active-text="sw.enabled ? '' : '已关闭'"
          :inactive-text="sw.enabled ? '' : '已关闭'"
          active-color="#67C23A"
          inactive-color="#F56C6C"
        />
      </div>
    </el-card>

    <el-divider />

    <!-- 操作日志 -->
    <div class="log-section" v-if="logs.length > 0 || logTotal > 0">
      <div class="sub-title">开关操作日志</div>
      <el-table :data="logs" style="width: 100%" size="small" v-loading="logLoading">
        <el-table-column prop="featureKey" label="开关Key" width="240" />
        <el-table-column label="变更" width="100">
          <template #default="{ row }">
            <span :style="{ color: row.oldValue === '1' ? '#F56C6C' : '#67C23A' }">
              {{ row.oldValue === '1' ? '开' : '关' }}
            </span>
            <span style="margin: 0 4px">→</span>
            <span :style="{ color: row.newValue === '1' ? '#67C23A' : '#F56C6C' }">
              {{ row.newValue === '1' ? '开' : '关' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="operatorName" label="操作人" width="120" />
        <el-table-column prop="ipAddress" label="IP" width="150" />
        <el-table-column prop="createdAt" label="操作时间" width="180">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <div class="log-pagination" v-if="logTotal > 20">
        <el-pagination
          v-model:current-page="logPage"
          :total="logTotal"
          :page-size="20"
          layout="prev, pager, next"
          @current-change="loadLogs"
          small
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { useAdminStore } from '../../store/admin'
import { adminAi, type AiFeatureSwitch, type SwitchLogItem } from '../../api/ai'

const adminStore = useAdminStore()
const isSuperAdmin = computed(() => adminStore.userInfo?.role === 'super_admin')

// ===== 开关数据 =====
const masterSwitch = ref<AiFeatureSwitch | null>(null)
const subSwitches = ref<AiFeatureSwitch[]>([])
const masterLoading = ref(false)
const subLoading = ref<string | null>(null)

// ===== 日志数据 =====
const logs = ref<SwitchLogItem[]>([])
const logTotal = ref(0)
const logPage = ref(1)
const logLoading = ref(false)

onMounted(() => {
  loadSwitches()
  loadLogs()
})

async function loadSwitches() {
  try {
    const res = await adminAi.getSwitches()
    if (res.data) {
      masterSwitch.value = res.data.master
      subSwitches.value = res.data.features
    }
  } catch {
    ElMessage.error('加载开关配置失败')
  }
}

async function loadLogs() {
  logLoading.value = true
  try {
    const res = await adminAi.getSwitchLogs(logPage.value, 20)
    if (res.data) {
      logs.value = res.data.items
      logTotal.value = res.data.total
    }
  } catch {
    // 日志加载失败不提示
  } finally {
    logLoading.value = false
  }
}

async function toggleMaster() {
  const newVal = !masterSwitch.value?.enabled
  const action = newVal ? '开启' : '关闭'

  try {
    await ElMessageBox.confirm(
      `${action}后，小程序端所有用户将无法使用AI功能，确认${action}？`,
      '确认操作',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  masterLoading.value = true
  try {
    await adminAi.updateMasterSwitch(newVal)
    ElMessage.success(`总控已${action}`)
    await loadSwitches()
    logPage.value = 1
    await loadLogs()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    masterLoading.value = false
  }
}

async function toggleSub(sw: AiFeatureSwitch, newVal: boolean) {
  const action = newVal ? '开启' : '关闭'

  try {
    await ElMessageBox.confirm(
      `${action}「${sw.label}」后，小程序端所有用户将无法使用该功能，确认${action}？`,
      '确认操作',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  subLoading.value = sw.key
  try {
    await adminAi.updateSwitch(sw.keyName, newVal)
    ElMessage.success(`「${sw.label}」已${action}`)
    await loadSwitches()
    logPage.value = 1
    await loadLogs()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    subLoading.value = null
  }
}

function formatTime(iso: string) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}
</script>

<style lang="scss" scoped>
.ai-switch-page {
  padding: 20px;
  max-width: 900px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px;
}

.page-desc {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
}

.master-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.master-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.master-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.master-status-text {
  font-size: 15px;
  color: #303133;
  margin: 0;
}

.master-time {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

.sub-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.sub-card {
  margin-bottom: 12px;
}

.sub-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sub-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sub-label {
  font-size: 14px;
  color: #303133;
  min-width: 160px;
}

.sub-time {
  font-size: 12px;
  color: #909399;
}

.log-section {
  margin-top: 8px;
}

.log-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
