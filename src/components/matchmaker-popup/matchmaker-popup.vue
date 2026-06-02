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
          <image class="qrcode" :src="matchmaker.qrCode" mode="aspectFill" />
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
  </view>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

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

const avatarUrl = computed(() => {
  if (avatarError.value) return '/static/default-avatar.png'
  return props.matchmaker.avatar || '/static/default-avatar.png'
})

const onAvatarError = () => {
  avatarError.value = true
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
  if (!props.matchmaker.qrCode) return

  try {
    uni.showLoading({ title: '保存中...' })

    const tempFilePath = await new Promise<string>((resolve, reject) => {
      uni.downloadFile({
        url: props.matchmaker.qrCode,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath)
          } else {
            reject(new Error('Download failed'))
          }
        },
        fail: reject,
      })
    })

    await new Promise<void>((resolve, reject) => {
      uni.saveImageToPhotosAlbum({
        filePath: tempFilePath,
        success: () => {
          uni.hideLoading()
          uni.showToast({
            title: '保存成功',
            icon: 'success',
          })
          resolve()
        },
        fail: (err) => {
          uni.hideLoading()
          if (err.errMsg.includes('auth deny')) {
            uni.showToast({
              title: '请授权保存图片',
              icon: 'none',
            })
          }
          reject(err)
        },
      })
    })
  } catch (e) {
    uni.hideLoading()
    console.error('save failed', e)
  }
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
</style>
