<template>
  <view class="city-picker-wrap" v-show="visible">
    <!-- 蒙层 -->
    <view class="city-mask" @tap="handleClose"></view>
    <!-- 白色面板 -->
    <view class="city-panel" :class="{ show: showPanel }">
      <!-- 标题 + 关闭 -->
      <view class="city-header">
        <text class="city-title">选择城市</text>
        <text class="city-close" @tap="handleClose">✕</text>
      </view>

      <!-- 面包屑导航 -->
      <view class="city-breadcrumb">
        <text
          class="bread-item"
          :class="{ active: currentLevel > 0 }"
          @tap="switchLevel(0)"
        >省</text>
        <text v-if="breadcrumb.length >= 1" class="bread-sep">></text>
        <text
          v-if="breadcrumb.length >= 1"
          class="bread-item"
          :class="{ active: currentLevel > 1 }"
          @tap="switchLevel(1)"
        >{{ breadcrumb[0] }}</text>
        <text v-if="breadcrumb.length >= 2" class="bread-sep">></text>
        <text
          v-if="breadcrumb.length >= 2"
          class="bread-item"
          :class="{ active: currentLevel > 2 }"
          @tap="switchLevel(2)"
        >{{ breadcrumb[1] }}</text>
        <text v-if="breadcrumb.length >= 3" class="bread-sep">></text>
        <text
          v-if="breadcrumb.length >= 3"
          class="bread-item"
          :class="{ active: currentLevel > 2 }"
          @tap="switchLevel(3)"
        >{{ breadcrumb[2] }}</text>
        <text v-if="breadcrumb.length >= 4" class="bread-sep">></text>
        <text
          v-if="breadcrumb.length >= 4"
          class="bread-item"
          :class="{ active: currentLevel === 3 }"
          @tap="switchLevel(3)"
        >{{ breadcrumb[3] }}</text>
      </view>

      <!-- 列表区域 -->
      <scroll-view class="city-list" scroll-y :scroll-top="scrollTop" scroll-with-animation>
        <view
          v-for="item in currentList"
          :key="currentLevel + '-' + item.id"
          class="city-item"
          :class="{ selected: isSelected(item) }"
          @tap="selectItem(item)"
        >
          <text class="city-item-name">{{ item.name }}</text>
          <text v-if="isSelected(item)" class="city-item-check">✓</text>
        </view>
        <view v-if="currentList.length === 0 && currentLevel === 3 && selectedDistrict" class="city-empty">该区暂无街道数据，可直接完成</view>
        <view v-else-if="currentList.length === 0" class="city-empty">暂无数据</view>
      </scroll-view>

      <!-- 底部按钮 -->
      <view class="city-footer">
        <view class="city-confirm" @tap="handleConfirm">
          <text>完成</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import request from '@/utils/request'

interface RegionItem {
  id: number
  name: string
  level: number
  hasChildren: boolean
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm', value: string, ids: number[]): void
  (e: 'close'): void
}>()

// 当前浏览层级：0=省 1=市 2=区 3=街道
const currentLevel = ref(0)
const showPanel = ref(false)
const isLoading = ref(false)
const scrollTop = ref(0)

// 已选择的数据
const selectedProvince = ref<RegionItem | null>(null)
const selectedCity = ref<RegionItem | null>(null)
const selectedDistrict = ref<RegionItem | null>(null)
const selectedStreet = ref<RegionItem | null>(null)

// 当前列表
const provinceList = ref<RegionItem[]>([])
const cityList = ref<RegionItem[]>([])
const districtList = ref<RegionItem[]>([])
const streetList = ref<RegionItem[]>([])

const breadcrumb = computed(() => {
  const parts: string[] = []
  if (selectedProvince.value) parts.push(selectedProvince.value.name)
  if (selectedCity.value) parts.push(selectedCity.value.name)
  if (selectedDistrict.value) parts.push(selectedDistrict.value.name)
  if (selectedStreet.value) parts.push(selectedStreet.value.name)
  return parts
})

const currentList = computed(() => {
  if (currentLevel.value === 0) return provinceList.value
  if (currentLevel.value === 1) return cityList.value
  if (currentLevel.value === 2) return districtList.value
  return streetList.value
})

const getListBg = computed(() => {
  const selected = getCurrentSelected()
  if (!selected) return '#f5f5f5'
  if (currentLevel.value < 4) return '#f5f5f5'
  return '#FFF5F7'
})

const isSelected = (item: RegionItem) => {
  const sel = getCurrentSelected()
  return sel?.id === item.id
}

const getCurrentSelected = (): RegionItem | null => {
  if (currentLevel.value === 0) return selectedProvince.value
  if (currentLevel.value === 1) return selectedCity.value
  if (currentLevel.value === 2) return selectedDistrict.value
  return selectedStreet.value
}

const fetchRegions = async (parentId: number) => {
  if (isLoading.value) return []
  isLoading.value = true
  try {
    const res = await request({ url: '/region', method: 'GET', data: { parentId } })
    return (res.list || res.data || res || []) as RegionItem[]
  } catch (e) {
    console.error('fetch regions error', e)
    return []
  } finally {
    isLoading.value = false
  }
}

const switchLevel = (level: number) => {
  scrollTop.value = 0
  currentLevel.value = level
  // 回退时清除后续层级的选中状态
  if (level < 1) {
    selectedCity.value = null
    cityList.value = []
  }
  if (level < 2) {
    selectedDistrict.value = null
    districtList.value = []
  }
  if (level < 3) {
    selectedStreet.value = null
    streetList.value = []
  }
}

const selectItem = async (item: RegionItem) => {
  if (currentLevel.value === 0) {
    selectedProvince.value = item
    selectedCity.value = null
    selectedDistrict.value = null
    selectedStreet.value = null
    cityList.value = []
    districtList.value = []
    streetList.value = []

    if (item.hasChildren) {
      cityList.value = await fetchRegions(item.id)
      scrollTop.value = 0
      currentLevel.value = 1
    }
  } else if (currentLevel.value === 1) {
    selectedCity.value = item
    selectedDistrict.value = null
    selectedStreet.value = null
    districtList.value = []
    streetList.value = []

    if (item.hasChildren) {
      districtList.value = await fetchRegions(item.id)
      scrollTop.value = 0
      currentLevel.value = 2
    }
  } else if (currentLevel.value === 2) {
    selectedDistrict.value = item
    selectedStreet.value = null
    streetList.value = []

    if (item.hasChildren) {
      streetList.value = await fetchRegions(item.id)
      scrollTop.value = 0
      currentLevel.value = 3
    }
  } else if (currentLevel.value === 3) {
    selectedStreet.value = item
  }
}

const handleConfirm = () => {
  const names: string[] = []
  const ids: number[] = []
  if (selectedProvince.value) {
    names.push(selectedProvince.value.name)
    ids.push(selectedProvince.value.id)
  }
  if (selectedCity.value) {
    names.push(selectedCity.value.name)
    ids.push(selectedCity.value.id)
  }
  if (selectedDistrict.value) {
    names.push(selectedDistrict.value.name)
    ids.push(selectedDistrict.value.id)
  }
  if (selectedStreet.value) {
    names.push(selectedStreet.value.name)
    ids.push(selectedStreet.value.id)
  }
  showPanel.value = false
  setTimeout(() => {
    emit('confirm', names.join(','), ids)
  }, 300)
}

const handleClose = () => {
  showPanel.value = false
  setTimeout(() => {
    emit('close')
  }, 300)
}

watch(() => props.visible, (val) => {
  if (val) {
    showPanel.value = false
    currentLevel.value = 0
    selectedProvince.value = null
    selectedCity.value = null
    selectedDistrict.value = null
    selectedStreet.value = null
    cityList.value = []
    districtList.value = []
    streetList.value = []
    // 加载省份
    fetchRegions(0).then((list) => {
      provinceList.value = list
    })
    // 下一帧触发面板滑入动画
    nextTick(() => {
      showPanel.value = true
    })
  } else {
    showPanel.value = false
  }
})
</script>

<style lang="scss" scoped>
.city-picker-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 300;
}

.city-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
}

.city-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.3s ease;

  &.show {
    transform: translateY(0);
  }
}

.city-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 32rpx 16rpx;
  position: relative;
}

.city-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.city-close {
  position: absolute;
  right: 32rpx;
  top: 32rpx;
  font-size: 36rpx;
  color: #999;
  padding: 8rpx;
}

.city-breadcrumb {
  display: flex;
  align-items: center;
  padding: 8rpx 32rpx 20rpx;
  flex-wrap: wrap;
}

.bread-item {
  font-size: 26rpx;
  color: #999;
  padding: 4rpx 8rpx;

  &.active {
    color: #FF6B9D;
    font-weight: bold;
  }
}

.bread-sep {
  font-size: 24rpx;
  color: #ccc;
  margin: 0 4rpx;
}

.city-list {
  height: 600rpx;
  padding: 0 32rpx;
}

.city-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  border-bottom: 1rpx solid #f5f5f5;

  &.selected {
    .city-item-name {
      color: #FF6B9D;
      font-weight: bold;
    }
  }
}

.city-item-name {
  font-size: 30rpx;
  color: #333;
}

.city-item-check {
  font-size: 32rpx;
  color: #FF6B9D;
  font-weight: bold;
}

.city-empty {
  text-align: center;
  padding: 60rpx 0;
  font-size: 28rpx;
  color: #ccc;
}

.city-loading {
  text-align: center;
  padding: 60rpx 0;
  font-size: 28rpx;
  color: #999;
}

.city-footer {
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.city-confirm {
  width: 100%;
  height: 88rpx;
  background-color: #FF6B9D;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 30rpx;
    color: #fff;
    font-weight: bold;
  }
}
</style>
