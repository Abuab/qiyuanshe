<template>
  <view class="publish-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-left" @tap="handleCancel">
        <text class="cancel-text">取消</text>
      </view>
      <view class="nav-title">发布动态</view>
      <view class="nav-right" @tap="handlePublish">
        <text class="publish-btn" :class="{ disabled: !canPublish }">发布</text>
      </view>
    </view>

    <view class="page-content">
      <!-- 文字输入 -->
      <view class="textarea-section">
        <textarea
          class="content-textarea"
          v-model="content"
          placeholder="分享你的想法..."
          placeholder-class="placeholder"
          :maxlength="500"
          @input="onContentInput"
        />
        <text class="word-count">{{ content.length }}/500</text>
      </view>

      <!-- 图片上传区域 -->
      <view class="image-section">
        <view class="image-grid">
          <view
            v-for="(img, index) in uploadedImages"
            :key="index"
            class="image-item"
          >
            <image class="thumb-image" :src="img" mode="aspectFill" />
            <view class="remove-btn" @tap="removeImage(index)">
              <text class="remove-icon">×</text>
            </view>
          </view>

          <view
            v-if="uploadedImages.length < 9"
            class="image-item add-item"
            @tap="chooseImage"
          >
            <text class="add-icon">+</text>
            <text class="add-text">{{ uploadedImages.length === 0 ? '添加图片' : `${uploadedImages.length}/9` }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import request from '@/utils/request'
import { uploadImage } from '@/utils/upload'
import { safeNavigateBack } from '@/utils/navigate'

const content = ref('')
const uploadedImages = ref<string[]>([]) // 本地临时路径（用于展示）
const uploading = ref(false)

const canPublish = computed(() => {
  return (content.value.trim().length > 0 || uploadedImages.value.length > 0) && !uploading.value
})

const onContentInput = () => {
  // 仅用于响应式更新字数统计
}

const chooseImage = () => {
  const remainCount = 9 - uploadedImages.value.length
  uni.chooseImage({
    count: remainCount,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      uploadedImages.value = [...uploadedImages.value, ...res.tempFilePaths]
    },
  })
}

const removeImage = (index: number) => {
  uploadedImages.value.splice(index, 1)
}

const handlePublish = async () => {
  if (!canPublish.value) return

  if (uploading.value) return
  uploading.value = true
  uni.showLoading({ title: '发布中...', mask: true })

  try {
    // 先上传所有图片，获取远程 URL
    const imageUrls: string[] = []
    if (uploadedImages.value.length > 0) {
      for (const localPath of uploadedImages.value) {
        const res = await uploadImage(localPath)
        if (res.url) {
          imageUrls.push(res.url)
        }
      }
    }

    // 提交动态
    await request({
      url: '/dynamics',
      method: 'POST',
      data: {
        content: content.value.trim(),
        images: imageUrls,
        totalImages: uploadedImages.value.length,
      },
    })

    uni.hideLoading()
    uni.showToast({ title: '发布成功', icon: 'success', duration: 1500 })

    setTimeout(() => {
      safeNavigateBack()
    }, 1200)
  } catch (e: unknown) {
    uni.hideLoading()
    const err = e as Error
    console.error('publish dynamic error:', err.message)
    if (err.message !== 'Unauthorized') {
      uni.showToast({ title: err.message || '发布失败，请重试', icon: 'none' })
    }
  } finally {
    uploading.value = false
  }
}

const handleCancel = () => {
  if (content.value.trim() || uploadedImages.value.length > 0) {
    uni.showModal({
      title: '提示',
      content: '确定放弃编辑吗？',
      confirmText: '放弃',
      cancelText: '继续编辑',
      success: (res) => {
        if (res.confirm) {
          safeNavigateBack()
        }
      },
    })
  } else {
    safeNavigateBack()
  }
}
</script>

<style lang="scss" scoped>
.publish-page {
  min-height: 100vh;
  background-color: #fff;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background-color: #fff;
  z-index: 100;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.nav-left,
.nav-right {
  width: 120rpx;
}

.nav-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.cancel-text {
  font-size: 30rpx;
  color: #666;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.publish-btn {
  font-size: 28rpx;
  color: #FF6B9D;
  font-weight: bold;

  &.disabled {
    color: #ccc;
  }
}

.page-content {
  padding-top: 108rpx;
  padding-left: 32rpx;
  padding-right: 32rpx;
}

.textarea-section {
  position: relative;
  padding: 24rpx 0;
}

.content-textarea {
  width: 100%;
  min-height: 240rpx;
  font-size: 30rpx;
  line-height: 1.6;
  color: #333;
}

.placeholder {
  color: #ccc;
}

.word-count {
  position: absolute;
  bottom: 8rpx;
  right: 0;
  font-size: 24rpx;
  color: #ccc;
}

.image-section {
  margin-top: 24rpx;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-item {
  position: relative;
  width: 210rpx;
  height: 210rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: #f5f5f5;
}

.thumb-image {
  width: 100%;
  height: 100%;
}

.remove-btn {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-icon {
  font-size: 30rpx;
  color: #fff;
  font-weight: bold;
  line-height: 1;
}

.add-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #ddd;
  background-color: #fafafa;
}

.add-icon {
  font-size: 60rpx;
  color: #ccc;
  line-height: 1;
}

.add-text {
  font-size: 22rpx;
  color: #ccc;
  margin-top: 8rpx;
}
</style>
