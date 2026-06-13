<template>
  <div class="payment-list">
    <div class="page-header">
      <h2 class="page-title">订单列表</h2>
    </div>

    <div class="card">
      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm">
          <el-form-item label="订单号">
            <el-input
              v-model="filterForm.orderNo"
              placeholder="请输入订单号"
              clearable
              style="width: 180px"
            />
          </el-form-item>
          <el-form-item label="用户">
            <el-input
              v-model="filterForm.userKeyword"
              placeholder="昵称/手机号"
              clearable
              style="width: 150px"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 120px">
              <el-option label="全部" :value="undefined" />
              <el-option label="未支付" :value="0" />
              <el-option label="已支付" :value="1" />
              <el-option label="已退款" :value="2" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 240px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table
        ref="tableRef"
        :data="tableData"
        v-loading="loading"
        row-key="id"
      >
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column label="用户" width="150">
          <template #default="{ row }">
            <div class="user-info">
              <el-image :src="row.userAvatar" fit="cover" style="width: 32px; height: 32px; border-radius: 50%">
                <template #error>
                  <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border-radius:50%">
                    <el-icon :size="16"><User /></el-icon>
                  </div>
                </template>
              </el-image>
              <span>{{ row.userNickname || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="packageName" label="套餐" width="150">
          <template #default="{ row }">
            <el-tag type="primary" size="small">{{ row.packageName || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">
            <span class="amount">¥{{ row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusName(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="payTime" label="支付时间" width="160">
          <template #default="{ row }">
            {{ row.payTime ? formatDate(row.payTime) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">详情</el-button>
            <el-button
              v-if="row.status === 1"
              type="danger"
              link
              @click="handleRefund(row)"
            >
              退款
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <el-dialog v-model="detailDialogVisible" title="订单详情" width="600px">
      <el-descriptions v-if="currentOrder" :column="2" border>
        <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(currentOrder.status)" size="small">
            {{ getStatusName(currentOrder.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="用户">
          <div class="user-info">
            <el-avatar :size="32" :src="currentOrder.userAvatar" />
            <span>{{ currentOrder.userNickname }}</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="手机号">{{ currentOrder.userPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="套餐">{{ currentOrder.packageName }}</el-descriptions-item>
        <el-descriptions-item label="金额">
          <span class="amount">¥{{ currentOrder.amount }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="支付方式">
          {{ currentOrder.payMethod === 'wechat' ? '微信支付' : currentOrder.payMethod === 'alipay' ? '支付宝' : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="支付时间">
          {{ currentOrder.payTime ? formatDate(currentOrder.payTime) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">
          {{ formatDate(currentOrder.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="refundDialogVisible" title="确认退款" width="400px">
      <p>确定要退款该订单吗？退款将原路返回。</p>
      <el-form :model="refundForm" label-width="80px" style="margin-top: 16px">
        <el-form-item label="退款原因">
          <el-input
            v-model="refundForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入退款原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmRefund" :loading="refundLoading">确认退款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import { adminPayment } from '../../api'
import { formatDate } from '../../utils/date'
import type { Order } from '../../api/payment'

const loading = ref(false)
const tableData = ref<Order[]>([])
const dateRange = ref<[string, string] | null>(null)
const detailDialogVisible = ref(false)
const refundDialogVisible = ref(false)
const refundLoading = ref(false)
const currentOrder = ref<Order | null>(null)

const filterForm = reactive({
  orderNo: '',
  userKeyword: '',
  status: undefined as number | undefined,
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

const refundForm = reactive({
  reason: '',
})

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const res = await adminPayment.orders({
      page: pagination.page,
      limit: pagination.limit,
      orderNo: filterForm.orderNo || undefined,
      userKeyword: filterForm.userKeyword || undefined,
      status: filterForm.status,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
    })

    if (res.success && res.data) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  filterForm.orderNo = ''
  filterForm.userKeyword = ''
  filterForm.status = undefined
  dateRange.value = null
  pagination.page = 1
  fetchData()
}

function handleSizeChange() {
  pagination.page = 1
  fetchData()
}

function handlePageChange() {
  fetchData()
}

function handleView(row: Order) {
  currentOrder.value = row
  detailDialogVisible.value = true
}

function handleRefund(row: Order) {
  currentOrder.value = row
  refundForm.reason = ''
  refundDialogVisible.value = true
}

async function confirmRefund() {
  if (!currentOrder.value) return

  refundLoading.value = true
  try {
    await ElMessageBox.confirm(
      '确定要退款该订单吗？退款将原路返回。',
      '确认退款',
      { type: 'warning' }
    )

    await adminPayment.refund(currentOrder.value.id, refundForm.reason || '用户申请退款')
    ElMessage.success('退款成功')
    refundDialogVisible.value = false
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  } finally {
    refundLoading.value = false
  }
}

function getStatusName(status: number) {
  const map: Record<number, string> = {
    0: '未支付',
    1: '已支付',
    2: '已退款',
  }
  return map[status] || '未知'
}

function getStatusTagType(status: number) {
  const map: Record<number, string> = {
    0: 'info',
    1: 'success',
    2: 'danger',
  }
  return map[status] || 'info'
}
</script>

<style lang="scss" scoped>
.payment-list {
  padding: 20px;
}

.page-header {
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

.filter-bar {
  margin-bottom: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.amount {
  font-weight: bold;
  color: #f56c6c;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
