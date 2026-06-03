<template>
  <view class="answer-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">回答问题</view>
      <view class="nav-right"></view>
    </view>

    <view class="page-content">
      <view class="question-card">
        <text class="question-title"># {{ questionTitle || '回答问题' }}</text>
      </view>

      <view class="input-section">
        <textarea
          v-model="answerContent"
          class="answer-input"
          :maxlength="200"
          placeholder="说说你的想法吧，最多200字哦~"
          :adjust-position="true"
          :disable-default-padding="true"
          @input="handleInput"
        />
        <text class="word-count" :class="{ over: wordCount > 200 }">{{ wordCount }}/200</text>
      </view>

      <view class="photos-section">
        <text class="section-title">添加图片（最多3张）</text>
        <view class="photos-grid">
          <view
            v-for="(photo, index) in selectedPhotos"
            :key="index"
            class="photo-item"
          >
            <image :src="photo" mode="aspectFill" />
            <view class="delete-btn" @tap="removePhoto(index)">
              <text>X</text>
            </view>
          </view>

          <view
            v-if="selectedPhotos.length < 3"
            class="add-photo"
            @tap="chooseImage"
          >
            <text class="camera-icon">+</text>
            <text class="camera-text">添加图片</text>
          </view>
        </view>
      </view>
    </view>

    <view class="fixed-bottom">
      <view class="submit-btn" @tap="handleSubmit">
        <text>提交</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { uploadImage } from '@/utils/upload'
import { safeNavigateBack } from '@/utils/navigate'

const questionId = ref(0)
const questionTitle = ref('')
const answerContent = ref('')
const selectedPhotos = ref<string[]>([])
const uploadedPhotoUrls = ref<string[]>([])
const submitting = ref(false)

onLoad((options: any) => {
  if (options.questionId) {
    questionId.value = parseInt(options.questionId)
  }
  if (options.title) {
    questionTitle.value = decodeURIComponent(options.title)
  }
})

const wordCount = computed(() => {
  return answerContent.value.length
})

const handleInput = () => {
  if (wordCount.value > 200) {
    uni.showToast({ title: '超过200字限制', icon: 'none' })
  }
}

const chooseImage = async () => {
  if (selectedPhotos.value.length >= 3) {
    uni.showToast({ title: '最多只能添加3张图片', icon: 'none' })
    return
  }

  const remaining = 3 - selectedPhotos.value.length

  uni.chooseImage({
    count: remaining,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePaths = res.tempFilePaths

      for (const path of tempFilePaths) {
        try {
          const uploadRes = await uploadImage(path)
          uploadedPhotoUrls.value.push(uploadRes.url)
          selectedPhotos.value.push(path)
        } catch (e: any) {
          console.error('upload error', e)
          const errorMsg = e.message === 'Unauthorized'
            ? '请先登录后再上传图片'
            : (e.message === 'Network Error' ? '网络连接失败，请检查网络' : '图片上传失败')
          uni.showToast({ title: errorMsg, icon: 'none' })
        }
      }
    },
    fail: (e) => {
      console.error('choose image error', e)
    },
  })
}

const removePhoto = (index: number) => {
  selectedPhotos.value.splice(index, 1)
  uploadedPhotoUrls.value.splice(index, 1)
}

const handleSubmit = async () => {
  if (!answerContent.value.trim()) {
    uni.showToast({ title: '请输入回答内容', icon: 'none' })
    return
  }

  if (wordCount.value > 200) {
    uni.showToast({ title: '回答内容不能超过200字', icon: 'none' })
    return
  }

  if (submitting.value) return

  submitting.value = true
  uni.showLoading({ title: '提交中...' })

  try {
    await request({
      url: `/questions/${questionId.value}/answers`,
      method: 'POST',
      data: {
        content: answerContent.value,
        photos: uploadedPhotoUrls.value,
      },
    })

    uni.showToast({ title: '回答成功', icon: 'success' })

    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e: any) {
    console.error('submit error', e)

    // 401 已由 request.ts 统一处理（清除 token 并跳转登录页）
    // 此处只需要处理其他错误
    if (e.message !== 'Unauthorized') {
      const errorMsg = e.message || '提交失败，请重试'
      uni.showToast({ title: errorMsg, icon: 'none' })
    }
  } finally {
    uni.hideLoading()
    submitting.value = false
  }
}

const handleBack = () => {
  safeNavigateBack()
}
</script>

<style lang="scss" scoped>
.answer-page {
  min-height: 100vh;
  background-color: #f5f5f5;
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
  width: 100rpx;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.page-content {
  padding: 108rpx 32rpx 180rpx;
}

.question-card {
  background-color: #f0f0f0;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
}

.question-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.5;
}

.input-section {
  position: relative;
  margin-bottom: 32rpx;
}

.answer-input {
  width: 100%;
  min-height: 400rpx;
  max-height: 800rpx;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #333;
  line-height: 1.6;
  box-sizing: border-box;
}

.word-count {
  position: absolute;
  bottom: 20rpx;
  right: 24rpx;
  font-size: 24rpx;
  color: #999;

  &.over {
    color: #FF0000;
  }
}

.photos-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 20rpx;
}

.photos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.photo-item {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 8rpx;
  overflow: hidden;

  image {
    width: 100%;
    height: 100%;
  }

  .delete-btn {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    width: 44rpx;
    height: 44rpx;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      font-size: 24rpx;
      color: #fff;
    }
  }
}

.add-photo {
  width: 200rpx;
  height: 200rpx;
  border: 2rpx dashed #ddd;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .camera-icon {
    font-size: 60rpx;
    color: #ccc;
    line-height: 1;
  }

  .camera-text {
    font-size: 24rpx;
    color: #999;
    margin-top: 8rpx;
  }
}

.fixed-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.submit-btn {
  height: 96rpx;
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 34rpx;
    font-weight: bold;
    color: #fff;
  }
}
</style>
