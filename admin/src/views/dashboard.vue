<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2 class="page-title">数据看板</h2>
      <el-radio-group v-model="timeRange" size="default" @change="handleTimeRangeChange">
        <el-radio-button label="today">今日</el-radio-button>
        <el-radio-button label="week">本周</el-radio-button>
        <el-radio-button label="month">本月</el-radio-button>
        <el-radio-button label="year">本年</el-radio-button>
      </el-radio-group>
    </div>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <stats-card
          title="总用户数"
          :value="stats.totalUsers"
          icon="User"
          color="#409EFF"
          :change="stats.userGrowth"
        />
      </el-col>
      <el-col :span="6">
        <stats-card
          title="今日新增"
          :value="stats.todayNewUsers"
          icon="Plus"
          color="#67C23A"
          :change="stats.todayGrowth"
        />
      </el-col>
      <el-col :span="6">
        <stats-card
          title="付费会员"
          :value="stats.vipUsers"
          suffix="人"
          icon="Medal"
          color="#E6A23C"
        />
      </el-col>
      <el-col :span="6">
        <stats-card
          title="今日营收"
          :value="stats.todayRevenue"
          prefix="¥"
          icon="Money"
          color="#F56C6C"
          :change="stats.revenueGrowth"
        />
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3>用户增长趋势</h3>
            <el-radio-group v-model="userChartType" size="small">
              <el-radio-button label="daily">日</el-radio-button>
              <el-radio-button label="weekly">周</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="userChartRef" class="chart-container"></div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="chart-card">
          <div class="chart-header">
            <h3>性别分布</h3>
          </div>
          <div ref="genderChartRef" class="chart-container"></div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="chart-card">
          <div class="chart-header">
            <h3>年龄分布</h3>
          </div>
          <div ref="ageChartRef" class="chart-container"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3>营收趋势</h3>
          </div>
          <div ref="revenueChartRef" class="chart-container"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3>会员转化漏斗</h3>
          </div>
          <div ref="funnelChartRef" class="chart-container"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="table-row">
      <el-col :span="12">
        <div class="table-card">
          <div class="table-header">
            <h3>最新注册用户</h3>
            <el-button type="primary" link @click="$router.push('/user/list')">
              查看更多
            </el-button>
          </div>
          <el-table :data="latestUsers" style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="nickname" label="昵称" min-width="120" />
            <el-table-column prop="gender" label="性别" width="80">
              <template #default="{ row }">
                {{ row.gender === 1 ? '男' : row.gender === 2 ? '女' : '未知' }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="注册时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="table-card">
          <div class="table-header">
            <h3>最新订单</h3>
            <el-button type="primary" link @click="$router.push('/payment/list')">
              查看更多
            </el-button>
          </div>
          <el-table :data="latestOrders" style="width: 100%">
            <el-table-column prop="orderNo" label="订单号" min-width="180" />
            <el-table-column prop="vipLevel" label="套餐" width="120">
              <template #default="{ row }">
                {{ getVipName(row.vipLevel) }}
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">
                ¥{{ row.amount }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="下单时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import StatsCard from '../components/stats-card.vue'
import { ElMessage } from 'element-plus'
import { adminDashboard, adminUsers, adminOrders } from '../api'

interface Stats {
  totalUsers: number
  todayNewUsers: number
  userGrowth: number
  todayGrowth: number
  vipUsers: number
  todayRevenue: number
  revenueGrowth: number
}

interface UserTrend {
  date: string
  total: number
  male: number
  female: number
}

interface GenderDistribution {
  name: string
  value: number
}

interface AgeDistribution {
  name: string
  value: number
}

interface RevenueTrend {
  date: string
  amount: number
  cumulative: number
}

interface FunnelData {
  name: string
  value: number
}

const timeRange = ref('month')
const userChartType = ref('daily')
const stats = reactive<Stats>({
  totalUsers: 0,
  todayNewUsers: 0,
  userGrowth: 0,
  todayGrowth: 0,
  vipUsers: 0,
  todayRevenue: 0,
  revenueGrowth: 0,
})
const latestUsers = ref<any[]>([])
const latestOrders = ref<any[]>([])

let userChart: echarts.ECharts | null = null
let genderChart: echarts.ECharts | null = null
let ageChart: echarts.ECharts | null = null
let revenueChart: echarts.ECharts | null = null
let funnelChart: echarts.ECharts | null = null

const userChartRef = ref<HTMLElement>()
const genderChartRef = ref<HTMLElement>()
const ageChartRef = ref<HTMLElement>()
const revenueChartRef = ref<HTMLElement>()
const funnelChartRef = ref<HTMLElement>()

onMounted(() => {
  fetchDashboardData()
  initCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  userChart?.dispose()
  genderChart?.dispose()
  ageChart?.dispose()
  revenueChart?.dispose()
  funnelChart?.dispose()
})

async function fetchDashboardData() {
  try {
    const results = await Promise.allSettled([
      adminDashboard.getStats({ timeRange: timeRange.value }),
      adminUsers.list({ page: 1, limit: 10, sort: 'createdAt', order: 'desc' }),
      adminOrders.list({ page: 1, limit: 10, sort: 'createdAt', order: 'desc' }),
      adminDashboard.getUserTrend({ timeRange: timeRange.value }),
      adminDashboard.getGenderDistribution(),
      adminDashboard.getAgeDistribution(),
      adminDashboard.getRevenueTrend({ timeRange: timeRange.value }),
      adminDashboard.getFunnelData(),
    ])

    const [dashboardRes, usersRes, ordersRes, userTrendRes, genderRes, ageRes, revenueRes, funnelRes] = results

    if (dashboardRes.status === 'fulfilled' && dashboardRes.value.success) {
      Object.assign(stats, dashboardRes.value.data)
    }

    if (usersRes.status === 'fulfilled' && usersRes.value.success) {
      latestUsers.value = usersRes.value.list || []
    }

    if (ordersRes.status === 'fulfilled' && ordersRes.value.success) {
      latestOrders.value = ordersRes.value.list || []
    }

    await nextTick()
    updateCharts(
      userTrendRes.status === 'fulfilled' && userTrendRes.value.success ? userTrendRes.value.data : [],
      genderRes.status === 'fulfilled' && genderRes.value.success ? genderRes.value.data : [],
      ageRes.status === 'fulfilled' && ageRes.value.success ? ageRes.value.data : [],
      revenueRes.status === 'fulfilled' && revenueRes.value.success ? revenueRes.value.data : [],
      funnelRes.status === 'fulfilled' && funnelRes.value.success ? funnelRes.value.data : []
    )
  } catch (error) {
    console.error('Fetch dashboard data error:', error)
    ElMessage.error('获取数据失败')
  }
}

function initCharts() {
  if (userChartRef.value) {
    userChart = echarts.init(userChartRef.value)
  }
  if (genderChartRef.value) {
    genderChart = echarts.init(genderChartRef.value)
  }
  if (ageChartRef.value) {
    ageChart = echarts.init(ageChartRef.value)
  }
  if (revenueChartRef.value) {
    revenueChart = echarts.init(revenueChartRef.value)
  }
  if (funnelChartRef.value) {
    funnelChart = echarts.init(funnelChartRef.value)
  }
}

function updateCharts(
  userTrendData: any[] = [],
  genderData: any[] = [],
  ageData: any[] = [],
  revenueData: any[] = [],
  funnelData: any[] = []
) {
  updateUserChart(userTrendData)
  updateGenderChart(genderData)
  updateAgeChart(ageData)
  updateRevenueChart(revenueData)
  updateFunnelChart(funnelData)
}

function updateUserChart(data: any[] = []) {
  if (!userChart) return

  const dates = data.map(item => item.date)
  const totalData = data.map(item => item.total)
  const maleData = data.map(item => item.male)
  const femaleData = data.map(item => item.female)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['总新增', '男性', '女性'],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates.length > 0 ? dates : ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '总新增',
        type: 'line',
        smooth: true,
        data: totalData.length > 0 ? totalData : [0, 0, 0, 0, 0, 0, 0],
        itemStyle: { color: '#409EFF' },
      },
      {
        name: '男性',
        type: 'line',
        smooth: true,
        data: maleData.length > 0 ? maleData : [0, 0, 0, 0, 0, 0, 0],
        itemStyle: { color: '#67C23A' },
      },
      {
        name: '女性',
        type: 'line',
        smooth: true,
        data: femaleData.length > 0 ? femaleData : [0, 0, 0, 0, 0, 0, 0],
        itemStyle: { color: '#F56C6C' },
      },
    ],
  }

  userChart.setOption(option)
}

function updateGenderChart(data: any[] = []) {
  if (!genderChart) return

  const colors: Record<string, string> = {
    '男性': '#409EFF',
    '女性': '#F56C6C',
    '未知': '#909399',
  }

  const chartData = data.length > 0 
    ? data.map((item: { name: string; value: number }) => ({
        ...item,
        itemStyle: { color: colors[item.name] || '#909399' },
      }))
    : [
        { value: 0, name: '男性', itemStyle: { color: '#409EFF' } },
        { value: 0, name: '女性', itemStyle: { color: '#F56C6C' } },
        { value: 0, name: '未知', itemStyle: { color: '#909399' } },
      ]

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      bottom: 'middle',
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
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        data: chartData,
      },
    ],
  }

  genderChart.setOption(option)
}

function updateAgeChart(data: any[] = []) {
  if (!ageChart) return

  const colors: Record<string, string> = {
    '18-25岁': '#409EFF',
    '26-35岁': '#67C23A',
    '36-45岁': '#E6A23C',
    '45岁以上': '#F56C6C',
  }

  const chartData = data.length > 0
    ? data.map((item: { name: string; value: number }) => ({
        ...item,
        itemStyle: { color: colors[item.name] || '#909399' },
      }))
    : [
        { value: 0, name: '18-25岁', itemStyle: { color: '#409EFF' } },
        { value: 0, name: '26-35岁', itemStyle: { color: '#67C23A' } },
        { value: 0, name: '36-45岁', itemStyle: { color: '#E6A23C' } },
        { value: 0, name: '45岁以上', itemStyle: { color: '#F56C6C' } },
      ]

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      bottom: 'middle',
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
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        data: chartData,
      },
    ],
  }

  ageChart.setOption(option)
}

function updateRevenueChart(data: any[] = []) {
  if (!revenueChart) return

  const dates = data.map(item => item.date)
  const amountData = data.map(item => item.amount)
  const cumulativeData = data.map(item => item.cumulative)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: ['日营收', '累计营收'],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates.length > 0 ? dates : ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    },
    yAxis: [
      {
        type: 'value',
        name: '日营收',
        position: 'left',
        axisLabel: {
          formatter: '¥{value}',
        },
      },
      {
        type: 'value',
        name: '累计营收',
        position: 'right',
        axisLabel: {
          formatter: '¥{value}',
        },
      },
    ],
    series: [
      {
        name: '日营收',
        type: 'bar',
        data: amountData.length > 0 ? amountData : [0, 0, 0, 0, 0, 0, 0],
        itemStyle: { color: '#409EFF' },
      },
      {
        name: '累计营收',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: cumulativeData.length > 0 ? cumulativeData : [0, 0, 0, 0, 0, 0, 0],
        itemStyle: { color: '#F56C6C' },
      },
    ],
  }

  revenueChart.setOption(option)
}

function updateFunnelChart(data: any[] = []) {
  if (!funnelChart) return

  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C']

  const chartData = data.length > 0
    ? data.map((item, index) => ({
        ...item,
        itemStyle: { color: colors[index % colors.length] },
      }))
    : [
        { value: 0, name: '访问用户', itemStyle: { color: '#409EFF' } },
        { value: 0, name: '注册用户', itemStyle: { color: '#67C23A' } },
        { value: 0, name: '完善资料', itemStyle: { color: '#E6A23C' } },
        { value: 0, name: '开通VIP', itemStyle: { color: '#F56C6C' } },
      ]

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}',
    },
    series: [
      {
        type: 'funnel',
        left: '10%',
        top: 20,
        bottom: 20,
        width: '80%',
        min: 0,
        max: 100,
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: {
          show: true,
          position: 'inside',
          formatter: '{b}\n{c}人',
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1,
        },
        emphasis: {
          label: {
            fontSize: 16,
          },
        },
        data: chartData,
      },
    ],
  }

  funnelChart.setOption(option)
}

function handleResize() {
  userChart?.resize()
  genderChart?.resize()
  ageChart?.resize()
  revenueChart?.resize()
  funnelChart?.resize()
}

function handleTimeRangeChange() {
  fetchDashboardData()
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getVipName(level: number) {
  const map: Record<number, string> = {
    1: '黄金会员',
    2: '钻石会员',
    3: '至尊VIP',
  }
  return map[level] || '普通用户'
}
</script>

<style lang="scss" scoped>
.dashboard {
  padding: 0;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.chart-row {
  margin-bottom: 20px;
}

.table-row {
  margin-bottom: 20px;
}

.chart-card,
.table-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: bold;
    color: #333;
  }
}

.chart-container {
  width: 100%;
  height: 300px;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: bold;
    color: #333;
  }
}
</style>
