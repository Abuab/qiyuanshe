<template>
  <view v-if="visible" class="store-popup" @tap="handleMaskClose">
    <!-- 遮罩 -->
    <view class="overlay" />
    <!-- 底部滑出面板 -->
    <view class="bottom-sheet" :class="{ 'sheet-visible': sheetVisible }" @tap.stop>
      <!-- 关闭按钮 -->
      <view class="close-btn" @tap="handleClose">
        <text class="close-icon">&#x2715;</text>
      </view>

      <!-- 标题 -->
      <text class="sheet-title">到店认证</text>

      <!-- CSS 插画：粉色门店场景 -->
      <view class="illustration">
        <!-- 天空渐变背景 -->
        <view class="illus-sky">
          <!-- 云朵 -->
          <view class="cloud cloud-1" />
          <view class="cloud cloud-2" />
          <!-- 星星 -->
          <text class="star star-1">&#x2726;</text>
          <text class="star star-2">&#x2727;</text>
          <!-- 城市建筑剪影 -->
          <view class="building-right" />
          <view class="building-left" />
        </view>
        <!-- 树木 -->
        <view class="tree tree-1">
          <view class="tree-crown" />
          <view class="tree-trunk" />
        </view>
        <view class="tree tree-2">
          <view class="tree-crown" />
          <view class="tree-trunk" />
        </view>
        <!-- 粉色门店 -->
        <view class="store">
          <view class="store-awning" />
          <view class="store-wall">
            <view class="store-window" />
            <view class="store-door" />
          </view>
        </view>
        <!-- 小狗 -->
        <view class="dog">
          <view class="dog-body" />
          <view class="dog-head" />
          <view class="dog-tail" />
        </view>
        <!-- 卡通人物（简化剪影） -->
        <view class="character">
          <view class="char-head" />
          <view class="char-body" />
        </view>
      </view>

      <!-- 说明文字 -->
      <view class="desc-wrap">
        <text class="desc-line">到店与红娘详细沟通你的择偶要求</text>
        <text class="desc-line">更能体现你的诚意，你可以去以下门店认证</text>
      </view>

      <!-- 门店地址卡片 -->
      <view class="store-card" @tap="openNavigation" v-if="storeName">
        <view class="store-card-left">
          <text class="store-card-name">{{ storeName }}</text>
          <text class="store-card-address">{{ storeAddress }}</text>
        </view>
        <view class="store-card-right">
          <view class="nav-btn">
            <text class="nav-arrow">&#x2191;</text>
          </view>
        </view>
      </view>
      <!-- 无门店信息占位 -->
      <view class="store-card store-card--empty" v-else>
        <text class="store-empty-text">暂无门店信息，请联系管理员配置</text>
      </view>

      <!-- 底部预约按钮 -->
      <view class="cta-btn" @tap="handleBook">
        <text class="cta-text">与红娘预约到店时间</text>
      </view>

      <!-- 安全区适配 -->
      <view class="safe-bottom" />
    </view>

    <!-- 红娘联系方式弹窗（复用现有组件；包一层阻止冒泡，避免点击红娘弹窗误触遮罩关闭到店弹窗） -->
    <view @tap.stop>
      <matchmaker-popup
        v-model:show="matchmakerPopupShow"
        :matchmaker="selectedMatchmaker || {}"
        @close="matchmakerPopupShow = false"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useSystemStore } from '@/store/system'
import { get } from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import MatchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()

const systemStore = useSystemStore()

const visible = ref(false)
const sheetVisible = ref(false)

const storeName = computed(() => systemStore.storeCert?.name || '')
const storeAddress = computed(() => systemStore.storeCert?.address || '')
const storeLat = computed(() => systemStore.storeCert?.latitude || 0)
const storeLng = computed(() => systemStore.storeCert?.longitude || 0)

// 红娘弹窗
const matchmakerPopupShow = ref(false)
const selectedMatchmaker = ref<any>(null)
const matchmakerList = ref<any[]>([])

watch(() => props.show, (newVal) => {
  if (newVal) {
    visible.value = true
    nextTick(() => {
      setTimeout(() => { sheetVisible.value = true }, 50)
    })
  }
}, { immediate: true })

function handleClose() {
  sheetVisible.value = false
  setTimeout(() => {
    visible.value = false
    emit('close')
  }, 300)
}

function handleMaskClose() {
  handleClose()
}

function openNavigation() {
  const lat = storeLat.value
  const lng = storeLng.value

  if (lat && lng) {
    // 有经纬度时按坐标唤起地图导航
    uni.openLocation({
      latitude: lat,
      longitude: lng,
      name: storeName.value || '门店地址',
      address: storeAddress.value,
      scale: 16,
    })
  } else {
    // uni.openLocation 依赖经纬度，未配置坐标时无法定位
    uni.showToast({ title: '暂未配置门店导航坐标', icon: 'none' })
  }
}

async function fetchMatchmakerList() {
  try {
    const res: any = await get('/matchmakers')
    const rawList = Array.isArray(res) ? res : (res?.data || res?.list || [])
    matchmakerList.value = rawList.map((item: any) => ({
      ...item,
      qrCode: getFullImageUrl(item.qrCode || item.qr_code || item.qrcode),
      avatar: getFullImageUrl(item.avatar),
    }))
  } catch {
    matchmakerList.value = []
  }
}

async function handleBook() {
  // 复用现有红娘联系方式弹窗，红娘数据来源于 /matchmakers 接口
  if (matchmakerList.value.length === 0) {
    await fetchMatchmakerList()
  }
  if (matchmakerList.value.length === 0) {
    uni.showToast({ title: '暂无红娘信息', icon: 'none' })
    return
  }
  selectedMatchmaker.value = matchmakerList.value[0]
  matchmakerPopupShow.value = true
}
</script>

<style lang="scss" scoped>
.store-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
}
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
}
.bottom-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 85vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  padding: 40rpx 36rpx 0;
  overflow-y: auto;
  box-sizing: border-box;
}
.sheet-visible {
  transform: translateY(0);
}

/* 关闭按钮 */
.close-btn {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-icon {
  font-size: 32rpx;
  color: #999;
}

/* 标题 */
.sheet-title {
  display: block;
  text-align: center;
  font-size: 34rpx;
  font-weight: bold;
  color: #222;
  margin-bottom: 24rpx;
}

/* ===== 插画区域 ===== */
.illustration {
  width: 100%;
  height: 340rpx;
  border-radius: 20rpx;
  position: relative;
  overflow: hidden;
  margin-bottom: 24rpx;
}
.illus-sky {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #FFEDF2 0%, #FFD3DE 40%, #FFC4D6 100%);
}
/* 云朵 */
.cloud {
  position: absolute;
  background: #fff;
  border-radius: 999rpx;
  opacity: 0.8;
}
.cloud::before,
.cloud::after {
  content: '';
  position: absolute;
  background: #fff;
  border-radius: 50%;
}
.cloud-1 {
  width: 90rpx;
  height: 32rpx;
  top: 30rpx;
  left: 50rpx;
}
.cloud-1::before {
  width: 40rpx;
  height: 40rpx;
  top: -22rpx;
  left: 16rpx;
}
.cloud-1::after {
  width: 30rpx;
  height: 30rpx;
  top: -14rpx;
  right: 10rpx;
}
.cloud-2 {
  width: 70rpx;
  height: 26rpx;
  top: 56rpx;
  right: 80rpx;
}
.cloud-2::before {
  width: 34rpx;
  height: 34rpx;
  top: -18rpx;
  left: 12rpx;
}
/* 星星 */
.star {
  position: absolute;
  color: #FFB8C6;
  font-size: 18rpx;
}
.star-1 { top: 18rpx; right: 140rpx; }
.star-2 { top: 48rpx; left: 160rpx; }

/* 城市建筑剪影 */
.building-right {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 80rpx;
  height: 160rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6rpx 6rpx 0 0;
}
.building-right::before {
  content: '';
  position: absolute;
  top: -30rpx;
  left: 10rpx;
  width: 24rpx;
  height: 30rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4rpx 4rpx 0 0;
}
.building-left {
  position: absolute;
  left: 10rpx;
  bottom: 0;
  width: 64rpx;
  height: 110rpx;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 4rpx 4rpx 0 0;
}

/* 树木 */
.tree {
  position: absolute;
  bottom: 0;
}
.tree-1 { left: 60rpx; }
.tree-2 { right: 90rpx; }
.tree-crown {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
}
.tree-1 .tree-crown {
  background: radial-gradient(circle at 40% 40%, #9EBF8F, #6E9A5C);
}
.tree-2 .tree-crown {
  background: radial-gradient(circle at 40% 40%, #A4C89A, #7CA868);
  width: 44rpx;
  height: 44rpx;
}
.tree-trunk {
  width: 14rpx;
  height: 32rpx;
  background: #C5A47E;
  margin: 0 auto;
  border-radius: 4rpx;
}
.tree-2 .tree-trunk {
  height: 26rpx;
}

/* 粉色门店 */
.store {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 200rpx;
}
.store-awning {
  width: 100%;
  height: 36rpx;
  background: linear-gradient(180deg, #FF7B9A, #FF5B84);
  border-radius: 8rpx 8rpx 0 0;
  position: relative;
}
.store-awning::after {
  content: '';
  position: absolute;
  bottom: -8rpx;
  left: 0;
  right: 0;
  height: 10rpx;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 16rpx,
    #FF8BA6 16rpx,
    #FF8BA6 20rpx
  );
}
.store-wall {
  width: 100%;
  height: 120rpx;
  background: #FFE0E8;
  border-radius: 0 0 6rpx 6rpx;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 20rpx;
  box-sizing: border-box;
}
.store-window {
  width: 48rpx;
  height: 48rpx;
  background: #FFF5F7;
  border-radius: 6rpx;
  border: 3rpx solid #FFB8C6;
}
.store-door {
  width: 52rpx;
  height: 80rpx;
  background: #FFB8C6;
  border-radius: 8rpx 8rpx 0 0;
  border: 3rpx solid #FF9AAE;
}

/* 小狗 */
.dog {
  position: absolute;
  bottom: 8rpx;
  left: 30rpx;
}
.dog-body {
  width: 32rpx;
  height: 22rpx;
  background: #E8D5B0;
  border-radius: 50%;
  position: relative;
}
.dog-head {
  width: 20rpx;
  height: 20rpx;
  background: #E8D5B0;
  border-radius: 50%;
  position: absolute;
  top: -16rpx;
  left: 0;
}
.dog-tail {
  width: 14rpx;
  height: 6rpx;
  background: #E8D5B0;
  border-radius: 3rpx;
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  transform: rotate(-30deg);
}

/* 卡通人物 */
.character {
  position: absolute;
  bottom: 6rpx;
  right: 50rpx;
}
.char-head {
  width: 28rpx;
  height: 28rpx;
  background: #FFE0C8;
  border-radius: 50%;
  margin: 0 auto 4rpx;
}
.char-body {
  width: 40rpx;
  height: 48rpx;
  background: #FF8BA6;
  border-radius: 18rpx 18rpx 8rpx 8rpx;
}

/* ===== 说明文字 ===== */
.desc-wrap {
  text-align: center;
  margin-bottom: 24rpx;
}
.desc-line {
  display: block;
  font-size: 26rpx;
  color: #888;
  line-height: 1.6;
}

/* ===== 门店地址卡片 ===== */
.store-card {
  display: flex;
  align-items: center;
  background: #FFF5F7;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 36rpx;
}
.store-card--empty {
  justify-content: center;
  padding: 40rpx 24rpx;
}
.store-card-left {
  flex: 1;
  min-width: 0;
}
.store-card-name {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #222;
  margin-bottom: 10rpx;
}
.store-card-address {
  display: block;
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
}
.store-empty-text {
  font-size: 26rpx;
  color: #999;
}
.store-card-right {
  flex-shrink: 0;
  margin-left: 20rpx;
}
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #FF5B84;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-arrow {
  font-size: 34rpx;
  color: #fff;
  font-weight: bold;
}

/* ===== 底部预约按钮 ===== */
.cta-btn {
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(90deg, #FFA0B9 0%, #FF5B84 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(255, 91, 132, 0.28);
}
.cta-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}

/* 安全区适配 */
.safe-bottom {
  height: calc(30rpx + env(safe-area-inset-bottom));
}
</style>
