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
      <!-- 底层遮罩：半透明黑色，覆盖整个裁剪区域 -->
      <view class="crop-overlay-mask"></view>

      <!-- 裁剪框容器（正方形，overflow:hidden，绿色边框） -->
      <view
        v-if="ready"
        class="crop-box"
        :style="{
          width: cropSize + 'px',
          height: cropSize + 'px',
          top: cropTopPx + 'px',
          left: cropLeftPx + 'px',
        }"
      >
        <!-- 图片：裁剪框容器的直接子元素 -->
        <image
          :src="imageSrc"
          class="crop-img"
          :style="imgStyle"
        />

        <!-- 四角标记：在裁剪框容器内，图片上层 -->
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

    <!-- 隐藏 canvas 用于裁剪输出 -->
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

// ====== 布局尺寸 ======
const statusBarHeight = ref(20)
const safeBottom = ref(0)
const imageSrc = ref('')
const cropSize = ref(0)   // 裁剪框边长 (px)
const screenW = ref(375)
const bodyH = ref(0)      // 裁剪区域可视高度
const ready = ref(false)

// ====== 图片信息 ======
let imgNaturalW = 0
let imgNaturalH = 0

// ====== 核心参数 ======
// translateY：图片在 crop-box 内的垂直偏移 (px)，范围 [H - h, 0]
const translateY = ref(0)

// 按公式1: scale = cropSize / imgNaturalW
const scale = computed(() => cropSize.value / imgNaturalW)

// 按公式2: 缩放后图片高度 = 原始高度 × scale
// 图片 width:100% 时渲染宽度 = cropSize，高度 = imgNaturalH * (cropSize / imgNaturalW)
const displayH = computed(() => imgNaturalH * scale.value)

// 初始 translateY：(H - h) / 2 （垂直居中）
const initTranslateY = () => {
  translateY.value = (cropSize.value - displayH.value) / 2
}

// 裁剪框定位
const cropTopPx = computed(() => Math.floor((bodyH.value - cropSize.value) / 2))
const cropLeftPx = computed(() => Math.floor((screenW.value - cropSize.value) / 2))

// 图片样式：width:100% 填满容器宽度，通过 translateY 上下移动
// 不使用 transform:scale()，避免小程序 overflow:hidden 对 scale 裁剪失效
const imgStyle = computed(() => {
  return `width:100%;height:auto;transform:translateY(${translateY.value}px);`
})

// ====== 触摸交互（只处理垂直方向 deltaY） ======
let touchStartY = 0
let translateYStart = 0

const onTouchStart = (e: any) => {
  const touch = e.touches[0]
  touchStartY = touch.clientY
  translateYStart = translateY.value
}

const onTouchMove = (e: any) => {
  if (!ready.value) return
  const touch = e.touches[0]
  // 只取 deltaY，完全忽略 deltaX（绝对禁止左右移动）
  const deltaY = touch.clientY - touchStartY
  let newY = translateYStart + deltaY

  const h = displayH.value
  const H = cropSize.value
  if (h <= H) {
    // 横图高度不足 → 固定居中，不允许拖动
    newY = (H - h) / 2
  } else {
    // 硬边界: translateY ∈ [H - h, 0]
    const minY = H - h   // 底部对齐
    const maxY = 0       // 顶部对齐
    newY = Math.max(minY, Math.min(maxY, newY))
  }

  translateY.value = newY
}

const onTouchEnd = () => {
  if (!ready.value) return
  const h = displayH.value
  const H = cropSize.value
  if (h <= H) return

  // 超出边界回弹
  if (translateY.value > 0) {
    translateY.value = 0
  } else if (translateY.value < (H - h)) {
    translateY.value = H - h
  }
}

// ====== 生命周期 ======
onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  safeBottom.value = sysInfo.safeAreaInsets?.bottom || 0
  screenW.value = sysInfo.windowWidth || 375
  const screenH = sysInfo.windowHeight || 667

  const navH = 88
  const navPx = Math.round(navH * screenW.value / 750)
  const bottomBarH = 64

  bodyH.value = screenH - navPx - statusBarHeight.value - bottomBarH - safeBottom.value
  cropSize.value = Math.round(screenW.value * 0.8)

  const bridgeData = getAndClearCropImageData()
  if (bridgeData) {
    imageSrc.value = bridgeData.path
    imgNaturalW = bridgeData.width
    imgNaturalH = bridgeData.height
    initTranslateY()
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
          initTranslateY()
          ready.value = true
        },
        fail: () => {
          uni.showToast({ title: '加载图片失败', icon: 'none' })
        },
      })
    }
  }
})

// ====== 按钮 ======
const handleCancel = () => {
  uni.navigateBack({ delta: 1 })
}

const handleReselect = () => {
  uni.navigateBack({ delta: 1 })
}

const handleConfirm = () => {
  if (!imageSrc.value) return

  uni.showLoading({ title: '裁剪中...' })

  const cropW = cropSize.value
  const s = scale.value

  // 图片渲染: width:100% (即 cropW px) 在容器中，高度 auto
  // translateY = 图片顶部相对于容器顶部的偏移
  // 可见区域从容器顶部 (0) 到容器底部 (cropW)
  // 对应原图: 1 渲染像素 = imgNaturalW / cropW 原图像素
  // sy = -translateY 的像素数 * (imgNaturalW / cropW) = -translateY / scale
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
        width: cropW,
        height: cropW,
        destWidth: cropW * 2,
        destHeight: cropW * 2,
        fileType: 'jpg',
        quality: 0.9,
        success: (res: any) => {
          uni.hideLoading()
          const resultPath = res.tempFilePath
          try {
            const pages = getCurrentPages()
            const prevPage = pages.length >= 2 ? pages[pages.length - 2] : null
            if ((prevPage as any)?.getOpenerEventChannel) {
              ;(prevPage as any).getOpenerEventChannel().emit('cropped', { path: resultPath })
            }
          } catch (e) {
            console.error('eventChannel emit 失败:', e)
          }
          uni.$emit('IMAGE_CROPPED', { path: resultPath })
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
  top: 0;
  left: 0;
  right: 0;
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

.nav-left,
.nav-right {
  width: 120rpx;
}

.nav-right {
  display: flex;
  justify-content: flex-end;
}

.back-arrow {
  font-size: 40rpx;
  color: #fff;
  font-weight: 300;
}

.cancel-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.7);
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
}

// ===== 裁剪区域 =====
.crop-body {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
}

// 底层遮罩：覆盖整个裁剪区域，半透明黑色
// 裁剪框容器在其上层，只有裁剪框内的图片可见
.crop-overlay-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1;
}

// 裁剪框容器：正方形，overflow: hidden，绿色边框
.crop-box {
  position: absolute;
  z-index: 2;
  overflow: hidden;
  border: 2px solid #07C160;
  background: #1a1a1a;
}

// 图片：裁剪框容器的直接子元素，width 100%，translateY 上下移动
.crop-img {
  display: block;
  width: 100%;
  height: auto;
}

// 四角标记：在裁剪框容器内，在最上层
.corner {
  position: absolute;
  width: 24rpx;
  height: 24rpx;
  z-index: 10;
}

.corner-tl {
  top: -4rpx;
  left: -4rpx;
  border-top: 6rpx solid #07C160;
  border-left: 6rpx solid #07C160;
}

.corner-tr {
  top: -4rpx;
  right: -4rpx;
  border-top: 6rpx solid #07C160;
  border-right: 6rpx solid #07C160;
}

.corner-bl {
  bottom: -4rpx;
  left: -4rpx;
  border-bottom: 6rpx solid #07C160;
  border-left: 6rpx solid #07C160;
}

.corner-br {
  bottom: -4rpx;
  right: -4rpx;
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

.bottom-btn {
  text {
    font-size: 32rpx;
  }
}

.btn-reselect {
  text {
    color: rgba(255, 255, 255, 0.55);
  }
}

.btn-confirm {
  text {
    color: #07C160;
    font-weight: 600;
  }
}

// ===== 隐藏 canvas =====
.hidden-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
}
</style>
