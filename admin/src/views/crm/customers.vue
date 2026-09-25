<template>
  <div class="crm-customers">
    <div class="page-header">
      <h2 class="page-title">CRM 客户管理</h2>
      <div class="header-actions">
        <el-button v-if="!isReadonly" type="primary" :disabled="selectedRows.length === 0" @click="openAssignDialog">
          <el-icon><UserFilled /></el-icon>
          分配负责人（{{ selectedRows.length }}）
        </el-button>
      </div>
    </div>

    <!-- 销售漏斗看板 -->
    <div class="funnel-cards">
      <div class="funnel-card total">
        <div class="funnel-value">{{ funnel.total }}</div>
        <div class="funnel-label">客户总数</div>
      </div>
      <div class="funnel-card unassigned">
        <div class="funnel-value">{{ funnel.unassigned }}</div>
        <div class="funnel-label">未分配</div>
      </div>
      <div
        v-for="s in funnel.stages"
        :key="s.value"
        class="funnel-card"
        :class="`stage-${s.value}`"
      >
        <div class="funnel-value">{{ s.count }}</div>
        <div class="funnel-label">{{ s.label }}</div>
      </div>
    </div>

    <div class="card">
      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm" class="filter-form">
          <el-form-item label="关键词">
            <el-input
              v-model="filterForm.keyword"
              placeholder="昵称/ID/手机号"
              clearable
              :prefix-icon="Search"
              style="width: 200px"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="阶段">
            <el-select v-model="filterForm.stage" placeholder="全部" clearable style="width: 140px">
              <el-option
                v-for="s in stageOptions"
                :key="s.value"
                :label="s.label"
                :value="s.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="负责人">
            <el-select v-model="filterForm.ownerId" placeholder="全部" clearable style="width: 160px">
              <el-option
                v-for="a in admins"
                :key="a.id"
                :label="a.nickname"
                :value="a.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        @selection-change="handleSelectionChange"
      >
        <el-table-column v-if="!isReadonly" type="selection" width="50" />
        <el-table-column label="用户ID" prop="userId" width="100" />
        <el-table-column label="昵称" min-width="140">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="32" :src="row.avatar" />
              <span>{{ row.nickname || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="性别" width="70">
          <template #default="{ row }">
            {{ row.gender === 1 ? '男' : row.gender === 2 ? '女' : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="手机号" prop="phone" width="130">
          <template #default="{ row }">{{ row.phone || '-' }}</template>
        </el-table-column>
        <el-table-column label="会员" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isVip" type="warning" size="small">VIP</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="阶段" width="110">
          <template #default="{ row }">
            <el-tag :type="CRM_STAGE_COLORS[row.crmStage] || 'info'" size="small">
              {{ CRM_STAGE_LABELS[row.crmStage] || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="负责人" width="120">
          <template #default="{ row }">
            <span :class="{ 'owner-empty': !row.ownerName }">{{ row.ownerName || '未分配' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openFollowDialog(row)">跟进记录</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </div>

    <!-- 线索分配对话框 -->
    <el-dialog v-model="assignDialogVisible" title="分配负责人" width="420px">
      <el-form label-width="80px">
        <el-form-item label="负责人">
          <el-select v-model="assignOwnerId" placeholder="请选择负责人" style="width: 100%">
            <el-option
              v-for="a in admins"
              :key="a.id"
              :label="`${a.nickname}（${roleLabel(a.role)}）`"
              :value="a.id"
            />
          </el-select>
        </el-form-item>
        <div class="assign-tip">将为选中的 {{ selectedRows.length }} 位客户分配负责人</div>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="assignLoading" @click="handleAssign">确定分配</el-button>
      </template>
    </el-dialog>

    <!-- 跟进记录对话框 -->
    <el-dialog v-model="followDialogVisible" title="跟进记录" width="640px">
      <div class="follow-header">
        <div class="follow-user">
          <el-avatar :size="40" :src="currentCustomer?.avatar" />
          <div>
            <div class="follow-name">{{ currentCustomer?.nickname || '-' }}</div>
            <div class="follow-meta">
              ID：{{ currentCustomer?.userId || '-' }} ｜ 手机：{{ currentCustomer?.phone || '-' }}
            </div>
          </div>
        </div>
      </div>

      <template v-if="!isReadonly">
        <el-divider content-position="left">新增跟进</el-divider>
        <el-form label-width="80px">
          <el-form-item label="跟进内容">
            <el-input
              v-model="followForm.content"
              type="textarea"
              :rows="3"
              placeholder="请输入本次跟进内容"
            />
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
              <el-option
                v-for="s in stageOptions"
                :key="s.value"
                :label="s.label"
                :value="s.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="followSaving" @click="handleCreateFollow">保存跟进</el-button>
          </el-form-item>
        </el-form>
      </template>

      <el-divider content-position="left">跟进时间线</el-divider>
      <el-timeline v-if="followRecords.length" class="follow-timeline">
        <el-timeline-item
          v-for="r in followRecords"
          :key="r.id"
          :timestamp="formatDate(r.createdAt)"
          placement="top"
        >
          <div class="timeline-item">
            <div class="timeline-content">{{ r.content }}</div>
            <div class="timeline-meta">
              <span>跟进人：{{ r.adminName }}</span>
              <span v-if="r.nextFollowAt">下次跟进：{{ formatDate(r.nextFollowAt) }}</span>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无跟进记录" :image-size="60" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, UserFilled } from '@element-plus/icons-vue'
import { crm, CRM_STAGE_LABELS, CRM_STAGE_COLORS } from '../../api/crm'
import type { CrmCustomer, CrmAssignableAdmin, CrmFollowRecord } from '../../api/crm'
import { ROLE_LABELS } from '../../config/constants'
import { useAdminStore } from '../../store/admin'
import { formatDate } from '../../utils/date'

const adminStore = useAdminStore()
const isReadonly = computed(() => adminStore.userInfo?.role === 'readonly')

const loading = ref(false)
const tableData = ref<CrmCustomer[]>([])
const selectedRows = ref<CrmCustomer[]>([])
const admins = ref<CrmAssignableAdmin[]>([])
const funnel = reactive({
  total: 0,
  unassigned: 0,
  stages: [] as { value: number; label: string; count: number }[],
})

const filterForm = reactive({
  keyword: '',
  stage: undefined as number | undefined,
  ownerId: undefined as number | undefined,
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

const stageOptions = computed(() =>
  Object.entries(CRM_STAGE_LABELS).map(([value, label]) => ({ value: Number(value), label })),
)

// 分配
const assignDialogVisible = ref(false)
const assignOwnerId = ref<number>()
const assignLoading = ref(false)

// 跟进
const followDialogVisible = ref(false)
const followSaving = ref(false)
const currentCustomer = ref<CrmCustomer | null>(null)
const followRecords = ref<CrmFollowRecord[]>([])
const followForm = reactive({
  content: '',
  nextFollowAt: '',
  stage: undefined as number | undefined,
})

function roleLabel(role: string): string {
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role
}

async function fetchFunnel() {
  const res = await crm.funnel()
  if (res.success && res.data) {
    funnel.total = res.data.total
    funnel.unassigned = res.data.unassigned
    funnel.stages = res.data.stages
  }
}

async function fetchAdmins() {
  const res = await crm.admins()
  if (res.success && res.data) {
    admins.value = res.data
  }
}

async function fetchData() {
  loading.value = true
  try {
    const res = await crm.listCustomers({
      page: pagination.page,
      limit: pagination.limit,
      keyword: filterForm.keyword || undefined,
      stage: filterForm.stage,
      ownerId: filterForm.ownerId,
    })
    if (res.success && res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  filterForm.keyword = ''
  filterForm.stage = undefined
  filterForm.ownerId = undefined
  pagination.page = 1
  fetchData()
}

function handleSelectionChange(rows: CrmCustomer[]) {
  selectedRows.value = rows
}

function openAssignDialog() {
  if (!selectedRows.value.length) return
  assignOwnerId.value = undefined
  assignDialogVisible.value = true
}

async function handleAssign() {
  if (!assignOwnerId.value) {
    ElMessage.warning('请选择负责人')
    return
  }
  assignLoading.value = true
  try {
    const ids = selectedRows.value.map((r) => r.id)
    const res = await crm.assign(ids, assignOwnerId.value)
    if (res.success) {
      ElMessage.success(res.message || '分配成功')
      assignDialogVisible.value = false
      selectedRows.value = []
      fetchData()
      fetchFunnel()
    } else {
      ElMessage.error(res.message || '分配失败')
    }
  } finally {
    assignLoading.value = false
  }
}

async function openFollowDialog(row: CrmCustomer) {
  currentCustomer.value = row
  followForm.content = ''
  followForm.nextFollowAt = ''
  followForm.stage = undefined
  followDialogVisible.value = true
  followRecords.value = []
  const res = await crm.followRecords(row.id)
  if (res.success && res.data) {
    followRecords.value = res.data
  }
}

async function handleCreateFollow() {
  if (!currentCustomer.value) return
  if (!followForm.content.trim()) {
    ElMessage.warning('请输入跟进内容')
    return
  }
  followSaving.value = true
  try {
    const res = await crm.createFollowRecord({
      userId: currentCustomer.value.id,
      content: followForm.content,
      nextFollowAt: followForm.nextFollowAt || undefined,
      stage: followForm.stage,
    })
    if (res.success) {
      ElMessage.success(res.message || '跟进记录已保存')
      followForm.content = ''
      followForm.nextFollowAt = ''
      followForm.stage = undefined
      // 刷新时间线与漏斗/列表（阶段可能变化）
      const r = await crm.followRecords(currentCustomer.value.id)
      if (r.success && r.data) followRecords.value = r.data
      fetchData()
      fetchFunnel()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } finally {
    followSaving.value = false
  }
}

onMounted(() => {
  fetchFunnel()
  fetchAdmins()
  fetchData()
})
</script>

<style lang="scss" scoped>
.crm-customers {
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

  .funnel-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;

    .funnel-card {
      background: #fff;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

      .funnel-value {
        font-size: 26px;
        font-weight: 700;
        color: #303133;
      }

      .funnel-label {
        margin-top: 4px;
        font-size: 13px;
        color: #909399;
      }

      &.total .funnel-value {
        color: #409eff;
      }
      &.unassigned .funnel-value {
        color: #e6a23c;
      }
    }
  }

  .card {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .filter-bar {
    margin-bottom: 12px;
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .user-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .owner-empty {
    color: #c0c4cc;
  }

  .assign-tip {
    color: #909399;
    font-size: 13px;
    margin-top: 4px;
  }

  .follow-header {
    margin-bottom: 8px;

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

  .follow-timeline {
    max-height: 320px;
    overflow-y: auto;
    padding-left: 4px;

    .timeline-item {
      .timeline-content {
        font-size: 14px;
        color: #303133;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .timeline-meta {
        margin-top: 6px;
        font-size: 12px;
        color: #909399;
        display: flex;
        gap: 16px;
      }
    }
  }
}
</style>
