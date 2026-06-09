<template>
  <view v-show="visible" class="filter-panel" :class="{ asPage: noOverlay }">
    <view v-if="!noOverlay" class="overlay" @tap="handleClose"></view>
    <view class="panel-content" :class="{ open: visible, fullPage: noOverlay }">
      <view class="drag-indicator"></view>

      <scroll-view class="panel-scroll" scroll-y>
        <view class="search-section">
          <view class="search-box">
            <text class="search-icon">🔍</text>
            <input
              class="search-input"
              v-model="filterData.keyword"
              placeholder="请输入昵称或ID搜索"
              placeholder-class="search-placeholder"
            />
          </view>
        </view>

        <view class="filter-section">
          <view class="section-title">
            <text class="title-label">年龄范围</text>
            <text class="range-value">{{ filterData.ageMin || 18 }} - {{ filterData.ageMax || 80 }}岁</text>
          </view>
          <view class="slider-container">
            <slider
              class="slider"
              :min="18"
              :max="80"
              :value="filterData.ageMin || 18"
              :block-size="20"
              active-color="#FF6B9D"
              background-color="#EEEEEE"
              @change="onAgeMinChange"
            />
            <slider
              class="slider"
              :min="18"
              :max="80"
              :value="filterData.ageMax || 80"
              :block-size="20"
              active-color="#FF6B9D"
              background-color="#EEEEEE"
              @change="onAgeMaxChange"
            />
          </view>
        </view>

        <view class="filter-section">
          <view class="section-title">
            <text class="title-label">身高范围</text>
            <text class="range-value">{{ filterData.heightMin || 140 }} - {{ filterData.heightMax || 200 }}cm</text>
          </view>
          <view class="slider-container">
            <slider
              class="slider"
              :min="140"
              :max="200"
              :value="filterData.heightMin || 140"
              :block-size="20"
              active-color="#FF6B9D"
              background-color="#EEEEEE"
              @change="onHeightMinChange"
            />
            <slider
              class="slider"
              :min="140"
              :max="200"
              :value="filterData.heightMax || 200"
              :block-size="20"
              active-color="#FF6B9D"
              background-color="#EEEEEE"
              @change="onHeightMaxChange"
            />
          </view>
        </view>

        <view class="filter-section">
          <view class="section-title">学历要求</view>
          <view class="tag-group">
            <view
              v-for="edu in educationOptions"
              :key="edu.value"
              class="filter-tag"
              :class="{ active: filterData.education === edu.value }"
              @tap="selectEducation(edu.value)"
            >
              {{ edu.label }}
            </view>
          </view>
        </view>

        <view class="filter-section">
          <view class="section-title">月薪范围</view>
          <view class="tag-group">
            <view
              v-for="income in incomeOptions"
              :key="income.value"
              class="filter-tag"
              :class="{ active: filterData.incomeRange === income.value }"
              @tap="selectIncome(income.value)"
            >
              {{ income.label }}
            </view>
          </view>
        </view>

        <view class="filter-section">
          <view class="section-title">婚姻状况</view>
          <view class="button-group">
            <view
              class="filter-btn"
              :class="{ active: filterData.maritalStatus === undefined }"
              @tap="selectMaritalStatus(undefined)"
            >
              不限
            </view>
            <view
              class="filter-btn"
              :class="{ active: filterData.maritalStatus === '未婚' }"
              @tap="selectMaritalStatus('未婚')"
            >
              未婚
            </view>
            <view
              class="filter-btn"
              :class="{ active: filterData.maritalStatus === '离异' }"
              @tap="selectMaritalStatus('离异')"
            >
              离异
            </view>
            <view
              class="filter-btn"
              :class="{ active: filterData.maritalStatus === '丧偶' }"
              @tap="selectMaritalStatus('丧偶')"
            >
              丧偶
            </view>
          </view>
        </view>

        <view class="filter-section">
          <view class="section-title">实名认证</view>
          <view class="button-group">
            <view
              class="filter-btn"
              :class="{ active: filterData.isRealName === undefined }"
              @tap="selectRealName(undefined)"
            >
              不限
            </view>
            <view
              class="filter-btn"
              :class="{ active: filterData.isRealName === 1 }"
              @tap="selectRealName(1)"
            >
              已实名
            </view>
          </view>
        </view>

        <view class="filter-section">
          <view class="section-title">现居地</view>
          <view class="location-row">
            <view class="location-picker" @tap="showResidencePicker">
              <text class="location-text">{{ filterData.residence || '请选择' }}</text>
              <text class="picker-arrow">></text>
            </view>
            <view
              v-if="filterData.residence"
              class="clear-location"
              @tap="clearResidence"
            >
              <text>不限</text>
            </view>
          </view>
        </view>

        <view class="filter-section">
          <view class="section-title">户籍地</view>
          <view class="location-row">
            <view class="location-picker" @tap="showHometownPicker">
              <text class="location-text">{{ filterData.hometown || '请选择' }}</text>
              <text class="picker-arrow">></text>
            </view>
            <view
              v-if="filterData.hometown"
              class="clear-location"
              @tap="clearHometown"
            >
              <text>不限</text>
            </view>
          </view>
        </view>

        <view class="bottom-safe-area"></view>
      </scroll-view>

      <view class="action-bar">
        <view class="reset-btn" @tap="handleReset">
          <text class="reset-icon">🔄</text>
          <text>重置</text>
        </view>
        <view class="confirm-btn" @tap="handleConfirm">
          <text>确定{{ selectedCount > 0 ? `(${selectedCount})` : '' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

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
  /** 作为独立页面使用时隐藏遮罩层 */
  noOverlay?: boolean
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'confirm', data: FilterData): void
  (e: 'reset'): void
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  initialData: () => ({}),
})

const emit = defineEmits<Emits>()

const visible = ref(false)
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
  { label: '博士', value: '博士' },
]

const incomeOptions = [
  { label: '不限', value: '' },
  { label: '3千以下', value: '3千以下' },
  { label: '3-5千', value: '3-5千' },
  { label: '5-8千', value: '5-8千' },
  { label: '8千-1.2万', value: '8千-1.2万' },
  { label: '1.2-2万', value: '1.2-2万' },
  { label: '2-5万', value: '2-5万' },
  { label: '5万以上', value: '5万以上' },
]

const selectedCount = computed(() => {
  let count = 0
  if (filterData.value.ageMin && filterData.value.ageMin > 18) count++
  if (filterData.value.ageMax && filterData.value.ageMax < 80) count++
  if (filterData.value.heightMin && filterData.value.heightMin > 140) count++
  if (filterData.value.heightMax && filterData.value.heightMax < 200) count++
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
    visible.value = newVal
    if (newVal && props.initialData) {
      filterData.value = { ...filterData.value, ...props.initialData }
    }
  },
  { immediate: true }
)

const handleClose = () => {
  visible.value = false
  emit('update:show', false)
}

const onAgeMinChange = (e: any) => {
  const value = e.detail.value
  if (value < (filterData.value.ageMax || 80)) {
    filterData.value.ageMin = value
  }
}

const onAgeMaxChange = (e: any) => {
  const value = e.detail.value
  if (value > (filterData.value.ageMin || 18)) {
    filterData.value.ageMax = value
  }
}

const onHeightMinChange = (e: any) => {
  const value = e.detail.value
  if (value < (filterData.value.heightMax || 200)) {
    filterData.value.heightMin = value
  }
}

const onHeightMaxChange = (e: any) => {
  const value = e.detail.value
  if (value > (filterData.value.heightMin || 140)) {
    filterData.value.heightMax = value
  }
}

const selectEducation = (value: string) => {
  filterData.value.education = filterData.value.education === value ? undefined : value
}

const selectIncome = (value: string) => {
  filterData.value.incomeRange = filterData.value.incomeRange === value ? undefined : value
}

const selectMaritalStatus = (value: string | undefined) => {
  filterData.value.maritalStatus = value
}

const selectRealName = (value: number | undefined) => {
  filterData.value.isRealName = value
}

const cityOptions = [
  '北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '重庆', '武汉',
  '西安', '郑州', '济南', '青岛', '苏州', '天津', '长沙', '东莞', '沈阳',
  '宁波', '昆明', '大连', '厦门', '合肥', '佛山', '福州', '哈尔滨', '长春',
  '南昌', '贵阳', '南宁', '石家庄', '太原', '无锡', '烟台', '温州', '珠海',
]

const showResidencePicker = () => {
  pickAddr('residence')
}

const showHometownPicker = () => {
  pickAddr('hometown')
}

const pickAddr = (field: 'residence' | 'hometown') => {
  // #ifdef MP-WEIXIN
  uni.chooseAddress({
    success: (res: any) => {
      const addr = `${res.provinceName}${res.cityName}${res.countyName}${res.detailInfo}`
      if (field === 'residence') {
        filterData.value.residence = addr
      } else {
        filterData.value.hometown = addr
      }
    },
    fail: () => pickFallback(field),
  })
  // #endif
  // #ifndef MP-WEIXIN
  pickFallback(field)
  // #endif
}

const pickFallback = (field: 'residence' | 'hometown') => {
  uni.showModal({
    title: field === 'residence' ? '输入现居地' : '输入户籍地',
    editable: true,
    placeholderText: '精确到街道，例：北京市海淀区中关村街道',
    success: (res) => {
      if (res.confirm && res.content) {
        if (field === 'residence') {
          filterData.value.residence = res.content
        } else {
          filterData.value.hometown = res.content
        }
      }
    },
  })
}

const clearResidence = () => {
  filterData.value.residence = undefined
}

const clearHometown = () => {
  filterData.value.hometown = undefined
}

const handleReset = () => {
  filterData.value = {
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
  }
  emit('reset')
}

const handleConfirm = () => {
  const data = { ...filterData.value }
  if (data.education === '') data.education = undefined
  if (data.incomeRange === '') data.incomeRange = undefined

  visible.value = false
  emit('update:show', false)
  emit('confirm', data)
}

const open = (initialData?: FilterData) => {
  if (initialData) {
    filterData.value = { ...filterData.value, ...initialData }
  }
  visible.value = true
  emit('update:show', true)
}

const close = () => {
  handleClose()
}

defineExpose({
  open,
  close,
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
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  // 作为独立页面使用时：无遮罩，页面级布局
  &.asPage {
    position: relative;
    z-index: 1;
    justify-content: flex-start;
    min-height: 100vh;
    background-color: #f5f5f5;
  }
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.panel-content {
  position: relative;
  height: 85vh;
  max-height: 85vh;
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateY(100%);
  transition: transform 0.3s ease-out;

  &.open {
    transform: translateY(0);
  }

  // 作为独立页面：去掉底部弹出样式
  &.fullPage {
    height: auto;
    max-height: none;
    border-radius: 0;
    transform: none;
    overflow: visible;
  }
}

.drag-indicator {
  width: 80rpx;
  height: 8rpx;
  background-color: #ddd;
  border-radius: 4rpx;
  margin: 20rpx auto;
}

.panel-scroll {
  flex: 1;
  height: 0;
  padding: 0 40rpx 40rpx 32rpx;
  box-sizing: border-box;
}

.search-section {
  padding: 20rpx 0;
}

.search-box {
  display: flex;
  align-items: center;
  height: 80rpx;
  background-color: #f5f5f5;
  border-radius: 40rpx;
  padding: 0 32rpx;
}

.search-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--text);
}

.search-placeholder {
  color: #999;
}

.filter-section {
  padding: 24rpx 0;
  border-bottom: 1px solid #f0f0f0;
  padding-right: 8rpx;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 28rpx;
  font-weight: bold;
  color: var(--text);
  margin-bottom: 12rpx;
  padding-right: 8rpx;

  .title-label {
    flex: 1;
    min-width: 0;
  }
}

.range-value {
  font-size: 24rpx;
  color: #FF6B9D;
  font-weight: normal;
  flex-shrink: 0;
  white-space: nowrap;
  padding-right: 16rpx;
}

.button-group {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}

.filter-btn {
  min-width: 140rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-secondary);
  background-color: #f5f5f5;
  border-radius: 32rpx;
  padding: 0 24rpx;

  &.active {
    color: #fff;
    background-color: #FF6B9D;
  }
}

.slider-container {
  padding: 0 20rpx;
}

.slider {
  margin: 20rpx 0;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.filter-tag {
  min-width: 160rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-secondary);
  background-color: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 20rpx;

  &.active {
    color: #FF6B9D;
    background-color: #FFF0F3;
  }
}

.location-picker {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.clear-location {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  padding: 0 24rpx;
  border: 2rpx solid #ddd;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #999;
  white-space: nowrap;
  flex-shrink: 0;
}

.location-text {
  font-size: 28rpx;
  color: var(--text);
}

.picker-arrow {
  font-size: 28rpx;
  color: #999;
}

.bottom-safe-area {
  height: 20rpx;
}

.action-bar {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  border-top: 1px solid #f0f0f0;
}

.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  width: 200rpx;
  height: 88rpx;
  background-color: #f5f5f5;
  border-radius: 44rpx;
  font-size: 28rpx;
  color: var(--text-secondary);
}

.reset-icon {
  font-size: 28rpx;
}

.confirm-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background-color: #FF6B9D;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
}
</style>
