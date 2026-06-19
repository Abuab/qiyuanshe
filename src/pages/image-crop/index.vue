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
      <!-- movable-area：超大区域，居中放置，允许图片大幅拖动 -->
      <movable-area
        class="crop-movable-area"
        :style="{
          width: areaW + 'px',
          height: areaH + 'px'
        }"
      >
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
          :inertia="true"
        >
          <image
            :src="imageSrc"
            mode="aspectFill"
            class="crop-image"
            :style="{ width: movableW + 'px', height: movableH + 'px' }"
          />
        </movable-view>
      </movable-area>

      <!-- 四块半透明遮罩盖住裁剪框外部 -->
      <view class="crop-mask-top" :style="{ height: maskTop + 'px' }"></view>
      <view class="crop-mask-bottom" :style="{ height: maskTop + 'px' }"></view>
      <view class="crop-mask-left" :style="{ width: maskLeft + 'px' }"></view>
      <view class="crop-mask-right" :style="{ width: maskLeft + 'px' }"></view>

      <!-- 裁剪框（居中） -->
      <view class="crop-frame" :style="{ width: cropSize + 'px', height: cropSize + 'px' }">
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

const statusBarHeight = ref(20)
const safeBottom = ref(0)
const imageSrc = ref('')
const cropSize = ref(0)    // 裁剪框边长 (px)
const screenW = ref(375)
const bodyH = ref(0)       // 裁剪区域可视高度
const areaW = ref(0)       // movable-area 宽度（= screenW）
const areaH = ref(0)       // movable-area 高度（= bodyH）
const movableW = ref(0)
const movableH = ref(0)
const movableX = ref(0)
const movableY = ref(0)
const currentScale = ref(1)
const currentX = ref(0)
const currentY = ref(0)
let imgNaturalW = 0
let imgNaturalH = 0

// 遮罩大小 = 裁剪框外到屏幕边缘的距离
const maskTop = computed(() => Math.max(0, Math.floor((bodyH.value - cropSize.value) / 2)))
const maskLeft = computed(() => Math.max(0, Math.floor((screenW.value - cropSize.value) / 2)))

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  safeBottom.value = sysInfo.safeAreaInsets?.bottom || 0
  screenW.value = sysInfo.windowWidth || 375
  const screenH = sysInfo.windowHeight || 667

  // 导航栏 + 底部栏高度
  const navH = 88
  const navPx = Math.round(navH * screenW.value / 750)
  const bottomBarH = 64

  // 可视裁剪区域高度
  bodyH.value = screenH - navPx - statusBarHeight.value - bottomBarH - safeBottom.value

  // 裁剪框边长：屏幕宽度的 80%
  cropSize.value = Math.round(screenW.value * 0.8)

  // 获取图片
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

        // movable-view 尺寸 = 图片以 aspectFill 填满 cropSize 的容器
        const displayW = cropSize.value
        const ratio = imgNaturalW / imgNaturalH
        let w = displayW
        let h = displayW / ratio
        if (Math.abs(ratio - 1) < 0.01) {
          h = displayW
          w = displayW
        }
        movableW.value = Math.round(w)
        movableH.value = Math.round(h)

        // movable-area 与裁剪区域等大，不超出可视范围（微信原生组件无法被遮罩覆盖）
        areaW.value = screenW.value
        areaH.value = bodyH.value

        // movable-view 初始位置居中对齐裁剪框
        movableX.value = Math.round((screenW.value - movableW.value) / 2)
        movableY.value = Math.round((bodyH.value - movableH.value) / 2)
      },
      fail: () => {
        uni.showToast({ title: '加载图片失败', icon: 'none' })
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
  uni.navigateBack({ delta: 1 })
}

const handleConfirm = () => {
  if (!imageSrc.value) return

  uni.showLoading({ title: '裁剪中...' })

  const cropW = cropSize.value
  const s = currentScale.value
  const containerW = movableW.value
  const containerH = movableH.value

  // 图片以 aspectFill 填充 movable-view 时的渲染尺寸和偏移
  const fillScale = Math.max(containerW / imgNaturalW, containerH / imgNaturalH)
  const renderedW = imgNaturalW * fillScale
  const renderedH = imgNaturalH * fillScale
  const offsetInsideX = (containerW - renderedW) / 2
  const offsetInsideY = (containerH - renderedH) / 2

  // 图片在 crop-body 坐标系中的视觉位置
  // movable-view 缩放从中心扩展，因此视觉左/上 = 原始位置 - 扩展量的一半
  const imgVisualLeft = currentX.value - (s - 1) * containerW / 2 + offsetInsideX * s
  const imgVisualTop = currentY.value - (s - 1) * containerH / 2 + offsetInsideY * s

  // 裁剪框在 crop-body 中居中
  const cropCenterX = screenW.value / 2
  const cropCenterY = bodyH.value / 2
  const cropLeft = cropCenterX - cropW / 2
  const cropTop = cropCenterY - cropW / 2

  // 裁剪框相对于显示图片的偏移
  const relX = cropLeft - imgVisualLeft
  const relY = cropTop - imgVisualTop

  // 映射回原图像素坐标
  const displayImgW = renderedW * s
  const displayImgH = renderedH * s
  const sx = Math.round(relX / displayImgW * imgNaturalW)
  const sy = Math.round(relY / displayImgH * imgNaturalH)
  const sw = Math.round(cropW / displayImgW * imgNaturalW)
  const sh = Math.round(cropW / displayImgH * imgNaturalH)

  // 裁剪到 canvas
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
        success: (res: any) => {
          uni.hideLoading()
          const resultPath = res.tempFilePath
          const pages = getCurrentPages()
          const prevPage = pages.length >= 2 ? pages[pages.length - 2] : null

          // eventChannel 通知返回页面
          try {
            if ((prevPage as any)?.getOpenerEventChannel) {
              ;(prevPage as any).getOpenerEventChannel().emit('cropped', { path: resultPath })
            }
          } catch (e) {
            console.error('eventChannel emit 失败:', e)
          }

          // 全局事件兜底
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
  background: #1a1a1a;
}

// movable-area 与 crop-body 等大，从 (0,0) 开始
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

// 遮罩层（四块，盖住裁剪框外的区域）
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

// 裁剪框 — 绝对居中
.crop-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
  border: 2px solid #07C160;
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
