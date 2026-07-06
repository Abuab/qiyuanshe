<template>
  <div class="page">
    <div class="page-header">
      <div class="title-wrap">
        <el-button link @click="goBack">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2 class="page-title">{{ slotName }}</h2>
        <el-tag v-if="displayMode" :type="modeTagType" size="small">{{ modeLabel }}</el-tag>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <!-- ===================== 文案管理 ===================== -->
      <el-tab-pane label="文案管理" name="items">
        <div class="toolbar">
          <el-button type="primary" @click="openCreate">新增文案</el-button>
          <span class="hint">展示模式：{{ modeLabel }} —— {{ modeHint }}</span>
        </div>
        <el-table :data="items" v-loading="itemsLoading" stripe>
          <el-table-column prop="mainText" label="主文案" min-width="180" show-overflow-tooltip />
          <el-table-column prop="subText" label="副文案" min-width="160" show-overflow-tooltip />
          <el-table-column prop="weight" label="权重" width="80" align="center" />
          <el-table-column label="定向人群" min-width="200">
            <template #default="{ row }">
              <el-tag v-for="t in targetingTags(row)" :key="t" size="small" style="margin-right: 4px">{{ t }}</el-tag>
              <span v-if="targetingTags(row).length === 0" class="muted">全部用户</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-switch
                :model-value="row.isEnabled"
                :active-value="1"
                :inactive-value="0"
                @change="(v: any) => toggleStatus(row, v)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="70" align="center" />
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-popconfirm title="确认删除该文案？" @confirm="handleDelete(row)">
                <template #reference>
                  <el-button link type="danger" size="small">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ===================== 数据看板 ===================== -->
      <el-tab-pane label="数据看板" name="board">
        <div v-loading="boardLoading">
          <el-alert
            v-if="dashboard && dashboard.winnerItemId"
            type="success"
            :closable="false"
            style="margin-bottom: 12px"
          >
            A/B 测试胜出文案：<b>{{ winnerText }}</b>
            （转化率最高且曝光≥{{ dashboard.winnerMinImpressions }}）
          </el-alert>
          <el-table :data="dashboard?.items || []" stripe>
            <el-table-column label="文案" min-width="180">
              <template #default="{ row }">
                {{ row.mainText }}
                <el-tag v-if="dashboard && row.id === dashboard.winnerItemId" type="success" size="small">胜出</el-tag>
                <el-tag v-if="!row.isEnabled" type="info" size="small">停用</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="impressions" label="曝光" width="90" align="center" />
            <el-table-column prop="clicks" label="点击" width="90" align="center" />
            <el-table-column label="点击率" width="100" align="center">
              <template #default="{ row }">{{ pct(row.ctr) }}</template>
            </el-table-column>
            <el-table-column prop="conversions" label="登录转化" width="100" align="center" />
            <el-table-column label="转化率" width="100" align="center">
              <template #default="{ row }">{{ pct(row.conversionRate) }}</template>
            </el-table-column>
          </el-table>

          <div class="chart-head">
            <span>最近 7 日趋势</span>
            <el-radio-group v-model="metric" size="small" @change="renderChart">
              <el-radio-button label="impressions">曝光</el-radio-button>
              <el-radio-button label="clicks">点击</el-radio-button>
              <el-radio-button label="conversions">登录转化</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="chartRef" class="chart"></div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 文案编辑弹窗 -->
    <el-dialog
      :title="itemForm.id ? '编辑文案' : '新增文案'"
      v-model="editVisible"
      width="600px"
      destroy-on-close
    >
      <el-form :model="itemForm" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="主文案" prop="mainText">
          <el-input v-model="itemForm.mainText" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="副文案">
          <el-input v-model="itemForm.subText" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="权重" prop="weight">
          <el-input-number v-model="itemForm.weight" :min="1" :max="100" />
          <span class="tip">1-100，轮播模式下按权重概率展示</span>
        </el-form-item>
        <el-form-item label="定向登录态">
          <el-select v-model="itemForm.targetLoginState" clearable placeholder="不限">
            <el-option label="仅未登录" value="guest" />
            <el-option label="仅已登录" value="logged" />
          </el-select>
        </el-form-item>
        <el-form-item label="定向性别">
          <el-select v-model="itemForm.targetGender" clearable placeholder="不限">
            <el-option label="男" :value="1" />
            <el-option label="女" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="定向测试">
          <el-select v-model="itemForm.targetTested" clearable placeholder="不限">
            <el-option label="已测试过" :value="1" />
            <el-option label="未测试过" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="itemForm.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="itemForm.isEnabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import * as echarts from 'echarts'
import { copySlotApi, copyItemApi } from '../../api/guide'
import type { CopyItemData, CopyDisplayMode, DashboardData } from '../../api/guide'

const route = useRoute()
const router = useRouter()
const slotId = Number(route.params.slotId)

const slotName = ref('文案详情')
const displayMode = ref<CopyDisplayMode | ''>('')
const activeTab = ref('items')

const items = ref<CopyItemData[]>([])
const itemsLoading = ref(false)
const saving = ref(false)
const editVisible = ref(false)
const formRef = ref<FormInstance>()

const dashboard = ref<DashboardData | null>(null)
const boardLoading = ref(false)
const metric = ref<'impressions' | 'clicks' | 'conversions'>('impressions')
const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const itemForm = reactive<any>({
  id: 0,
  mainText: '',
  subText: '',
  weight: 50,
  targetLoginState: null,
  targetGender: null,
  targetTested: null,
  sort: 0,
  isEnabled: 1,
})

const rules: FormRules = {
  mainText: [{ required: true, message: '请输入主文案', trigger: 'blur' }],
  weight: [{ required: true, message: '请输入权重', trigger: 'blur' }],
}

const modeLabel = computed(() =>
  ({ carousel: '轮播', ab_test: 'A/B测试', all: '全展示' } as any)[displayMode.value] || '')
const modeTagType = computed(() =>
  ({ carousel: 'primary', ab_test: 'warning', all: 'success' } as any)[displayMode.value] || 'info')
const modeHint = computed(() =>
  ({
    carousel: '所有启用文案按权重概率随机展示一条',
    ab_test: '启用文案按用户稳定均分展示，独立统计',
    all: '同时展示全部启用文案',
  } as any)[displayMode.value] || '')

const winnerText = computed(() => {
  if (!dashboard.value?.winnerItemId) return ''
  return dashboard.value.items.find((i) => i.id === dashboard.value!.winnerItemId)?.mainText || ''
})

const pct = (v: number) => `${(v * 100).toFixed(2)}%`

const targetingTags = (row: CopyItemData): string[] => {
  const tags: string[] = []
  if (row.targetLoginState === 'guest') tags.push('未登录')
  if (row.targetLoginState === 'logged') tags.push('已登录')
  if (row.targetGender === 1) tags.push('男')
  if (row.targetGender === 2) tags.push('女')
  if (row.targetTested === 1) tags.push('已测试')
  if (row.targetTested === 0) tags.push('未测试')
  return tags
}

const loadSlot = async () => {
  try {
    const res = await copySlotApi.getOne(slotId)
    if (res.success && res.data) {
      slotName.value = res.data.name
      displayMode.value = res.data.displayMode
    }
  } catch { /* ignore */ }
}

const loadItems = async () => {
  itemsLoading.value = true
  try {
    const res = await copyItemApi.listBySlot(slotId)
    if (res.success && res.data) items.value = res.data
  } catch { /* ignore */ }
  finally { itemsLoading.value = false }
}

const loadDashboard = async () => {
  boardLoading.value = true
  try {
    const res = await copySlotApi.getDashboard(slotId)
    if (res.success && res.data) {
      dashboard.value = res.data
      await nextTick()
      renderChart()
    }
  } catch { /* ignore */ }
  finally { boardLoading.value = false }
}

const renderChart = () => {
  if (!chartRef.value || !dashboard.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const series = dashboard.value.items.map((it) => ({
    name: it.mainText.length > 12 ? it.mainText.slice(0, 12) + '…' : it.mainText,
    type: 'line' as const,
    smooth: true,
    data: it.trend[metric.value],
  }))
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: dashboard.value.dates },
    yAxis: { type: 'value', minInterval: 1 },
    series,
  }, true)
}

const handleResize = () => chart?.resize()

const openCreate = () => {
  Object.assign(itemForm, {
    id: 0, mainText: '', subText: '', weight: 50,
    targetLoginState: null, targetGender: null, targetTested: null,
    sort: 0, isEnabled: 1,
  })
  editVisible.value = true
}

const openEdit = (row: CopyItemData) => {
  Object.assign(itemForm, {
    id: row.id,
    mainText: row.mainText,
    subText: row.subText || '',
    weight: row.weight,
    targetLoginState: row.targetLoginState,
    targetGender: row.targetGender,
    targetTested: row.targetTested,
    sort: row.sort,
    isEnabled: row.isEnabled,
  })
  editVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const payload: any = {
      slotId,
      mainText: itemForm.mainText.trim(),
      subText: itemForm.subText.trim(),
      weight: itemForm.weight,
      targetLoginState: itemForm.targetLoginState || null,
      targetGender: itemForm.targetGender ?? null,
      targetTested: itemForm.targetTested ?? null,
      sort: itemForm.sort,
      isEnabled: itemForm.isEnabled,
    }
    if (itemForm.id) {
      await copyItemApi.update(itemForm.id, payload)
      ElMessage.success('更新成功')
    } else {
      await copyItemApi.create(payload)
      ElMessage.success('新增成功')
    }
    editVisible.value = false
    loadItems()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row: CopyItemData, v: number) => {
  try {
    await copyItemApi.setStatus(row.id, v)
    row.isEnabled = v
    ElMessage.success('操作成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

const handleDelete = async (row: CopyItemData) => {
  try {
    await copyItemApi.remove(row.id)
    ElMessage.success('删除成功')
    loadItems()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

const goBack = () => router.push({ name: 'GuideCopySlots' })

watch(activeTab, (tab) => {
  if (tab === 'board') loadDashboard()
})

onMounted(() => {
  loadSlot()
  loadItems()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.page-header { margin-bottom: 12px; }
.title-wrap { display: flex; align-items: center; gap: 10px; }
.page-title { font-size: 18px; font-weight: 600; margin: 0; }
.toolbar { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
.hint { color: #909399; font-size: 12px; }
.muted { color: #c0c4cc; }
.tip { color: #909399; font-size: 12px; margin-left: 10px; }
.chart-head {
  display: flex; justify-content: space-between; align-items: center;
  margin: 18px 0 8px;
}
.chart { width: 100%; height: 320px; }
</style>
