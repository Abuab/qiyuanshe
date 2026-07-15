<template>
  <view v-show="visible && !hidden" class="filter-panel" :class="{ asPage: noOverlay }">
    <view v-if="!noOverlay" class="overlay" :class="{ show: panelOpen }" :style="offsetStyle" @tap="handleClose"></view>
    <view class="panel-wrap" :class="{ fullPage: noOverlay }" :style="offsetStyle">
    <view class="panel-content" :class="{ open: panelOpen, fullPage: noOverlay }">
      <!-- 顶部 Tab + 关闭 -->
      <view class="panel-header">
        <view class="header-tabs">
          <view
            v-for="tab in headerTabs"
            :key="tab.value"
            class="header-tab"
            :class="{ active: activeTab === tab.value }"
            @tap="selectTab(tab.value)"
          >
            <text class="header-tab-text">{{ tab.label }}</text>
            <view v-if="activeTab === tab.value" class="header-tab-line"></view>
          </view>
        </view>
        <view class="header-close" @tap="handleClose">
          <text class="close-text">关闭</text>
          <view class="close-x">
            <view class="close-line"></view>
            <view class="close-line"></view>
          </view>
        </view>
      </view>

      <scroll-view class="panel-scroll" scroll-y :enhanced="true" :show-scrollbar="false">
        <!-- 搜索框 -->
        <view class="filter-section">
          <view class="search-box">
            <view class="search-mag">
              <view class="mag-circle"></view>
              <view class="mag-handle"></view>
            </view>
            <input
              class="search-input"
              v-model="filterData.keyword"
              placeholder="请输入相亲ID"
              placeholder-class="search-ph"
            />
          </view>
        </view>

        <!-- 年龄(岁) -->
        <view class="filter-section">
          <text class="sec-title">年龄(岁)</text>
          <view class="range-wrap">
            <view class="range-track range-track-age">
              <view
                class="range-fill"
                :style="{ left: agePct.min + '%', width: (agePct.max - agePct.min) + '%' }"
              ></view>
              <view
                class="range-thumb"
                :style="{ left: agePct.min + '%' }"
                @touchstart="onThumbStart('age', 'min')"
                @touchmove.stop.prevent="onThumbMove('age', 'min', $event)"
              >
                <view class="thumb-label">{{ filterData.ageMin || 18 }}</view>
              </view>
              <view
                class="range-thumb"
                :style="{ left: agePct.max + '%' }"
                @touchstart="onThumbStart('age', 'max')"
                @touchmove.stop.prevent="onThumbMove('age', 'max', $event)"
              >
                <view class="thumb-label">{{ filterData.ageMax || 80 }}</view>
              </view>
            </view>
          </view>
          <view class="range-scale">
            <text class="scale-text">18岁</text>
            <text class="scale-text">80岁</text>
          </view>
        </view>

        <!-- 身高(cm) -->
        <view class="filter-section">
          <text class="sec-title">身高(cm)</text>
          <view class="range-wrap">
            <view class="range-track range-track-height">
              <view
                class="range-fill"
                :style="{ left: heightPct.min + '%', width: (heightPct.max - heightPct.min) + '%' }"
              ></view>
              <view
                class="range-thumb"
                :style="{ left: heightPct.min + '%' }"
                @touchstart="onThumbStart('height', 'min')"
                @touchmove.stop.prevent="onThumbMove('height', 'min', $event)"
              >
                <view class="thumb-label">{{ filterData.heightMin || 140 }}</view>
              </view>
              <view
                class="range-thumb"
                :style="{ left: heightPct.max + '%' }"
                @touchstart="onThumbStart('height', 'max')"
                @touchmove.stop.prevent="onThumbMove('height', 'max', $event)"
              >
                <view class="thumb-label">{{ filterData.heightMax || 200 }}</view>
              </view>
            </view>
          </view>
          <view class="range-scale">
            <text class="scale-text">140cm</text>
            <text class="scale-text">200cm</text>
          </view>
        </view>

        <!-- 学历 -->
        <view class="filter-section">
          <text class="sec-title">学历</text>
          <view class="tag-grid">
            <view
              v-for="edu in educationOptions"
              :key="edu.label"
              class="tag-item"
              :class="{ active: edu.value === '' ? !filterData.education : filterData.education === edu.value }"
              @tap="selectEducation(edu.value)"
            >
              {{ edu.label }}
            </view>
          </view>
        </view>

        <!-- 月薪 -->
        <view class="filter-section">
          <text class="sec-title">月薪</text>
          <view class="tag-grid">
            <view
              v-for="income in incomeOptions"
              :key="income.label"
              class="tag-item"
              :class="{ active: income.value === '' ? !filterData.incomeRange : filterData.incomeRange === income.value }"
              @tap="selectIncome(income.value)"
            >
              {{ income.label }}
            </view>
          </view>
        </view>

        <!-- 婚况 -->
        <view class="filter-section">
          <text class="sec-title">婚况</text>
          <view class="tag-grid">
            <view
              v-for="m in maritalOptions"
              :key="m.label"
              class="tag-item"
              :class="{ active: filterData.maritalStatus === m.value }"
              @tap="selectMaritalStatus(m.value)"
            >
              {{ m.label }}
            </view>
          </view>
        </view>

        <!-- 实名认证 -->
        <view class="filter-section">
          <text class="sec-title">实名认证</text>
          <view class="tag-grid">
            <view
              v-for="r in realnameOptions"
              :key="r.label"
              class="tag-item"
              :class="{ active: filterData.isRealName === r.value }"
              @tap="selectRealName(r.value)"
            >
              {{ r.label }}
            </view>
          </view>
        </view>

        <!-- 现居地 -->
        <view class="filter-section location-section" @tap="showResidencePicker">
          <text class="location-title">现居地</text>
          <view class="location-value">
            <text class="location-text" :class="{ 'has-value': filterData.residence }">{{ filterData.residence || '请选择' }}</text>
            <text class="location-arrow">&gt;</text>
          </view>
        </view>

        <!-- 户籍地 -->
        <view class="filter-section location-section" @tap="showHometownPicker">
          <text class="location-title">户籍地</text>
          <view class="location-value">
            <text class="location-text" :class="{ 'has-value': filterData.hometown }">{{ filterData.hometown || '请选择' }}</text>
            <text class="location-arrow">&gt;</text>
          </view>
        </view>

        <view class="bottom-safe-area"></view>
      </scroll-view>

      <!-- 底部固定操作栏 -->
      <view class="action-bar">
        <view class="reset-btn" @tap="handleReset">
          <view class="refresh-icon"></view>
          <text class="reset-text">重置</text>
        </view>
        <view class="confirm-btn" @tap="handleConfirm">
          <text>确定</text>
        </view>
      </view>
    </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, getCurrentInstance } from 'vue'

const inst = getCurrentInstance()

interface FilterData {
  keyword?: string
  ageMin?: number
  ageMax?: number
  heightMin?: number
  heightMax?: number
  education?: string
  incomeRange?: string
  maritalStatus?: string
  isRealName?: number
  residence?: string
  hometown?: string
}

interface Props {
  show: boolean
  initialData?: FilterData
  /** 当前首页排序标签（活跃/精选/实名/最新） */
  sortTab?: string
  /** 面板距顶部的偏移（px），用于与顶部 Tab 栏无缝衔接下拉 */
  topOffset?: number
  /** 作为独立页面使用时隐藏遮罩层 */
  noOverlay?: boolean
  /** 城市选择器打开时临时隐藏本面板，避免叠加遮挡导致无法点选 */
  hidden?: boolean
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'confirm', data: FilterData): void
  (e: 'reset'): void
  (e: 'sort-change', value: string): void
  (e: 'pick-location', target: 'residence' | 'hometown'): void
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  initialData: () => ({}),
  sortTab: 'active',
  topOffset: 0,
})

const emit = defineEmits<Emits>()

const visible = ref(false)
// 下拉展开状态（控制滑入/滑出动画）
const panelOpen = ref(false)

const offsetStyle = computed(() =>
  props.noOverlay ? {} : { top: (props.topOffset || 0) + 'px' }
)

// 顶部排序 Tab（点击联动首页排序）
const headerTabs = [
  { label: '活跃', value: 'active' },
  { label: '精选', value: 'featured' },
  { label: '实名', value: 'verified' },
  { label: '最新', value: 'newest' },
]
const activeTab = ref(props.sortTab || 'active')

const selectTab = (value: string) => {
  if (activeTab.value === value) return
  activeTab.value = value
  emit('sort-change', value)
}

const filterData = ref<FilterData>({
  keyword: '',
  ageMin: 18,
  ageMax: 80,
  heightMin: 140,
  heightMax: 200,
  education: undefined,
  incomeRange: undefined,
  maritalStatus: undefined,
  isRealName: undefined,
  residence: undefined,
  hometown: undefined,
})

const educationOptions = [
  { label: '不限', value: '' },
  { label: '高中及以上', value: '高中' },
  { label: '大专及以上', value: '大专' },
  { label: '本科及以上', value: '本科' },
  { label: '硕士及以上', value: '硕士' },
]

const incomeOptions = [
  { label: '不限', value: '' },
  { label: '3千以下', value: '3千以下' },
  { label: '3千~5千', value: '3-5千' },
  { label: '5千~8千', value: '5-8千' },
  { label: '8千~1.2万', value: '8千-1.2万' },
  { label: '1.2万~2万', value: '1.2-2万' },
  { label: '2万~5万', value: '2-5万' },
  { label: '5万以上', value: '5万以上' },
]

const maritalOptions: { label: string; value: string | undefined }[] = [
  { label: '不限', value: undefined },
  { label: '未婚', value: '未婚' },
  { label: '离异', value: '离异' },
]

const realnameOptions: { label: string; value: number | undefined }[] = [
  { label: '不限', value: undefined },
  { label: '已实名', value: 1 },
]

// ===== 双滑块（年龄 / 身高）=====
const AGE = { min: 18, max: 80 }
const HEIGHT = { min: 140, max: 200 }

const agePct = computed(() => ({
  min: ((filterData.value.ageMin || AGE.min) - AGE.min) / (AGE.max - AGE.min) * 100,
  max: ((filterData.value.ageMax || AGE.max) - AGE.min) / (AGE.max - AGE.min) * 100,
}))
const heightPct = computed(() => ({
  min: ((filterData.value.heightMin || HEIGHT.min) - HEIGHT.min) / (HEIGHT.max - HEIGHT.min) * 100,
  max: ((filterData.value.heightMax || HEIGHT.max) - HEIGHT.min) / (HEIGHT.max - HEIGHT.min) * 100,
}))

const trackRects = ref<Record<string, { left: number; width: number }>>({
  age: { left: 0, width: 0 },
  height: { left: 0, width: 0 },
})

const measureTrack = (type: 'age' | 'height') => {
  uni.createSelectorQuery()
    .in(inst?.proxy as any)
    .select('.range-track-' + type)
    .boundingClientRect((rect: any) => {
      if (rect && !Array.isArray(rect)) {
        trackRects.value[type] = { left: rect.left || 0, width: rect.width || 0 }
      }
    })
    .exec()
}

const onThumbStart = (type: 'age' | 'height', _which: 'min' | 'max') => {
  measureTrack(type)
}

const onThumbMove = (type: 'age' | 'height', which: 'min' | 'max', e: any) => {
  const rect = trackRects.value[type]
  if (!rect.width) return
  const touch = e.touches && e.touches[0]
  if (!touch) return
  const clientX = touch.clientX ?? touch.pageX
  let pct = (clientX - rect.left) / rect.width
  pct = Math.max(0, Math.min(1, pct))
  const range = type === 'age' ? AGE : HEIGHT
  let val = Math.round(range.min + pct * (range.max - range.min))

  if (type === 'age') {
    if (which === 'min') {
      filterData.value.ageMin = Math.max(range.min, Math.min(val, (filterData.value.ageMax || range.max) - 1))
    } else {
      filterData.value.ageMax = Math.min(range.max, Math.max(val, (filterData.value.ageMin || range.min) + 1))
    }
  } else {
    if (which === 'min') {
      filterData.value.heightMin = Math.max(range.min, Math.min(val, (filterData.value.heightMax || range.max) - 1))
    } else {
      filterData.value.heightMax = Math.min(range.max, Math.max(val, (filterData.value.heightMin || range.min) + 1))
    }
  }
}

const selectedCount = computed(() => {
  let count = 0
  if (filterData.value.ageMin && filterData.value.ageMin > AGE.min) count++
  if (filterData.value.ageMax && filterData.value.ageMax < AGE.max) count++
  if (filterData.value.heightMin && filterData.value.heightMin > HEIGHT.min) count++
  if (filterData.value.heightMax && filterData.value.heightMax < HEIGHT.max) count++
  if (filterData.value.education) count++
  if (filterData.value.incomeRange) count++
  if (filterData.value.maritalStatus) count++
  if (filterData.value.isRealName !== undefined) count++
  if (filterData.value.residence) count++
  if (filterData.value.hometown) count++
  return count
})

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      visible.value = true
      activeTab.value = props.sortTab || 'active'
      if (props.initialData) {
        filterData.value = { ...filterData.value, ...props.initialData }
      }
      if (props.noOverlay) {
        panelOpen.value = true
      } else {
        nextTick(() => {
          panelOpen.value = true
        })
      }
    } else {
      panelOpen.value = false
      if (props.noOverlay) {
        visible.value = false
      } else {
        // 带遮罩层模式也需延迟关闭 visible，与 handleClose 行为一致
        setTimeout(() => { visible.value = false }, 300)
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.sortTab,
  (val) => {
    activeTab.value = val || 'active'
  }
)

const handleClose = () => {
  panelOpen.value = false
  if (props.noOverlay) {
    visible.value = false
    emit('update:show', false)
    return
  }
  setTimeout(() => {
    visible.value = false
    emit('update:show', false)
  }, 250)
}

const selectEducation = (value: string) => {
  if (value === '') {
    filterData.value.education = undefined
  } else {
    filterData.value.education = filterData.value.education === value ? undefined : value
  }
}

const selectIncome = (value: string) => {
  if (value === '') {
    filterData.value.incomeRange = undefined
  } else {
    filterData.value.incomeRange = filterData.value.incomeRange === value ? undefined : value
  }
}

const selectMaritalStatus = (value: string | undefined) => {
  filterData.value.maritalStatus = value
}

const selectRealName = (value: number | undefined) => {
  filterData.value.isRealName = value
}

// ===== 城市选择（由父页面在页面根级弹出，层级高于本面板）=====
const showResidencePicker = () => {
  emit('pick-location', 'residence')
}

const showHometownPicker = () => {
  emit('pick-location', 'hometown')
}

// 由父页面的城市选择器回填现居地/户籍地
const applyLocation = (target: 'residence' | 'hometown', value: string) => {
  if (target === 'hometown') {
    filterData.value.hometown = value
  } else {
    filterData.value.residence = value
  }
}

const handleReset = () => {
  filterData.value = {
    keyword: '',
    ageMin: AGE.min,
    ageMax: AGE.max,
    heightMin: HEIGHT.min,
    heightMax: HEIGHT.max,
    education: undefined,
    incomeRange: undefined,
    maritalStatus: undefined,
    isRealName: undefined,
    residence: undefined,
    hometown: undefined,
  }
  emit('reset')
}

const handleConfirm = () => {
  const data = { ...filterData.value }
  if (data.education === '') data.education = undefined
  if (data.incomeRange === '') data.incomeRange = undefined

  panelOpen.value = false
  const done = () => {
    visible.value = false
    emit('update:show', false)
    emit('confirm', data)
  }
  if (props.noOverlay) {
    done()
  } else {
    setTimeout(done, 250)
  }
}

const open = (initialData?: FilterData) => {
  if (initialData) {
    filterData.value = { ...filterData.value, ...initialData }
  }
  visible.value = true
  emit('update:show', true)
  if (props.noOverlay) {
    panelOpen.value = true
  } else {
    nextTick(() => {
      panelOpen.value = true
    })
  }
}

const close = () => {
  handleClose()
}

defineExpose({
  open,
  close,
  applyLocation,
  selectedCount,
})
</script>

<style lang="scss" scoped>
.filter-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;

  // 作为独立页面使用时：无遮罩，页面级布局
  &.asPage {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    background-color: #f5f5f5;
  }
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.25s ease-out;

  &.show {
    opacity: 1;
  }
}

// 下拉容器：裁剪面板向下滑入的动画
.panel-wrap {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 2;
  overflow: hidden;

  &.fullPage {
    position: static;
    overflow: visible;
  }
}

.panel-content {
  position: relative;
  max-height: 75vh;
  background-color: #ffffff;
  // 顶部直角与 Tab 栏贴合，底部圆角
  border-radius: 0 0 24rpx 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateY(-100%);
  transition: transform 0.25s ease-out;

  &.open {
    transform: translateY(0);
    transition: transform 0.3s ease-out;
  }

  // 作为独立页面：去掉下拉动画
  &.fullPage {
    max-height: none;
    border-radius: 0;
    transform: none;
    overflow: visible;
  }
}

// ===== 顶部 Tab + 关闭 =====
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
}

.header-tabs {
  display: flex;
  align-items: center;
  gap: 40rpx;
}

.header-tab {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.header-tab-text {
  font-size: 32rpx;
  color: #999;
}

.header-tab.active .header-tab-text {
  color: #333;
  font-weight: bold;
}

.header-tab-line {
  width: 100%;
  height: 4rpx;
  margin-top: 6rpx;
  background-color: #FF6B9D;
  border-radius: 2rpx;
}

.header-close {
  display: flex;
  align-items: center;
}

.close-text {
  font-size: 28rpx;
  color: #999;
}

.close-x {
  position: relative;
  width: 16rpx;
  height: 16rpx;
  margin-left: 8rpx;
}

.close-line {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 2rpx;
  background-color: #999;

  &:first-child {
    transform: translateY(-50%) rotate(45deg);
  }
  &:last-child {
    transform: translateY(-50%) rotate(-45deg);
  }
}

// ===== 滚动区 =====
.panel-scroll {
  flex: 1;
  height: 0;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.filter-section {
  padding: 32rpx 0;
  border-bottom: 1rpx solid #F0F0F0;
}

.sec-title {
  display: block;
  font-size: 32rpx;
  font-weight: 400;
  color: #333;
  margin-bottom: 20rpx;
}

// ===== 搜索框 =====
.search-box {
  display: flex;
  align-items: center;
  height: 80rpx;
  background-color: #F5F5F5;
  border-radius: 16rpx;
  padding: 0 24rpx;
}

.search-mag {
  position: relative;
  width: 20rpx;
  height: 20rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.mag-circle {
  width: 14rpx;
  height: 14rpx;
  border: 2rpx solid #999;
  border-radius: 50%;
  box-sizing: border-box;
}

.mag-handle {
  position: absolute;
  right: 0;
  bottom: 1rpx;
  width: 7rpx;
  height: 2rpx;
  background-color: #999;
  transform: rotate(45deg);
  transform-origin: right center;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.search-ph {
  color: #999;
  font-size: 28rpx;
}

// ===== 双滑块 =====
.range-wrap {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
}

.range-track {
  position: relative;
  width: 100%;
  height: 6rpx;
  border-radius: 3rpx;
  background-color: #FFE3EC;
}

.range-fill {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 6rpx;
  border-radius: 3rpx;
  background-color: #FF6B9D;
}

.range-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: #FF6B9D;
  border: 4rpx solid #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(255, 107, 157, 0.3);
  box-sizing: border-box;
}

.thumb-label {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8rpx);
  transform: translateX(-50%);
  padding: 4rpx 12rpx;
  background-color: #FF6B9D;
  color: #ffffff;
  font-size: 22rpx;
  line-height: 1;
  border-radius: 8rpx;
  white-space: nowrap;
}

.range-scale {
  display: flex;
  justify-content: space-between;
  margin-top: 8rpx;
}

.scale-text {
  font-size: 24rpx;
  color: #999;
}

// ===== 标签网格 =====
.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  width: calc((100% - 32rpx) / 3);
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 28rpx;
  color: #333;
  background-color: #F5F5F5;
  border-radius: 40rpx;
  box-sizing: border-box;

  &.active {
    color: #FF6B9D;
    background-color: #FFE3EC;
  }
}

// ===== 现居地 / 户籍地 =====
.location-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0;
}

.location-title {
  font-size: 32rpx;
  font-weight: 400;
  color: #333;
}

.location-value {
  display: flex;
  align-items: center;
  max-width: 60%;
}

.location-text {
  font-size: 28rpx;
  color: #FF6B9D;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.has-value {
    color: #333;
  }
}

.location-arrow {
  font-size: 28rpx;
  color: #FF6B9D;
  margin-left: 8rpx;
}

.bottom-safe-area {
  height: 20rpx;
}

// ===== 底部固定操作栏 =====
.action-bar {
  display: flex;
  align-items: center;
  height: 120rpx;
  padding: 0 32rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background-color: #ffffff;
  border-top: 1rpx solid #F0F0F0;
}

.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 80rpx;
}

.refresh-icon {
  position: relative;
  width: 20rpx;
  height: 20rpx;
  margin-right: 8rpx;
  border: 2rpx solid #999;
  border-radius: 50%;
  border-right-color: transparent;
  box-sizing: border-box;

  &::after {
    content: '';
    position: absolute;
    top: -2rpx;
    right: -2rpx;
    width: 0;
    height: 0;
    border: 4rpx solid transparent;
    border-bottom-color: #999;
    transform: rotate(45deg);
  }
}

.reset-text {
  font-size: 28rpx;
  color: #999;
}

.confirm-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  margin-left: 24rpx;
  background-color: #FF6B9D;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: bold;
  color: #ffffff;
}
</style>
