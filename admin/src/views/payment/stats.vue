<template>
  <div class="payment-stats">
    <div class="page-header">
      <h2 class="page-title">营收统计</h2>
    </div>

    <div class="filter-bar">
      <el-radio-group v-model="timeRange" @change="handleTimeRangeChange">
        <el-radio-button label="today">今日</el-radio-button>
        <el-radio-button label="week">本周</el-radio-button>
        <el-radio-button label="month">本月</el-radio-button>
        <el-radio-button label="custom">自定义</el-radio-button>
      </el-radio-group>
      <el-date-picker
        v-if="timeRange === 'custom'"
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="margin-left: 16px"
        @change="handleDateChange"
      />
    </div>

    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">总营收</div>
          <div class="stat-value primary">¥{{ formatNumber(stats.totalRevenue) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">订单数</div>
          <div class="stat-value">{{ formatNumber(stats.orderCount) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">客单价</div>
          <div class="stat-value">¥{{ stats.averageAmount.toFixed(2) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">退款金额</div>
          <div class="stat-value danger">¥{{ formatNumber(stats.refundAmount) }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">营收趋势</div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">支付方式</div>
          </template>
          <div ref="paymentMethodChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">套餐销量</div>
          </template>
          <div ref="packageChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">每日营收明细</div>
          </template>
          <el-table :data="dailyStats" height="300">
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="orderCount" label="订单数" width="100" />
            <el-table-column prop="revenue" label="营收" width="120">
              <template #default="{ row }">
                <span class="amount">¥{{ formatNumber(row.revenue) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="refund" label="退款">
              <template #default="{ row }">
                <span class="refund-amount">¥{{ formatNumber(row.refund) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { adminPayment } from '../../api'
import type { ECharts } from 'echarts'

interface StatsData {
  totalRevenue: number
  orderCount: number
  averageAmount: number
  refundAmount: number
}

interface DailyStat {
  date: string
  orderCount: number
  revenue: number
  refund: number
}

const timeRange = ref('today')
const dateRange = ref<[string, string] | null>(null)

const stats = reactive<StatsData>({
  totalRevenue: 0,
  orderCount: 0,
  averageAmount: 0,
  refundAmount: 0,
})

const dailyStats = ref<DailyStat[]>([])

const trendChartRef = ref<HTMLDivElement>()
const paymentMethodChartRef = ref<HTMLDivElement>()
const packageChartRef = ref<HTMLDivElement>()

let trendChart: ECharts | null = null
let paymentMethodChart: ECharts | null = null
let packageChart: ECharts | null = null

onMounted(() => {
  fetchData()
})

onUnmounted(() => {
  trendChart?.dispose()
  paymentMethodChart?.dispose()
  packageChart?.dispose()
})

async function fetchData() {
  try {
    const res = await adminPayment.stats({
      timeRange: timeRange.value,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
    })

    if (res.success && res.data) {
      Object.assign(stats, res.data.stats)
      dailyStats.value = res.data.dailyStats || []

      initTrendChart(res.data.trendData || [])
      initPaymentMethodChart(res.data.paymentMethodData || {})
      initPackageChart(res.data.packageData || [])
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取统计数据失败')
  }
}

function handleTimeRangeChange() {
  if (timeRange.value !== 'custom') {
    dateRange.value = null
    fetchData()
  }
}

function handleDateChange() {
  if (dateRange.value) {
    fetchData()
  }
}

function initTrendChart(data: { date: string; revenue: number }[]) {
  if (!trendChartRef.value) return

  trendChart = echarts.init(trendChartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.date),
    },
    yAxis: {
      type: 'value',
      name: '营收（元）',
    },
    series: [
      {
        name: '营收',
        type: 'line',
        data: data.map((item) => item.revenue),
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
          ]),
        },
        lineStyle: {
          color: '#409eff',
        },
        itemStyle: {
          color: '#409eff',
        },
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
  }

  trendChart.setOption(option)
}

function initPaymentMethodChart(data: Record<string, number>) {
  if (!paymentMethodChartRef.value) return

  paymentMethodChart = echarts.init(paymentMethodChartRef.value)

  const methodMap: Record<string, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
    bank: '银行卡',
  }

  const chartData = Object.entries(data).map(([key, value]) => ({
    name: methodMap[key] || key,
    value,
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {d}%',
        },
        data: chartData,
        color: ['#4ade80', '#409eff', '#f59e0b'],
      },
    ],
  }

  paymentMethodChart.setOption(option)
}

function initPackageChart(data: { name: string; count: number }[]) {
  if (!packageChartRef.value) return

  packageChart = echarts.init(packageChartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      axisLabel: {
        rotate: 30,
      },
    },
    yAxis: {
      type: 'value',
      name: '销量',
    },
    series: [
      {
        name: '销量',
        type: 'bar',
        data: data.map((item) => item.count),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#409eff' },
            { offset: 1, color: '#66b1ff' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
  }

  packageChart.setOption(option)
}

function formatNumber(num: number) {
  if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  }
  return num.toLocaleString('zh-CN')
}
</script>

<style lang="scss" scoped>
.payment-stats {
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

.filter-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.stats-cards {
  margin-bottom: 20px;

  .stat-card {
    background-color: #fff;
    border-radius: 8px;
    padding: 20px;
    text-align: center;

    .stat-label {
      font-size: 14px;
      color: #909399;
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #303133;

      &.primary {
        color: #409eff;
      }

      &.danger {
        color: #f56c6c;
      }
    }
  }
}

.charts-row {
  margin-bottom: 20px;

  .card-header {
    font-weight: bold;
  }

  .chart-container {
    height: 300px;
  }
}

.amount {
  font-weight: bold;
  color: #409eff;
}

.refund-amount {
  color: #f56c6c;
}
</style>
