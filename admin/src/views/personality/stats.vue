<template>
  <div class="stats-page" v-loading="loading">
    <div class="page-header">
      <h2 class="page-title">测试数据统计</h2>
    </div>

    <!-- ==================== 概览 ==================== -->
    <el-row :gutter="16" class="overview-row">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">参与总人数</div>
          <div class="stat-value">{{ overview?.total ?? 0 }}</div>
          <div class="stat-sub">
            注册 {{ overview?.registeredTotal ?? 0 }} / 游客 {{ overview?.guestTotal ?? 0 }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">今日新增</div>
          <div class="stat-value">{{ overview?.todayNew ?? 0 }}</div>
          <div class="stat-sub">
            注册 {{ overview?.todayNewRegistered ?? 0 }} / 游客 {{ overview?.todayNewGuest ?? 0 }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">平均答题时长</div>
          <div class="stat-value">{{ formatDuration(overview?.avgDurationSeconds ?? 0) }}</div>
          <div class="stat-sub">开始 {{ overview?.startedTotal ?? 0 }} / 完成 {{ overview?.completedTotal ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">测试完成率</div>
          <div class="stat-value">{{ pct(overview?.completionRate ?? 0) }}</div>
          <div class="stat-sub">完成 {{ overview?.completedTotal ?? 0 }} 人</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ==================== 人格类型分布 ==================== -->
    <el-card shadow="never" class="section-card">
      <div class="section-head">
        <span class="section-title">人格类型分布</span>
        <el-button size="small" @click="exportTypeDistribution" :disabled="typeDist.items.length === 0">导出CSV</el-button>
      </div>
      <el-empty v-if="typeDist.items.length === 0" description="暂无数据" />
      <div v-show="typeDist.items.length > 0" ref="pieRef" class="chart"></div>
      <div class="chart-tip" v-if="typeDist.items.length > 0">点击扇区查看该类型用户列表</div>
    </el-card>

    <!-- ==================== 四维度分布 ==================== -->
    <el-card shadow="never" class="section-card">
      <div class="section-head">
        <span class="section-title">四维度分布</span>
      </div>
      <el-empty v-if="dimensions.length === 0" description="暂无数据" />
      <div v-show="dimensions.length > 0" ref="dimRef" class="chart"></div>
    </el-card>

    <!-- ==================== 题目选项统计 ==================== -->
    <el-card shadow="never" class="section-card">
      <div class="section-head">
        <span class="section-title">题目选项统计</span>
        <el-button size="small" @click="exportQuestionStats" :disabled="questions.length === 0">导出CSV</el-button>
      </div>
      <el-empty v-if="questions.length === 0" description="暂无数据" />
      <div v-for="q in questions" :key="q.questionId" class="question-block">
        <div class="question-title">{{ q.content }} <span class="muted">（{{ q.total }} 人作答）</span></div>
        <div v-for="opt in q.options" :key="opt.optionId" class="option-row">
          <div class="option-content">{{ opt.content }}</div>
          <el-progress
            class="option-progress"
            :percentage="Number((opt.ratio * 100).toFixed(1))"
            :stroke-width="14"
          />
          <div class="option-count">{{ opt.count }} 人</div>
        </div>
      </div>
    </el-card>

    <!-- ==================== 文案转化漏斗 ==================== -->
    <el-card shadow="never" class="section-card">
      <div class="section-head">
        <span class="section-title">文案转化漏斗</span>
        <el-button size="small" @click="exportFunnel" :disabled="funnels.length === 0">导出CSV</el-button>
      </div>
      <el-empty v-if="funnels.length === 0" description="暂无数据" />
      <div v-show="funnels.length > 0" ref="funnelRef" class="chart"></div>
      <el-table v-if="funnels.length > 0" :data="funnels" stripe style="margin-top: 12px">
        <el-table-column prop="slotName" label="文案位" min-width="140" show-overflow-tooltip />
        <el-table-column prop="impressions" label="曝光" width="100" align="center" />
        <el-table-column prop="clicks" label="点击" width="100" align="center" />
        <el-table-column prop="conversions" label="转化" width="100" align="center" />
        <el-table-column label="点击率" width="110" align="center">
          <template #default="{ row }">{{ pct(row.ctr) }}</template>
        </el-table-column>
        <el-table-column label="转化率" width="110" align="center">
          <template #default="{ row }">{{ pct(row.cvr) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ==================== 首页浮动按钮 ==================== -->
    <el-card shadow="never" class="section-card">
      <div class="section-head">
        <span class="section-title">首页浮动按钮</span>
      </div>
      <template v-if="floatBtn">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-card shadow="never" class="stat-card">
              <div class="stat-label">测试模式曝光</div>
              <div class="stat-value">{{ floatBtn.testModeImpressions }}</div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="never" class="stat-card">
              <div class="stat-label">测试模式点击</div>
              <div class="stat-value">{{ floatBtn.testModeClicks }}</div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="never" class="stat-card">
              <div class="stat-label">测试模式转化</div>
              <div class="stat-value">{{ floatBtn.testModeConversions }}</div>
            </el-card>
          </el-col>
        </el-row>
        <div v-if="!floatBtn.askModeTracked" class="muted note">问媒模式点击未接入独立埋点</div>
        <div v-else class="note">问媒模式点击：{{ floatBtn.askModeClicks ?? 0 }}</div>
      </template>
      <el-empty v-else description="暂无数据" />
    </el-card>

    <!-- ==================== 类型用户列表弹窗 ==================== -->
    <el-dialog v-model="userDialogVisible" :title="`${currentTypeName} - 用户列表`" width="560px">
      <el-table :data="typeUsers.list" v-loading="userLoading" stripe>
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="32" :src="row.avatar" />
              <span class="user-nickname">{{ row.nickname }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="性别" width="80" align="center">
          <template #default="{ row }">{{ genderLabel(row.gender) }}</template>
        </el-table-column>
        <el-table-column prop="testedAt" label="测试时间" min-width="160" />
      </el-table>
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="userPage"
          :page-size="userPageSize"
          :total="typeUsers.total"
          layout="total, prev, pager, next"
          @current-change="loadTypeUsers"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { personalityStatsApi } from '../../api/personality-stats'
import type {
  StatsOverview,
  TypeDistributionData,
  TypeDistributionItem,
  TypeUsersData,
  DimensionDistributionItem,
  QuestionStatItem,
  FunnelItem,
  FloatButtonData,
} from '../../api/personality-stats'

const loading = ref(false)

const overview = ref<StatsOverview | null>(null)
const typeDist = reactive<TypeDistributionData>({ total: 0, items: [] })
const dimensions = ref<DimensionDistributionItem[]>([])
const questions = ref<QuestionStatItem[]>([])
const funnels = ref<FunnelItem[]>([])
const floatBtn = ref<FloatButtonData | null>(null)

const pieRef = ref<HTMLDivElement>()
const dimRef = ref<HTMLDivElement>()
const funnelRef = ref<HTMLDivElement>()
let pieChart: echarts.ECharts | null = null
let dimChart: echarts.ECharts | null = null
let funnelChart: echarts.ECharts | null = null

// ==================== 工具函数 ====================

const pct = (v: number) => `${(v * 100).toFixed(2)}%`

const formatDuration = (seconds: number) => {
  const s = Math.round(seconds || 0)
  const m = Math.floor(s / 60)
  const rest = s % 60
  return `${m}分${rest}秒`
}

const genderLabel = (g: number) => (g === 1 ? '男' : g === 2 ? '女' : '未知')

const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escape = (val: string | number) => {
    const s = String(val ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(escape).join(',')]
  rows.forEach((row) => lines.push(row.map(escape).join(',')))
  const content = '\ufeff' + lines.join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ==================== 数据加载 ====================

const loadAll = async () => {
  loading.value = true
  try {
    const [ovRes, tdRes, dimRes, qRes, fnRes, fbRes] = await Promise.all([
      personalityStatsApi.overview(),
      personalityStatsApi.typeDistribution(),
      personalityStatsApi.dimensionDistribution(),
      personalityStatsApi.questionStats(),
      personalityStatsApi.funnel(),
      personalityStatsApi.floatButton(),
    ])
    if (ovRes.success && ovRes.data) overview.value = ovRes.data
    if (tdRes.success && tdRes.data) {
      typeDist.total = tdRes.data.total
      typeDist.items = tdRes.data.items || []
    }
    if (dimRes.success && dimRes.data) dimensions.value = dimRes.data.items || []
    if (qRes.success && qRes.data) questions.value = qRes.data.items || []
    if (fnRes.success && fnRes.data) funnels.value = fnRes.data.items || []
    if (fbRes.success && fbRes.data) floatBtn.value = fbRes.data
    await nextTick()
    renderPie()
    renderDimension()
    renderFunnel()
  } catch { /* ignore */ }
  finally { loading.value = false }
}

// ==================== 图表 ====================

const renderPie = () => {
  if (!pieRef.value || typeDist.items.length === 0) return
  if (!pieChart) pieChart = echarts.init(pieRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { type: 'scroll', bottom: 0 },
    series: [
      {
        name: '人格类型',
        type: 'pie',
        radius: ['35%', '65%'],
        data: typeDist.items.map((it) => ({ name: it.typeName, value: it.count, typeCode: it.typeCode })),
      },
    ],
  }, true)
  pieChart.off('click')
  pieChart.on('click', (params: any) => {
    const code = params?.data?.typeCode
    const name = params?.data?.name
    if (code) openUserDialog(code, name)
  })
}

const renderDimension = () => {
  if (!dimRef.value || dimensions.value.length === 0) return
  if (!dimChart) dimChart = echarts.init(dimRef.value)
  // 收集所有方向标签作为 series
  const labelSet: string[] = []
  dimensions.value.forEach((d) => d.directions.forEach((dir) => {
    if (!labelSet.includes(dir.label)) labelSet.push(dir.label)
  }))
  const series = labelSet.map((label) => ({
    name: label,
    type: 'bar' as const,
    data: dimensions.value.map((d) => {
      const found = d.directions.find((dir) => dir.label === label)
      return found ? found.count : 0
    }),
  }))
  dimChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { type: 'scroll', bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: dimensions.value.map((d) => d.name) },
    yAxis: { type: 'value', minInterval: 1 },
    series,
  }, true)
}

const renderFunnel = () => {
  if (!funnelRef.value || funnels.value.length === 0) return
  if (!funnelChart) funnelChart = echarts.init(funnelRef.value)
  const series = funnels.value.map((f, idx) => ({
    name: f.slotName,
    type: 'funnel' as const,
    left: `${(idx * 100) / funnels.value.length}%`,
    width: `${100 / funnels.value.length - 4}%`,
    label: { position: 'inside' },
    data: [
      { name: '曝光', value: f.impressions },
      { name: '点击', value: f.clicks },
      { name: '转化', value: f.conversions },
    ],
  }))
  funnelChart.setOption({
    tooltip: { trigger: 'item', formatter: '{a}<br/>{b}: {c}' },
    legend: { data: ['曝光', '点击', '转化'], bottom: 0 },
    series,
  }, true)
}

const handleResize = () => {
  pieChart?.resize()
  dimChart?.resize()
  funnelChart?.resize()
}

// ==================== 类型用户弹窗 ====================

const userDialogVisible = ref(false)
const userLoading = ref(false)
const currentTypeCode = ref('')
const currentTypeName = ref('')
const userPage = ref(1)
const userPageSize = ref(10)
const typeUsers = reactive<TypeUsersData>({ total: 0, page: 1, pageSize: 10, list: [] })

const openUserDialog = (typeCode: string, typeName: string) => {
  currentTypeCode.value = typeCode
  currentTypeName.value = typeName
  userPage.value = 1
  userDialogVisible.value = true
  loadTypeUsers()
}

const loadTypeUsers = async () => {
  userLoading.value = true
  try {
    const res = await personalityStatsApi.typeUsers({
      typeCode: currentTypeCode.value,
      page: userPage.value,
      pageSize: userPageSize.value,
    })
    if (res.success && res.data) {
      typeUsers.total = res.data.total
      typeUsers.list = res.data.list || []
    }
  } catch { /* ignore */ }
  finally { userLoading.value = false }
}

// ==================== CSV 导出 ====================

const exportTypeDistribution = () => {
  const rows = typeDist.items.map((it): (string | number)[] => [
    it.typeCode,
    it.typeName,
    it.nickname || '',
    it.count,
    `${(it.ratio * 100).toFixed(2)}%`,
  ])
  downloadCsv('人格类型分布.csv', ['类型编码', '类型名称', '花名', '人数', '占比'], rows)
}

const exportQuestionStats = () => {
  const rows: (string | number)[][] = []
  questions.value.forEach((q) => {
    q.options.forEach((opt) => {
      rows.push([q.content, q.total, opt.content, opt.count, `${(opt.ratio * 100).toFixed(2)}%`])
    })
  })
  downloadCsv('题目选项统计.csv', ['题目', '作答人数', '选项', '选择人数', '占比'], rows)
}

const exportFunnel = () => {
  const rows = funnels.value.map((f): (string | number)[] => [
    f.slotName,
    f.impressions,
    f.clicks,
    f.conversions,
    `${(f.ctr * 100).toFixed(2)}%`,
    `${(f.cvr * 100).toFixed(2)}%`,
  ])
  downloadCsv('文案转化漏斗.csv', ['文案位', '曝光', '点击', '转化', '点击率', '转化率'], rows)
}

onMounted(() => {
  loadAll()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
  dimChart?.dispose()
  funnelChart?.dispose()
  pieChart = null
  dimChart = null
  funnelChart = null
})
</script>

<style lang="scss" scoped>
.stats-page { padding: 20px; }
.page-header { margin-bottom: 16px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; }
.overview-row { margin-bottom: 16px; }
.stat-card {
  .stat-label { color: #909399; font-size: 13px; }
  .stat-value { font-size: 26px; font-weight: 600; margin: 6px 0; }
  .stat-sub { color: #909399; font-size: 12px; }
}
.section-card { margin-bottom: 16px; }
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.section-title { font-size: 16px; font-weight: 600; }
.chart { width: 100%; height: 360px; }
.chart-tip { color: #909399; font-size: 12px; text-align: center; margin-top: 6px; }
.question-block { margin-bottom: 18px; }
.question-title { font-weight: 600; margin-bottom: 8px; }
.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.option-content { width: 200px; flex-shrink: 0; }
.option-progress { flex: 1; }
.option-count { width: 60px; text-align: right; color: #606266; font-size: 13px; }
.user-cell { display: flex; align-items: center; gap: 8px; }
.user-nickname { font-size: 14px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
.muted { color: #909399; }
.note { margin-top: 12px; font-size: 13px; }
</style>
