<template>
  <view class="city-picker-wrap" v-show="visible">
    <!-- 蒙层 -->
    <view class="city-mask" @tap="handleClose"></view>
    <!-- 白色面板 -->
    <view class="city-panel" :class="{ show: showPanel }">
      <!-- 标题 -->
      <view class="city-header">
        <text class="city-title">选择城市</text>
      </view>

      <!-- 面包屑选择栏 -->
      <view class="city-breadcrumb">
        <view class="bread-left">
          <text
            v-for="(name, idx) in breadcrumb"
            :key="idx"
            class="bread-item"
            @tap="switchLevel(idx)"
          >{{ name }}</text>
          <text v-if="!leafReached" class="bread-current">请选择</text>
        </view>
        <text class="bread-done" @tap="handleConfirm">完成</text>
      </view>

      <!-- 列表区域 -->
      <scroll-view
        class="city-list"
        scroll-y
        :scroll-top="scrollTop"
        scroll-with-animation
        :show-scrollbar="false"
      >
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
  defaultLocation?: { province: string; city: string }
  /** 是否强制必须选择到最后一级（true=编辑资料页；false/省略=筛选页可选到任意一级） */
  requireLeaf?: boolean
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
// 是否已选到最后一级（叶子节点）
const leafReached = ref(false)

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
  leafReached.value = false
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

// 到达最后一级：标记叶子并自动保存关闭
const finalizeSelection = () => {
  leafReached.value = true
  handleConfirm()
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
    leafReached.value = false

    const children = await fetchRegions(item.id)
    if (children.length > 0) {
      cityList.value = children
      scrollTop.value = 0
      currentLevel.value = 1
    } else {
      finalizeSelection()
    }
  } else if (currentLevel.value === 1) {
    selectedCity.value = item
    selectedDistrict.value = null
    selectedStreet.value = null
    districtList.value = []
    streetList.value = []
    leafReached.value = false

    const children = await fetchRegions(item.id)
    if (children.length > 0) {
      districtList.value = children
      scrollTop.value = 0
      currentLevel.value = 2
    } else {
      finalizeSelection()
    }
  } else if (currentLevel.value === 2) {
    selectedDistrict.value = item
    selectedStreet.value = null
    streetList.value = []
    leafReached.value = false

    const children = await fetchRegions(item.id)
    if (children.length > 0) {
      streetList.value = children
      scrollTop.value = 0
      currentLevel.value = 3
    } else {
      finalizeSelection()
    }
  } else if (currentLevel.value === 3) {
    selectedStreet.value = item
    finalizeSelection()
  }
}

const handleConfirm = () => {
  // 编辑资料页：强制必须选择到最后一级
  if (props.requireLeaf && !leafReached.value) {
    uni.showToast({ title: '请选择完整的区域', icon: 'none' })
    return
  }
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
    leafReached.value = false
    selectedProvince.value = null
    selectedCity.value = null
    selectedDistrict.value = null
    selectedStreet.value = null
    cityList.value = []
    districtList.value = []
    streetList.value = []
    // 加载省份
    fetchRegions(0).then(async (list) => {
      provinceList.value = list
      // 支持默认预选省份+城市
      const dl = props.defaultLocation
      if (dl && dl.province) {
        const prov = list.find((r: RegionItem) => r.name.includes(dl.province))
        if (prov && prov.hasChildren) {
          selectedProvince.value = prov
          const cities = await fetchRegions(prov.id)
          cityList.value = cities
          if (dl.city) {
            const city = cities.find((r: RegionItem) => r.name.includes(dl.city))
            if (city && city.hasChildren) {
              selectedCity.value = city
              const districts = await fetchRegions(city.id)
              districtList.value = districts
              currentLevel.value = 2
            } else if (city) {
              selectedCity.value = city
              currentLevel.value = 1
            } else {
              currentLevel.value = 1
            }
          } else {
            currentLevel.value = 1
          }
        }
      }
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
  padding-bottom: env(safe-area-inset-bottom);
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
  height: 88rpx;
  background-color: #fff;
}

.city-title {
  font-size: 36rpx;
  font-weight: 500;
  color: #333333;
}

.city-breadcrumb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 30rpx;
  background-color: #F7F7F7;
}

.bread-left {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
}

.bread-item {
  font-size: 30rpx;
  font-weight: 400;
  color: #333333;
  margin-right: 16rpx;
}

.bread-current {
  font-size: 30rpx;
  font-weight: 400;
  color: #FF4D6F;
}

.bread-done {
  font-size: 30rpx;
  font-weight: 500;
  color: #4A90E2;
  margin-left: 16rpx;
}

.city-list {
  height: 640rpx;
  background-color: #fff;
}

.city-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 104rpx;
  padding: 0 30rpx;

  &::after {
    content: '';
    position: absolute;
    left: 30rpx;
    right: 0;
    bottom: 0;
    height: 1rpx;
    background-color: #EEEEEE;
  }

  &.selected {
    .city-item-name {
      color: #FF4D6F;
    }
  }
}

.city-item-name {
  font-size: 32rpx;
  font-weight: 400;
  color: #333333;
}

.city-item-check {
  font-size: 32rpx;
  color: #FF4D6F;
  margin-right: 15rpx;
}

.city-empty {
  text-align: center;
  padding: 60rpx 0;
  font-size: 28rpx;
  color: #ccc;
}
</style>
