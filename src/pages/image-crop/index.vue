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
      <!-- 图片层（在 crop-box 内，通过 transform 定位） -->
      <view
        class="crop-box"
        v-if="ready"
        :style="{
          width: cropSize + 'px',
          height: cropSize + 'px',
          top: cropTopPx + 'px',
          left: cropLeftPx + 'px',
        }"
      >
        <image
          :src="imageSrc"
          class="crop-img"
          :style="imgStyle"
        />
      </view>

      <!-- 四块半透明黑色遮罩 cover-view（盖在裁剪框外部） -->
      <cover-view class="crop-mask-top" :style="{ height: maskTop + 'px' }"></cover-view>
      <cover-view class="crop-mask-bottom" :style="{ height: maskTop + 'px' }"></cover-view>
      <cover-view class="crop-mask-left" :style="{ width: maskLeft + 'px' }"></cover-view>
      <cover-view class="crop-mask-right" :style="{ width: maskLeft + 'px' }"></cover-view>

      <!-- 裁剪框边框 + 四角标记（cover-view 盖在最上层） -->
      <cover-view class="crop-frame" :style="{
        width: cropSize + 'px',
        height: cropSize + 'px',
        top: cropTopPx + 'px',
        left: cropLeftPx + 'px'
      }">
        <cover-view class="corner corner-tl"></cover-view>
        <cover-view class="corner corner-tr"></cover-view>
        <cover-view class="corner corner-bl"></cover-view>
        <cover-view class="corner corner-br"></cover-view>
      </cover-view>
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
const ready = ref(false)  // 图片加载完毕后才渲染

// ====== 图片信息 ======
let imgNaturalW = 0
let imgNaturalH = 0

// ====== 核心 transform 参数 ======
const translateY = ref(0) // 当前 translateY (px)，允许范围 [minTranslateY, 0]

// ——— 按公式1: scale = 裁剪框宽度 / 图片原始宽度 ———
const scale = computed(() => cropSize.value / imgNaturalW)

// ——— 按公式2: 缩放后高度 ———
const displayH = computed(() => imgNaturalH * scale.value)

// ——— 初次加载后的初始 translateY ——
const initTranslateY = () => {
  // 按公式5: 初始位置 = (H - h) / 2
  translateY.value = (cropSize.value - displayH.value) / 2
}

// ——— 遮罩尺寸（裁剪框外到屏幕边缘）———
const maskTop = computed(() => Math.max(0, Math.floor((bodyH.value - cropSize.value) / 2)))
const maskLeft = computed(() => Math.max(0, Math.floor((screenW.value - cropSize.value) / 2)))
const cropTopPx = computed(() => Math.floor((bodyH.value - cropSize.value) / 2))
const cropLeftPx = computed(() => Math.floor((screenW.value - cropSize.value) / 2))

// ——— 图片样式：transform-origin: left top + transform ———
const imgStyle = computed(() => {
  return `width:${imgNaturalW}px;height:${imgNaturalH}px;` +
    `transform:translate3d(0,${translateY.value}px,0) scale(${scale.value});transform-origin:0 0;`
})

// ====== 触摸交互（只处理垂直） ======
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
  // 按公式6: 只取 deltaY，完全忽略 deltaX
  const deltaY = touch.clientY - touchStartY
  let newY = translateYStart + deltaY

  // 按公式5: 硬边界 [H-h, 0]
  const h = displayH.value
  const H = cropSize.value
  if (h <= H) {
    // 横图高度不足 -> 居中固定，不允许拖动
    newY = (H - h) / 2
  } else {
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
  if (h <= H) return // 无需回弹

  // 按公式6: 松手后超出边界则回弹
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

  // 从 bridge 获取图片数据
  const bridgeData = getAndClearCropImageData()
  if (bridgeData) {
    imageSrc.value = bridgeData.path
    imgNaturalW = bridgeData.width
    imgNaturalH = bridgeData.height
    initTranslateY()
    ready.value = true
  } else {
    // 兜底：URL 参数
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

  // 裁剪区域在图片上的源坐标（公式推导见下方注释）
  // 图片在 crop-box 中以 transform-origin: left top 绝对定位
  // 显示位置: (0, translateY), 大小为 (imgNaturalW*s, imgNaturalH*s)
  // 裁剪框可见区域: (0, 0, cropW, cropW) 在 crop-box 内
  // 对应图片原图坐标: sx=0, sy=-translateY/s, sw=cropW/s, sh=cropW/s
  const sy = Math.round(-translateY.value / s)
  const sw = Math.round(cropW / s)
  const sh = Math.round(cropW / s)

  // 边界钳位（防御性，正常拖动下 translateY 已在范围内 => sy 也应在范围内）
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

          // eventChannel 通知返回页面
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
  background: #1a1a1a;
}

// ===== 裁剪框容器 =====
.crop-box {
  position: absolute;
  z-index: 1;
  overflow: hidden;
}

.crop-img {
  position: absolute;
  top: 0;
  left: 0;
}

// ===== 遮罩层 =====
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

// ===== 裁剪框边框 + 四角 =====
.crop-frame {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  border: 2px solid #07C160;
}

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
