<template>
  <view class="crop-page">
    <!-- 顶部标题栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleCancel">
          <text class="back-arrow">←</text>
        </view>
        <text class="nav-title">裁剪头像</text>
        <view class="nav-right">
          <text class="cancel-text" @tap="handleCancel">取消</text>
        </view>
      </view>
    </view>

    <!-- 裁剪区域 -->
    <view
      class="crop-body"
      @touchstart.prevent="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- 第1层：图片，绝对定位，覆盖裁剪区域全高，可上下移动 -->
      <image
        v-if="ready"
        :src="imageSrc"
        class="crop-image"
        :style="imgStyle"
      />

      <!-- 第2层：遮罩层，覆盖全区域，中间挖空（透明） -->
      <view class="mask-layer">
        <view class="mask-row mask-top" :style="{ height: cropTopPx + 'px' }"></view>
        <view class="mask-row mask-middle" :style="{ height: cropSize + 'px' }">
          <view class="mask-col mask-left" :style="{ width: cropLeftPx + 'px' }"></view>
          <view class="mask-col mask-center" :style="{ width: cropSize + 'px' }"></view>
          <view class="mask-col mask-right" :style="{ width: cropLeftPx + 'px' }"></view>
        </view>
        <view class="mask-row mask-bottom" style="flex:1"></view>
      </view>

      <!-- 第3层：裁剪框边框 + 四角标记 -->
      <view class="crop-frame" :style="{
        width: cropSize + 'px',
        height: cropSize + 'px',
        top: cropTopPx + 'px',
        left: cropLeftPx + 'px'
      }">
        <view class="corner corner-tl"></view>
        <view class="corner corner-tr"></view>
        <view class="corner corner-bl"></view>
        <view class="corner corner-br"></view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar-crop" :style="{ paddingBottom: 'calc(16px + ' + safeBottom + 'px)' }">
      <view class="bottom-btn btn-reselect" @tap="handleReselect">
        <text>重新选择</text>
      </view>
      <view class="bottom-btn btn-confirm" @tap="handleConfirm">
        <text>确定</text>
      </view>
    </view>

    <!-- 隐藏 canvas -->
    <canvas
      canvas-id="cropCanvas"
      class="hidden-canvas"
      :style="{ width: cropSize + 'px', height: cropSize + 'px' }"
    ></canvas>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAndClearCropImageData } from '@/utils/crop-bridge'

const statusBarHeight = ref(20)
const safeBottom = ref(0)
const imageSrc = ref('')
const cropSize = ref(0)
const screenW = ref(375)
const bodyH = ref(0)
const ready = ref(false)

let imgNaturalW = 0
let imgNaturalH = 0

// translateY：图片在 crop-body 内的垂直偏移 (px)，范围 [H - h, 0]
const translateY = ref(0)

// scale = cropSize / imgNaturalW
const scale = computed(() => cropSize.value / imgNaturalW)

// 缩放后图片高度
const displayH = computed(() => imgNaturalH * scale.value)

// 裁剪框位置
const cropTopPx = computed(() => Math.floor((bodyH.value - cropSize.value) / 2))
const cropLeftPx = computed(() => Math.floor((screenW.value - cropSize.value) / 2))

// 图片样式：宽度 = 裁剪框宽，高度按比例，定位在 crop-body 顶部从 cropTopPx 开始，translateY 控制位移
const imgStyle = computed(() => {
  const w = cropSize.value
  const h = Math.round(displayH.value)
  return `left:${cropLeftPx.value}px;top:${cropTopPx.value}px;` +
    `width:${w}px;height:${h}px;` +
    `transform:translateY(${translateY.value}px);`
})

// ====== 触摸交互 ======
let touchStartY = 0
let translateYStart = 0

const onTouchStart = (e: any) => {
  const touch = e.touches[0]
  touchStartY = touch.clientY
  translateYStart = translateY.value
}

const onTouchMove = (e: any) => {
  if (!ready.value) return
  const deltaY = (e.touches[0]?.clientY ?? 0) - touchStartY
  let newY = translateYStart + deltaY

  const h = displayH.value
  const H = cropSize.value
  if (h <= H) {
    newY = (H - h) / 2
  } else {
    newY = Math.max(H - h, Math.min(0, newY))
  }
  translateY.value = newY
}

const onTouchEnd = () => {
  if (!ready.value) return
  const h = displayH.value
  const H = cropSize.value
  if (h <= H) return
  if (translateY.value > 0) translateY.value = 0
  else if (translateY.value < H - h) translateY.value = H - h
}

// ====== 生命周期 ======
onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  safeBottom.value = sysInfo.safeAreaInsets?.bottom || 0
  screenW.value = sysInfo.windowWidth || 375
  const screenH = sysInfo.windowHeight || 667

  const navPx = Math.round(88 * screenW.value / 750)
  const bottomBarH = 64
  bodyH.value = screenH - navPx - statusBarHeight.value - bottomBarH - safeBottom.value
  cropSize.value = Math.round(screenW.value * 0.8)

  const bridgeData = getAndClearCropImageData()
  if (bridgeData) {
    imageSrc.value = bridgeData.path
    imgNaturalW = bridgeData.width
    imgNaturalH = bridgeData.height
    ready.value = true
  } else {
    const src = (() => {
      const p = (getCurrentPages().slice(-1)[0] as any)?.options?.src
      return p ? decodeURIComponent(p) : ''
    })()
    if (src) {
      uni.getImageInfo({
        src,
        success: (info) => {
          imageSrc.value = src
          imgNaturalW = info.width
          imgNaturalH = info.height
          ready.value = true
        },
        fail: () => uni.showToast({ title: '加载图片失败', icon: 'none' }),
      })
    }
  }
})

// ====== 按钮 ======
const handleCancel = () => uni.navigateBack({ delta: 1 })
const handleReselect = () => uni.navigateBack({ delta: 1 })

const handleConfirm = () => {
  if (!imageSrc.value) return
  uni.showLoading({ title: '裁剪中...' })

  const cropW = cropSize.value
  const s = scale.value
  const sy = Math.round(-translateY.value / s)
  const sw = Math.round(cropW / s)
  const sh = Math.round(cropW / s)

  const srcX = 0
  const srcY = Math.max(0, Math.min(sy, Math.max(0, imgNaturalH - sh)))
  const srcW = Math.min(sw, imgNaturalW)
  const srcH = Math.min(sh, imgNaturalH - srcY)

  const ctx = uni.createCanvasContext('cropCanvas')
  ctx.drawImage(imageSrc.value, srcX, srcY, srcW, srcH, 0, 0, cropW, cropW)
  ctx.draw(false, () => {
    setTimeout(() => {
      uni.canvasToTempFilePath({
        canvasId: 'cropCanvas',
        width: cropW, height: cropW,
        destWidth: cropW * 2, destHeight: cropW * 2,
        fileType: 'jpg', quality: 0.9,
        success: (res: any) => {
          uni.hideLoading()
          try {
            const pages = getCurrentPages()
            const prevPage = pages.length >= 2 ? pages[pages.length - 2] : null
            if ((prevPage as any)?.getOpenerEventChannel) {
              ;(prevPage as any).getOpenerEventChannel().emit('cropped', { path: res.tempFilePath })
            }
          } catch (_) {}
          uni.$emit('IMAGE_CROPPED', { path: res.tempFilePath })
          uni.navigateBack({ delta: 1 })
        },
        fail: (err: any) => {
          uni.hideLoading()
          console.error('canvasToTempFilePath 失败:', err)
          uni.showToast({ title: '裁剪失败，请重试', icon: 'none' })
        },
      })
    }, 300)
  })
}
</script>

<style lang="scss" scoped>
.crop-page {
  width: 100vw;
  height: 100vh;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
}

// ===== 顶部导航 =====
.nav-wrap {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: #1a1a1a;
}

.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
}

.nav-left, .nav-right { width: 120rpx; }
.nav-right { display: flex; justify-content: flex-end; }

.back-arrow { font-size: 40rpx; color: #fff; font-weight: 300; }
.cancel-text { font-size: 28rpx; color: rgba(255,255,255,0.7); }
.nav-title { font-size: 34rpx; font-weight: 600; color: #fff; }

// ===== 裁剪区域 =====
.crop-body {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: transparent;  // 不设背景色，让图片自然显示
}

// 第1层：图片
.crop-image {
  position: absolute;
  z-index: 1;
  display: block;
}

// 第2层：遮罩（中间挖空）
.mask-layer {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 2;
  pointer-events: none;
  display: flex;
  flex-direction: column;
}

.mask-row {
  background: rgba(0, 0, 0, 0.6);
}

.mask-middle {
  display: flex;
  flex-direction: row;
  background: transparent;
}

.mask-col {
  background: rgba(0, 0, 0, 0.6);
}

.mask-center {
  background: transparent;   // 挖空区域，完全透明
}

// 第3层：裁剪框边框 + 四角
.crop-frame {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  border: 2px solid #07C160;
  background: transparent;
}

.corner {
  position: absolute;
  width: 24rpx;
  height: 24rpx;
  z-index: 4;
}

.corner-tl {
  top: -4rpx; left: -4rpx;
  border-top: 6rpx solid #07C160;
  border-left: 6rpx solid #07C160;
}

.corner-tr {
  top: -4rpx; right: -4rpx;
  border-top: 6rpx solid #07C160;
  border-right: 6rpx solid #07C160;
}

.corner-bl {
  bottom: -4rpx; left: -4rpx;
  border-bottom: 6rpx solid #07C160;
  border-left: 6rpx solid #07C160;
}

.corner-br {
  bottom: -4rpx; right: -4rpx;
  border-bottom: 6rpx solid #07C160;
  border-right: 6rpx solid #07C160;
}

// ===== 底部操作栏 =====
.bottom-bar-crop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 64rpx;
  padding-top: 20rpx;
  background: #1a1a1a;
  flex-shrink: 0;
}

.bottom-btn text { font-size: 32rpx; }
.btn-reselect text { color: rgba(255,255,255,0.55); }
.btn-confirm text { color: #07C160; font-weight: 600; }

.hidden-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
}
</style>
