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
    <view class="crop-body">
      <!-- 半透明遮罩层 -->
      <view class="crop-mask-top" :style="{ height: maskTop + 'px' }"></view>
      <view class="crop-mask-bottom" :style="{ height: maskTop + 'px' }"></view>
      <view class="crop-mask-left" :style="{ width: maskLeft + 'px' }"></view>
      <view class="crop-mask-right" :style="{ width: maskLeft + 'px' }"></view>

      <!-- 裁剪框边框 -->
      <view class="crop-frame" :style="{ width: cropSize + 'px', height: cropSize + 'px' }">
        <!-- 四角标记 -->
        <view class="corner corner-tl"></view>
        <view class="corner corner-tr"></view>
        <view class="corner corner-bl"></view>
        <view class="corner corner-br"></view>
      </view>

      <!-- 可拖动的图片区域 -->
      <movable-area class="crop-movable-area" :style="{ width: areaW + 'px', height: areaH + 'px' }">
        <movable-view
          class="crop-movable"
          :style="{ width: movableW + 'px', height: movableH + 'px' }"
          direction="all"
          :x="movableX"
          :y="movableY"
          @change="onMove"
          :scale="true"
          :scale-min="1"
          :scale-max="4"
          @scale="onScale"
        >
          <image
            :src="imageSrc"
            mode="aspectFill"
            class="crop-image"
            :style="{ width: movableW + 'px', height: movableH + 'px' }"
          />
        </movable-view>
      </movable-area>
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

const statusBarHeight = ref(20)
const safeBottom = ref(0)
const imageSrc = ref('')
const cropSize = ref(0)    // 裁剪框边长
const areaW = ref(0)       // movable-area 宽度（全屏宽）
const areaH = ref(0)       // movable-area 高度
const movableW = ref(0)
const movableH = ref(0)
const movableX = ref(0)
const movableY = ref(0)
const currentScale = ref(1)
const currentX = ref(0)
const currentY = ref(0)
let imgNaturalW = 0
let imgNaturalH = 0

// 遮罩动态边长
const maskTop = computed(() => Math.max(0, Math.floor((areaH.value - cropSize.value) / 2)))
const maskLeft = computed(() => Math.max(0, Math.floor((areaW.value - cropSize.value) / 2)))

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  safeBottom.value = sysInfo.safeAreaInsets?.bottom || 0

  const screenW = sysInfo.windowWidth || 375
  const screenH = sysInfo.windowHeight || 667

  // 导航栏高度
  const navH = 88 // rpx → px 转换按 750 设计稿
  const navPx = Math.round(navH * screenW / 750)
  const bottomBarH = 64 // 底部操作栏约 64px

  // 裁剪框边长：屏幕宽度的80%
  cropSize.value = Math.round(screenW * 0.8)

  // movable-area 覆盖整个屏幕（扣除导航栏和底部栏）
  areaW.value = screenW
  areaH.value = screenH - navPx - statusBarHeight.value - bottomBarH - safeBottom.value

  // 获取图片路径
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const src = page?.options?.src
  if (src) {
    imageSrc.value = decodeURIComponent(src)
    uni.getImageInfo({
      src: imageSrc.value,
      success: (info) => {
        imgNaturalW = info.width
        imgNaturalH = info.height

        // 图片初始显示尺寸：按 movable-area 区域填充
        // 取短边至少填满裁剪框
        const minDisplay = cropSize.value * 1.6 // 初始放大1.6倍便于裁剪
        let w: number, h: number
        const ratio = imgNaturalW / imgNaturalH
        if (ratio >= 1) {
          // 横图：按高度定
          h = minDisplay
          w = h * ratio
        } else {
          // 竖图：按宽度定
          w = minDisplay
          h = w / ratio
        }
        movableW.value = Math.round(w)
        movableH.value = Math.round(h)

        // 初始位置：居中
        movableX.value = Math.round((areaW.value - w) / 2)
        movableY.value = Math.round((areaH.value - h) / 2)
      },
    })
  }
})

const onMove = (e: any) => {
  currentX.value = e.detail.x || 0
  currentY.value = e.detail.y || 0
}

const onScale = (e: any) => {
  currentScale.value = e.detail.scale || 1
  currentX.value = e.detail.x || 0
  currentY.value = e.detail.y || 0
}

const handleCancel = () => {
  uni.navigateBack({ delta: 1 })
}

const handleReselect = () => {
  // 返回上一页，由上一页重新选择
  uni.navigateBack({ delta: 1 })
}

const handleConfirm = () => {
  if (!imageSrc.value) return

  uni.showLoading({ title: '裁剪中...' })

  const cropW = cropSize.value
  const displayW = movableW.value
  const displayH = movableH.value
  const s = currentScale.value

  // 图片 aspectFill 在 movable-view 内的偏移
  const fillW = displayW
  const fillH = displayH
  let offsetInsideX = (displayW - fillW) / 2
  let offsetInsideY = (displayH - fillH) / 2

  // movable-view 在 movable-area 中的居中位置
  const areaCenterX = areaW.value / 2
  const areaCenterY = areaH.value / 2
  const cropCenterX = areaCenterX
  const cropCenterY = areaCenterY

  // 当前 movable-view 的中心位置
  const moveCenterX = currentX.value + (displayW * s) / 2
  const moveCenterY = currentY.value + (displayH * s) / 2

  // 裁剪框左上角在 movable-view 坐标系中的位置
  const cropLeftInMovable = (cropCenterX - cropW / 2 - currentX.value) / s
  const cropTopInMovable = (cropCenterY - cropW / 2 - currentY.value) / s
  const cropWidthInMovable = cropW / s

  // 映射回原图像素
  const sx = Math.max(0, Math.round((cropLeftInMovable - offsetInsideX) / fillW * imgNaturalW))
  const sy = Math.max(0, Math.round((cropTopInMovable - offsetInsideY) / fillH * imgNaturalH))
  const sw = Math.round(cropWidthInMovable / fillW * imgNaturalW)
  const sh = Math.round(cropWidthInMovable / fillH * imgNaturalH)

  const ctx = uni.createCanvasContext('cropCanvas')
  ctx.drawImage(imageSrc.value, sx, sy, sw, sh, 0, 0, cropW, cropW)
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
        success: (res) => {
          uni.hideLoading()
          const pages = getCurrentPages()
          const prevPage = pages[pages.length - 2] as any
          if (prevPage?.getOpenerEventChannel) {
            prevPage.getOpenerEventChannel().emit('cropped', { path: res.tempFilePath })
          }
          uni.navigateBack({ delta: 1 })
        },
        fail: () => {
          uni.hideLoading()
          uni.showToast({ title: '裁剪失败', icon: 'none' })
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
  background: #1a1a1a;
}

.crop-movable-area {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.crop-movable {
  display: flex;
  align-items: center;
  justify-content: center;
}

.crop-image {
  width: 100%;
  height: 100%;
}

// 遮罩层
.crop-mask-top,
.crop-mask-bottom,
.crop-mask-left,
.crop-mask-right {
  position: absolute;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2;
  pointer-events: none;
}

.crop-mask-top {
  top: 0;
  left: 0;
  right: 0;
}

.crop-mask-bottom {
  bottom: 0;
  left: 0;
  right: 0;
}

.crop-mask-left {
  top: 0;
  bottom: 0;
  left: 0;
}

.crop-mask-right {
  top: 0;
  bottom: 0;
  right: 0;
}

.crop-frame {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  border: 2px solid #07C160;
}

.crop-body {
  display: flex;
  align-items: center;
  justify-content: center;
}

// 四角标记
.corner {
  position: absolute;
  width: 24rpx;
  height: 24rpx;
  z-index: 4;
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
