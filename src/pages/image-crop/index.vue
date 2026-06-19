<template>
  <view class="crop-page">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 操作栏 -->
    <view class="nav-bar">
      <view class="nav-btn" @tap="handleCancel"><text>取消</text></view>
      <text class="nav-title">裁剪图片</text>
      <view class="nav-btn nav-btn-confirm" @tap="handleConfirm"><text>确定</text></view>
    </view>

    <!-- 裁剪区域 -->
    <view class="crop-container">
      <movable-area class="crop-area" :style="{ width: cropSize + 'px', height: cropSize + 'px' }">
        <movable-view
          class="crop-movable"
          :style="{ width: imgDisplaySize + 'px', height: imgDisplaySize + 'px' }"
          direction="all"
          :x="movableX"
          :y="movableY"
          @change="onMove"
          :scale="true"
          :scale-min="1"
          :scale-max="3"
          @scale="onScale"
        >
          <image
            :src="imageSrc"
            mode="aspectFill"
            class="crop-image"
            :style="{ width: imgDisplaySize + 'px', height: imgDisplaySize + 'px' }"
          />
        </movable-view>
      </movable-area>

      <!-- 裁剪框边框（覆盖层） -->
      <view class="crop-frame" :style="{ width: cropSize + 'px', height: cropSize + 'px' }">
        <view class="crop-corner crop-corner-tl"></view>
        <view class="crop-corner crop-corner-tr"></view>
        <view class="crop-corner crop-corner-bl"></view>
        <view class="crop-corner crop-corner-br"></view>
      </view>

      <!-- 半透明遮罩 -->
      <view class="crop-mask-top" :style="{ top: 0, bottom: 'calc(50% + ' + (cropSize / 2) + 'px)' }"></view>
      <view class="crop-mask-bottom" :style="{ top: 'calc(50% + ' + (cropSize / 2) + 'px)' + ', bottom: 0' }"></view>
    </view>

    <!-- 底部提示 -->
    <view class="crop-hint">
      <text>拖动图片调整位置，双指缩放调整大小</text>
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
import { ref, onMounted } from 'vue'

const statusBarHeight = ref(20)
const cropSize = ref(0) // 裁剪框边长 (px)
const imageSrc = ref('')
const imgDisplaySize = ref(0)
const movableX = ref(0)
const movableY = ref(0)
const scale = ref(1)
const currentX = ref(0)
const currentY = ref(0)

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20

  // 裁剪框占屏幕宽度的80%
  const screenWidth = sysInfo.windowWidth || 375
  cropSize.value = Math.round(screenWidth * 0.8)

  // 获取图片路径
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const src = page?.options?.src
  if (src) {
    imageSrc.value = decodeURIComponent(src)
    // 初始显示尺寸：略大于裁剪框以允许缩放和拖动
    imgDisplaySize.value = Math.round(cropSize.value * 1.5)
    // 初始居中
    movableX.value = 0
    movableY.value = 0
  }
})

const onMove = (e: any) => {
  currentX.value = e.detail.x
  currentY.value = e.detail.y
}

const onScale = (e: any) => {
  scale.value = e.detail.scale
}

const handleCancel = () => {
  uni.navigateBack({ delta: 1 })
}

const handleConfirm = () => {
  if (!imageSrc.value) return

  // 显示加载
  uni.showLoading({ title: '裁剪中...' })

  // 获取图片原始尺寸
  uni.getImageInfo({
    src: imageSrc.value,
    success: (imgInfo) => {
      const imgW = imgInfo.width
      const imgH = imgInfo.height
      const displayW = imgDisplaySize.value
      const cropW = cropSize.value
      const s = scale.value

      // 图片在 movable-view 中的实际渲染尺寸（aspectFill 已按比例填充）
      // movable-view 尺寸 = displayW x displayW，图片 aspectFill 填充
      // 取短边填充：计算图片在 displayW 区域内填充时的偏移
      let fillScale = displayW / Math.max(imgW, imgH)
      let fillW = imgW * fillScale
      let fillH = imgH * fillScale
      let offsetInsideX = (displayW - fillW) / 2
      let offsetInsideY = (displayW - fillH) / 2

      // 当前移动/缩放后的实际位置
      const moveX = currentX.value
      const moveY = currentY.value

      // 裁剪区域(在真实像素中的位置)
      // sx, sy 对应原图的裁剪起点
      const ratioX = (cropW / 2 - moveX - offsetInsideX) / (fillW * s)
      const ratioY = (cropW / 2 - moveY - offsetInsideY) / (fillH * s)
      const ratioW = cropW / (fillW * s)

      const sx = Math.max(0, Math.round(ratioX * imgW))
      const sy = Math.max(0, Math.round(ratioY * imgH))
      const sw = Math.round(ratioW * imgW)
      const sh = Math.round(ratioW * imgH)

      // 使用 canvas 裁剪
      const ctx = uni.createCanvasContext('cropCanvas')
      ctx.drawImage(imageSrc.value, sx, sy, sw, sh, 0, 0, cropW, cropW)
      ctx.draw(false, () => {
        setTimeout(() => {
          uni.canvasToTempFilePath({
            canvasId: 'cropCanvas',
            width: cropW,
            height: cropW,
            destWidth: cropW,
            destHeight: cropW,
            fileType: 'jpg',
            success: (res) => {
              uni.hideLoading()
              // 通过 eventChannel 回传裁剪结果
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
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '加载图片失败', icon: 'none' })
    },
  })
}
</script>

<style lang="scss" scoped>
.crop-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #000;
}

.status-bar {
  background: #000;
}

.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background: #000;
  color: #fff;
  flex-shrink: 0;
}

.nav-btn {
  padding: 8rpx 16rpx;

  text {
    font-size: 28rpx;
    color: #fff;
  }
}

.nav-btn-confirm {
  text {
    color: #FF6B9D;
    font-weight: 600;
  }
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}

.crop-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.crop-area {
  position: relative;
  z-index: 2;
  overflow: hidden;
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

.crop-frame {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  border: 2rpx solid rgba(255, 255, 255, 0.6);
}

.crop-corner {
  position: absolute;
  width: 30rpx;
  height: 30rpx;
  border-color: #FF6B9D;
  border-style: solid;
}

.crop-corner-tl {
  top: -2rpx;
  left: -2rpx;
  border-width: 4rpx 0 0 4rpx;
  border-radius: 4rpx 0 0 0;
}

.crop-corner-tr {
  top: -2rpx;
  right: -2rpx;
  border-width: 4rpx 4rpx 0 0;
  border-radius: 0 4rpx 0 0;
}

.crop-corner-bl {
  bottom: -2rpx;
  left: -2rpx;
  border-width: 0 0 4rpx 4rpx;
  border-radius: 0 0 0 4rpx;
}

.crop-corner-br {
  bottom: -2rpx;
  right: -2rpx;
  border-width: 0 4rpx 4rpx 0;
  border-radius: 0 0 4rpx 0;
}

.crop-mask-top,
.crop-mask-bottom {
  position: absolute;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1;
}

.crop-hint {
  text-align: center;
  padding: 24rpx;
  background: #000;
  flex-shrink: 0;

  text {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.5);
  }
}

// 隐藏的 canvas 用于裁剪输出
.hidden-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
}
</style>
