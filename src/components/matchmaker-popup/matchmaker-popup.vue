<template>
  <view v-if="visible" class="matchmaker-popup">
    <!-- 半透明遮罩 -->
    <view class="overlay" @tap="handleClose"></view>

    <!-- 底部弹窗内容 -->
    <view class="bottom-sheet" :class="{ 'sheet-visible': visible }">
      <!-- 标题行 -->
      <view class="sheet-header">
        <text class="sheet-title">专属资深红娘助你脱单</text>
        <view class="close-btn" @tap="handleClose">
          <text class="close-icon">✕</text>
        </view>
      </view>

      <!-- 红娘信息区 -->
      <view class="matchmaker-section">
        <!-- 头像带粉边 -->
        <view class="avatar-ring">
          <image
            class="avatar-img"
            :src="avatarUrl"
            mode="aspectFill"
            @error="onAvatarError"
          />
        </view>

        <!-- 昵称（粉色粗体） -->
        <text class="mm-name">{{ matchmaker.name }}</text>

        <!-- 微信号 + 复制图标 -->
        <view class="wechat-row" @tap="copyWechat">
          <text class="wechat-text">微信：{{ matchmaker.wechat }}</text>
          <image
            v-if="pageIcons.copyIcon"
            class="wechat-copy-icon"
            :src="pageIcons.copyIcon"
            mode="aspectFit"
          />
          <text v-else class="wechat-copy-emoji">📋</text>
        </view>

        <!-- 二维码区 -->
        <view class="qrcode-box">
          <image
            class="qrcode-img"
            :src="qrcodeUrl"
            mode="widthFix"
            @error="onQrcodeError"
          />
        </view>

        <!-- 二维码提示文字 -->
        <text class="qrcode-tip">长按识别二维码添加红娘微信</text>

        <!-- 保存图片 -->
        <view class="save-row" @tap="saveQrcode">
          <image
            v-if="pageIcons.saveIcon"
            class="save-icon-img"
            :src="pageIcons.saveIcon"
            mode="aspectFit"
          />
          <text v-else class="save-icon-emoji">⬇️</text>
          <text class="save-text">或保存图片到相册</text>
        </view>
      </view>

      <!-- 按钮区 -->
      <view class="button-section">
        <view class="btn-call" @tap="handleCall">
          <text class="btn-call-text">打电话</text>
        </view>
        <view class="btn-more" @tap="handleMore">
          <text class="btn-more-text">查看更多红娘</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSystemStore } from '@/store/system'

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

const systemStore = useSystemStore()
const pageIcons = computed(() => systemStore.icons?.page || {})

const visible = ref(false)
const avatarError = ref(false)
const qrcodeError = ref(false)

const avatarUrl = computed(() => {
  if (avatarError.value) return '/static/default-avatar.png'
  return props.matchmaker.avatar || '/static/default-avatar.png'
})

const qrcodeUrl = computed(() => {
  if (qrcodeError.value) return '/static/matchmaker.png'
  return props.matchmaker.qrCode || '/static/matchmaker.png'
})

const onAvatarError = () => { avatarError.value = true }
const onQrcodeError = () => { qrcodeError.value = true }

watch(() => props.show, (newVal) => {
  visible.value = newVal
}, { immediate: true })

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
      success: () => { uni.showToast({ title: '已复制', icon: 'success' }) },
    })
  } catch (e) { /* ignore */ }
}

const saveQrcode = async () => {
  if (!props.matchmaker.qrCode) {
    uni.showToast({ title: '暂无二维码', icon: 'none' })
    return
  }

  uni.showLoading({ title: '保存中...' })

  try {
    // 下载二维码图片到本地
    const qrUrl = qrcodeUrl.value
    let localPath: string

    if (qrUrl.startsWith('http')) {
      const res = await uni.downloadFile({ url: qrUrl })
      if (res.statusCode !== 200) throw new Error('下载二维码失败')
      localPath = res.tempFilePath
    } else {
      localPath = qrUrl
    }

    await uni.saveImageToPhotosAlbum({ filePath: localPath })
    uni.hideLoading()
    uni.showToast({ title: '已保存到相册', icon: 'success' })
  } catch (e: any) {
    uni.hideLoading()
    if (e.errMsg?.includes('auth deny') || e.errMsg?.includes('auth')) {
      // 引导授权
      try {
        await uni.authorize({ scope: 'scope.writePhotosAlbum' })
        // 授权后重试一次
        const qrUrl = qrcodeUrl.value
        let localPath: string
        if (qrUrl.startsWith('http')) {
          const res = await uni.downloadFile({ url: qrUrl })
          if (res.statusCode !== 200) throw new Error('下载二维码失败')
          localPath = res.tempFilePath
        } else {
          localPath = qrUrl
        }
        await uni.saveImageToPhotosAlbum({ filePath: localPath })
        uni.hideLoading()
        uni.showToast({ title: '已保存到相册', icon: 'success' })
      } catch {
        uni.showToast({ title: '请授权保存图片权限', icon: 'none' })
      }
    } else {
      uni.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
    console.error('save qrcode failed', e)
  }
}

const handleCall = () => {
  if (props.matchmaker.phone) {
    uni.makePhoneCall({
      phoneNumber: props.matchmaker.phone,
      fail: () => { uni.showToast({ title: '拨打失败', icon: 'none' }) },
    })
    emit('call', props.matchmaker.phone)
  } else {
    uni.showToast({ title: '暂无电话号码', icon: 'none' })
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

defineExpose({ open, close })
</script>

<style lang="scss" scoped>
.matchmaker-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.bottom-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  overflow-y: visible;
  background-color: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 32rpx 60rpx;
  transform: translateY(100%);
  transition: transform 0.3s ease-out;

  &.sheet-visible {
    transform: translateY(0);
  }
}

// ===== 标题行 =====
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 36rpx;
}

.sheet-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.close-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-icon {
  font-size: 32rpx;
  color: #999;
}

// ===== 红娘信息区 =====
.matchmaker-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-ring {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  border: 4rpx solid #FF6681;
  padding: 4rpx;
  margin-bottom: 16rpx;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: #f5f5f5;
}

.mm-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #FF6681;
  margin-bottom: 20rpx;
}

// ===== 微信号行 =====
.wechat-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background-color: #F5F5F5;
  border-radius: 8rpx;
  margin-bottom: 32rpx;
}

.wechat-text {
  font-size: 26rpx;
  color: #666;
}

.wechat-copy-icon {
  width: 32rpx;
  height: 32rpx;
}

.wechat-copy-emoji {
  font-size: 24rpx;
}

// ===== 二维码 =====
.qrcode-box {
  width: 50%;
  margin-bottom: 16rpx;
}

.qrcode-img {
  width: 100%;
  display: block;
  border-radius: 4rpx;
}

.qrcode-tip {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
}

// ===== 保存行 =====
.save-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  margin-bottom: 40rpx;
}

.save-icon-img {
  width: 28rpx;
  height: 28rpx;
}

.save-icon-emoji {
  font-size: 22rpx;
}

.save-text {
  font-size: 24rpx;
  color: #999;
}

// ===== 按钮区 =====
.button-section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  width: 100%;
}

.btn-call {
  width: 100%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FF6681;
  border-radius: 44rpx;

  .btn-call-text {
    font-size: 32rpx;
    font-weight: bold;
    color: #fff;
  }
}

.btn-more {
  width: 100%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border: 2rpx solid #FF6681;
  border-radius: 44rpx;

  .btn-more-text {
    font-size: 30rpx;
    color: #FF6681;
  }
}
</style>
