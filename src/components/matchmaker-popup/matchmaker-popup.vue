<template>
  <view v-if="visible" class="matchmaker-popup">
    <view class="overlay" @tap="handleClose"></view>
    <view class="popup-card">
      <view class="close-btn" @tap="handleClose">
        <text>X</text>
      </view>

      <view class="header-title">专属资深红娘助你脱单</view>

      <view class="matchmaker-info">
        <view class="avatar-wrapper">
          <image class="avatar" :src="avatarUrl" mode="aspectFill" @error="onAvatarError" />
        </view>

        <view class="name">{{ matchmaker.name }}</view>
        <view class="title">{{ matchmaker.title }}</view>

        <view class="wechat-row" @tap="copyWechat">
          <text class="wechat-label">微信：</text>
          <text class="wechat-value">{{ matchmaker.wechat }}</text>
          <text class="copy-icon">📋</text>
        </view>

        <view class="qrcode-wrapper">
          <image
            class="qrcode"
            :src="qrcodeUrl"
            mode="widthFix"
            @error="onQrcodeError"
          />
        </view>

        <view class="qrcode-tip">长按识别二维码添加红娘微信</view>
        <view class="save-tip" @tap="saveQrcode">
          <text class="save-icon">⬇️</text>
          <text>或保存图片到相册</text>
        </view>
      </view>

      <view class="action-buttons">
        <view class="call-btn" @tap="handleCall">
          <text>打电话</text>
        </view>
        <view class="more-btn" @tap="handleMore">
          <text>查看更多红娘</text>
        </view>
      </view>
    </view>

    <!-- 离屏 Canvas 用于生成分享图 -->
    <canvas
      id="share-canvas"
      type="2d"
      class="share-canvas"
      :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
    ></canvas>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'

export interface MatchmakerData {
  id: number
  name: string
  avatar: string
  title: string
  wechat: string
  phone?: string
  qrCode: string
  description?: string
}

interface Props {
  show: boolean
  matchmaker: MatchmakerData
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'close'): void
  (e: 'more'): void
  (e: 'call', phone: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = ref(false)
const avatarError = ref(false)
const qrcodeError = ref(false)

// Canvas 尺寸（px，按 2 倍图设计）
const canvasW = ref(375)
const canvasH = ref(580)

const avatarUrl = computed(() => {
  if (avatarError.value) return '/static/default-avatar.png'
  return props.matchmaker.avatar || '/static/default-avatar.png'
})

const qrcodeUrl = computed(() => {
  if (qrcodeError.value) return '/static/matchmaker.png'
  return props.matchmaker.qrCode || '/static/matchmaker.png'
})

const onAvatarError = () => {
  avatarError.value = true
}

const onQrcodeError = () => {
  qrcodeError.value = true
}

watch(
  () => props.show,
  (newVal) => {
    visible.value = newVal
  },
  { immediate: true }
)

const handleClose = () => {
  visible.value = false
  emit('update:show', false)
  emit('close')
}

const copyWechat = async () => {
  if (!props.matchmaker.wechat) return

  try {
    await uni.setClipboardData({
      data: props.matchmaker.wechat,
      success: () => {
        uni.showToast({
          title: '已复制',
          icon: 'success',
        })
      },
    })
  } catch (e) {
    console.error('copy failed', e)
  }
}

const saveQrcode = async () => {
  if (!props.matchmaker.qrCode) {
    uni.showToast({ title: '暂无二维码', icon: 'none' })
    return
  }

  uni.showLoading({ title: '生成图片中...' })

  try {
    // 1. 下载头像和二维码到本地临时路径
    const [avatarPath, qrcodePath] = await Promise.all([
      downloadImage(avatarUrl.value),
      downloadImage(qrcodeUrl.value),
    ])

    // 2. 等待下一帧确保 canvas 节点已挂载
    await nextTick()

    // 3. 获取 Canvas 2D 上下文
    const canvasNode = await getCanvasNode()
    if (!canvasNode) throw new Error('Canvas 节点获取失败')

    const ctx = canvasNode.getContext('2d')
    const dpr = uni.getSystemInfoSync().pixelRatio || 2
    const w = canvasW.value
    const h = canvasH.value

    canvasNode.width = w * dpr
    canvasNode.height = h * dpr
    ctx.scale(dpr, dpr)

    // 4. 绘制白色背景
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, w, h)

    // 5. 绘制顶部信息区
    const avatarSize = 64
    const avatarX = 30
    const avatarY = 40

    await drawCircularImage(ctx, avatarPath, avatarX, avatarY, avatarSize)

    // 昵称
    const displayName = props.matchmaker.wechat || props.matchmaker.name || '红娘'
    ctx.fillStyle = '#333333'
    ctx.font = 'bold 18px sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(displayName, avatarX + avatarSize + 16, avatarY + avatarSize / 2)

    // 6. 绘制二维码（主要区域）
    const qrSize = 260
    const qrX = (w - qrSize) / 2
    const qrY = avatarY + avatarSize + 40
    const qrImg = canvasNode.createImage()
    await new Promise<void>((resolve, reject) => {
      qrImg.onload = () => resolve()
      qrImg.onerror = () => reject(new Error('二维码图片加载失败'))
      qrImg.src = qrcodePath
    })
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

    // 7. 绘制底部提示文字
    const hintY = qrY + qrSize + 28
    ctx.fillStyle = '#999999'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('扫一扫上面的二维码图案，加我为好友', w / 2, hintY)

    // 8. 导出为图片
    const tempFilePath = await new Promise<string>((resolve, reject) => {
      (uni.canvasToTempFilePath as any)({
        canvas: canvasNode,
        x: 0,
        y: 0,
        width: w,
        height: h,
        destWidth: w * dpr,
        destHeight: h * dpr,
        fileType: 'jpg',
        quality: 1,
        success: (res: any) => resolve(res.tempFilePath),
        fail: reject,
      })
    })

    // 9. 保存到相册
    await uni.saveImageToPhotosAlbum({ filePath: tempFilePath })
    uni.hideLoading()
    uni.showToast({ title: '已保存到相册', icon: 'success' })
  } catch (e: any) {
    uni.hideLoading()
    if (e.errMsg?.includes('auth deny')) {
      uni.showToast({ title: '请授权保存图片权限', icon: 'none' })
    } else {
      uni.showToast({ title: '保存失败', icon: 'none' })
    }
    console.error('save qrcode failed', e)
  }
}

/** 下载网络图片到本地临时路径 */
async function downloadImage(url: string): Promise<string> {
  if (!url.startsWith('http')) return url
  const res = await uni.downloadFile({ url })
  if (res.statusCode !== 200) throw new Error('图片下载失败')
  return res.tempFilePath
}

/** 获取 canvas 节点 */
function getCanvasNode(): Promise<any> {
  return new Promise((resolve, reject) => {
    // cast to avoid type issue with createSelectorQuery in <script setup>
    const query = (uni.createSelectorQuery as any)()
    // 需要获取组件实例来限定查询范围
    query
      .select('#share-canvas')
      .fields({ node: true, size: true })
      .exec((res: any) => {
        if (res?.[0]?.node) {
          resolve(res[0].node)
        } else {
          reject(new Error('Canvas 节点未找到'))
        }
      })
  })
}

/** 绘制圆形头像 */
function drawCircularImage(
  ctx: any,
  src: string,
  x: number,
  y: number,
  size: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = (ctx.canvas as any).createImage()
    img.onload = () => {
      // 裁剪圆形
      ctx.save()
      ctx.beginPath()
      const r = size / 2
      ctx.arc(x + r, y + r, r, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, x, y, size, size)
      ctx.restore()
      resolve()
    }
    img.onerror = () => reject(new Error('头像加载失败'))
    img.src = src
  })
}

const handleCall = () => {
  if (props.matchmaker.phone) {
    uni.makePhoneCall({
      phoneNumber: props.matchmaker.phone,
      fail: () => {
        uni.showToast({
          title: '拨打失败',
          icon: 'none',
        })
      },
    })
    emit('call', props.matchmaker.phone)
  } else {
    uni.showToast({
      title: '暂无电话号码',
      icon: 'none',
    })
  }
}

const handleMore = () => {
  handleClose()
  emit('more')
}

const open = (matchmaker: MatchmakerData) => {
  visible.value = true
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
.matchmaker-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
}

.popup-card {
  position: relative;
  width: 85%;
  max-width: 600rpx;
  background-color: #fff;
  border-radius: 24px;
  padding: 40rpx 32rpx;
  box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.15);
}

.close-btn {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 36rpx;
}

.header-title {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  color: var(--text, #333);
  margin-bottom: 40rpx;
}

.matchmaker-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-wrapper {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  padding: 4rpx;
  background: linear-gradient(135deg, #FF6B9D, #FF8FB0);
  box-shadow: 0 0 20rpx rgba(255, 107, 157, 0.3);
  margin-bottom: 24rpx;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4rpx solid #fff;
  background-color: #f5f5f5;
}

.name {
  font-size: 16px;
  font-weight: bold;
  color: #FF6B9D;
  margin-bottom: 8rpx;
}

.title {
  font-size: 14px;
  color: #999;
  margin-bottom: 24rpx;
}

.wechat-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background-color: #f9f9f9;
  border-radius: 8rpx;
  margin-bottom: 32rpx;
}

.wechat-label {
  font-size: 14px;
  color: #666;
}

.wechat-value {
  font-size: 14px;
  color: var(--text, #333);
}

.copy-icon {
  font-size: 28rpx;
  margin-left: 8rpx;
}

.qrcode-wrapper {
  width: 400rpx;
  height: 400rpx;
  padding: 16rpx;
  background-color: #fff;
  border: 2rpx solid #eee;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.qrcode {
  width: 100%;
  height: 100%;
}

.qrcode-tip {
  font-size: 14px;
  color: #999;
  margin-bottom: 12rpx;
}

.save-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 12px;
  color: #999;
  margin-bottom: 40rpx;
}

.save-icon {
  font-size: 24rpx;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.call-btn {
  width: 100%;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FF6B9D;
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
}

.more-btn {
  width: 100%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border: 2rpx solid #FF6B9D;
  border-radius: 44rpx;
  font-size: 30rpx;
  color: #FF6B9D;
}

.share-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
}
</style>
