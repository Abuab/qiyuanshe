<template>
  <div class="crm-workspace">
    <div class="page-header">
      <h2 class="page-title">红娘工作台</h2>
      <el-button type="primary" :icon="Refresh" @click="fetchAll">刷新</el-button>
    </div>

    <!-- 我的客户统计 -->
    <div class="stat-cards">
      <div class="stat-card total">
        <div class="stat-value">{{ workspace.myCustomerCount }}</div>
        <div class="stat-label">我的客户</div>
      </div>
      <div class="stat-card due">
        <div class="stat-value">{{ workspace.dueFollowUpCount }}</div>
        <div class="stat-label">待跟进</div>
      </div>
      <div
        v-for="s in stageOptions"
        :key="s.value"
        class="stat-card"
        :class="`stage-${s.value}`"
      >
        <div class="stat-value">{{ workspace.stageCounts[s.value] || 0 }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">待跟进客户</h3>
        <span class="card-sub">按最近一次“下次跟进时间”升序</span>
      </div>

      <el-table v-loading="loading" :data="workspace.dueFollowUps">
        <el-table-column label="客户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="36" :src="row.avatar" />
              <div>
                <div class="user-name">{{ row.nickname || '-' }}</div>
                <div class="user-phone">{{ row.phone || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="最近跟进内容" min-width="240">
          <template #default="{ row }">
            <span class="last-content">{{ row.lastContent || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="下次跟进时间" width="170">
          <template #default="{ row }">
            <el-tag type="warning" size="small">{{ formatDate(row.nextFollowAt) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openFollowDialog(row)">写跟进</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && workspace.dueFollowUps.length === 0" description="暂无待跟进客户" />
    </div>

    <!-- 写跟进对话框 -->
    <el-dialog v-model="followDialogVisible" title="写跟进" width="560px">
      <div class="follow-user">
        <el-avatar :size="40" :src="currentUser?.avatar" />
        <div>
          <div class="follow-name">{{ currentUser?.nickname || '-' }}</div>
          <div class="follow-meta">手机：{{ currentUser?.phone || '-' }}</div>
        </div>
      </div>

      <el-form label-width="80px" style="margin-top: 16px">
        <el-form-item label="跟进内容">
          <el-input v-model="followForm.content" type="textarea" :rows="3" placeholder="请输入本次跟进内容" />
        </el-form-item>
        <el-form-item label="下次跟进">
          <el-date-picker
            v-model="followForm.nextFollowAt"
            type="datetime"
            placeholder="选填，用于待办提醒"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="更新阶段">
          <el-select v-model="followForm.stage" placeholder="不修改" clearable style="width: 100%">
            <el-option v-for="s in stageOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="followSaving" @click="handleCreateFollow">保存跟进</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { crm, CRM_STAGE_LABELS } from '../../api/crm'
import type { CrmWorkspace, CrmDueFollowUp } from '../../api/crm'
import { formatDate } from '../../utils/date'

const loading = ref(false)
const workspace = reactive<CrmWorkspace>({
  myCustomerCount: 0,
  stageCounts: {},
  dueFollowUpCount: 0,
  dueFollowUps: [],
})

const stageOptions = computed(() =>
  Object.entries(CRM_STAGE_LABELS).map(([value, label]) => ({ value: Number(value), label })),
)

// 写跟进
const followDialogVisible = ref(false)
const followSaving = ref(false)
const currentUser = ref<CrmDueFollowUp | null>(null)
const followForm = reactive({
  content: '',
  nextFollowAt: '',
  stage: undefined as number | undefined,
})

async function fetchAll() {
  loading.value = true
  try {
    const res = await crm.workspace()
    if (res.success && res.data) {
      workspace.myCustomerCount = res.data.myCustomerCount
      workspace.stageCounts = res.data.stageCounts || {}
      workspace.dueFollowUpCount = res.data.dueFollowUpCount
      workspace.dueFollowUps = res.data.dueFollowUps || []
    }
  } finally {
    loading.value = false
  }
}

function openFollowDialog(row: CrmDueFollowUp) {
  currentUser.value = row
  followForm.content = ''
  followForm.nextFollowAt = ''
  followForm.stage = undefined
  followDialogVisible.value = true
}

async function handleCreateFollow() {
  if (!currentUser.value) return
  if (!followForm.content.trim()) {
    ElMessage.warning('请输入跟进内容')
    return
  }
  followSaving.value = true
  try {
    const res = await crm.createFollowRecord({
      userId: currentUser.value.userId,
      content: followForm.content,
      nextFollowAt: followForm.nextFollowAt || undefined,
      stage: followForm.stage,
    })
    if (res.success) {
      ElMessage.success(res.message || '跟进记录已保存')
      followDialogVisible.value = false
      fetchAll()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } finally {
    followSaving.value = false
  }
}

onMounted(fetchAll)
</script>

<style lang="scss" scoped>
.crm-workspace {
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
  }

  .stat-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;

    .stat-card {
      background: #fff;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

      .stat-value {
        font-size: 26px;
        font-weight: 700;
        color: #303133;
      }

      .stat-label {
        margin-top: 4px;
        font-size: 13px;
        color: #909399;
      }

      &.total .stat-value {
        color: #409eff;
      }
      &.due .stat-value {
        color: #e6a23c;
      }
    }
  }

  .card {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

    .card-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 12px;

      .card-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0;
      }

      .card-sub {
        font-size: 12px;
        color: #909399;
      }
    }
  }

  .user-cell {
    display: flex;
    align-items: center;
    gap: 10px;

    .user-name {
      font-size: 14px;
      font-weight: 500;
    }

    .user-phone {
      font-size: 12px;
      color: #909399;
      margin-top: 2px;
    }
  }

  .last-content {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
  }

  .follow-user {
    display: flex;
    align-items: center;
    gap: 12px;

    .follow-name {
      font-size: 15px;
      font-weight: 600;
    }

    .follow-meta {
      font-size: 13px;
      color: #909399;
      margin-top: 2px;
    }
  }
}
</style>
