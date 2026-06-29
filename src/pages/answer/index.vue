<template>
  <view class="answer-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <text class="nav-title">回答问题</text>
        <view class="nav-right" />
      </view>
    </view>

    <!-- 页面主体 -->
    <view class="page-body" :style="{ paddingTop: (statusBarHeight + navInnerHeight) + 'px' }">
      <!-- 问题标题 -->
      <view class="question-area">
        <text class="question-title"># {{ questionTitle || '回答问题' }}</text>
      </view>

      <!-- 提示文字 -->
      <text class="input-hint">说说你的想法吧，最多200字哦~</text>

      <!-- 输入区 -->
      <view class="textarea-wrapper">
        <textarea
          v-model="answerContent"
          class="answer-textarea"
          :maxlength="200"
          placeholder="请输入你的回答..."
          :adjust-position="true"
          :disable-default-padding="true"
          :auto-height="true"
          @input="handleInput"
        />
      </view>

      <!-- 已选图片预览 -->
      <view v-if="selectedPhotos.length > 0" class="photo-preview-row">
        <view
          v-for="(photo, index) in selectedPhotos"
          :key="index"
          class="photo-thumb"
        >
          <image :src="photo" mode="aspectFill" />
          <view class="photo-remove" @tap="removePhoto(index)">
            <text>×</text>
          </view>
        </view>
      </view>

      <!-- 底部操作栏：相机 + 字数统计 -->
      <view class="toolbar">
        <view class="toolbar-camera" @tap="chooseImage">
          <text class="camera-icon">📷</text>
        </view>
        <text class="word-count">{{ wordCount }}/200</text>
      </view>

      <!-- 提交按钮 -->
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
import { getToken } from '@/utils/auth'
import { safeNavigateBack } from '@/utils/navigate'

const questionId = ref(0)
const questionTitle = ref('')
const answerContent = ref('')
const selectedPhotos = ref<string[]>([])
const uploadedPhotoUrls = ref<string[]>([])
const submitting = ref(false)
const statusBarHeight = ref(0)
const navInnerHeight = 44

onLoad((options: any) => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  if (options.questionId) {
    questionId.value = parseInt(options.questionId)
  }
  if (options.title) {
    questionTitle.value = decodeURIComponent(options.title)
  }
})

const wordCount = computed(() => answerContent.value.length)

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
      for (const path of res.tempFilePaths) {
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
  if (!getToken()) {
    uni.showToast({ title: '请先登录', icon: 'none', duration: 1500 })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/index' })
    }, 1000)
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
    uni.showToast({ title: '已提交，待审核', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e: any) {
    console.error('submit error', e)
    if (e.message !== 'Unauthorized') {
      uni.showToast({ title: e.message || '提交失败，请重试', icon: 'none' })
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
  background-color: #ffffff;
}

// ===== 导航栏 =====
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #ffffff;
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}

.nav-left {
  width: 80rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
}

.nav-right {
  width: 80rpx;
}

.back-icon {
  font-size: 40rpx;
  color: var(--text, #333333);
  font-weight: bold;
  line-height: 1;
}

.nav-title {
  font-size: 32rpx;
  color: var(--text, #333333);
  font-weight: 600;
  text-align: center;
  flex: 1;
}

// ===== 页面主体 =====
.page-body {
  padding: 0 32rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

// ===== 问题标题 =====
.question-area {
  padding: 24rpx 0;
}

.question-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #000000;
  line-height: 1.4;
  word-break: break-all;
}

// ===== 输入提示 =====
.input-hint {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary, #999999);
  margin-bottom: 16rpx;
}

// ===== 输入区 =====
.textarea-wrapper {
  border-bottom: 1rpx solid #f0f0f0;
  padding-bottom: 16rpx;
}

.answer-textarea {
  width: 100%;
  min-height: 320rpx;
  font-size: 28rpx;
  color: var(--text, #333333);
  line-height: 1.6;
  box-sizing: border-box;
}

// ===== 图片预览 =====
.photo-preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
}

.photo-thumb {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;

  image {
    width: 100%;
    height: 100%;
  }

  .photo-remove {
    position: absolute;
    top: 4rpx;
    right: 4rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      font-size: 28rpx;
      color: #ffffff;
      line-height: 1;
    }
  }
}

// ===== 底部操作栏 =====
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  margin-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.toolbar-camera {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  border: 2rpx solid var(--text-secondary, #999999);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
}

.camera-icon {
  font-size: 34rpx;
  line-height: 1;
}

.word-count {
  font-size: 24rpx;
  color: var(--text-secondary, #999999);
}

// ===== 提交按钮 =====
.submit-btn {
  margin-top: 24rpx;
  height: 96rpx;
  background-color: var(--primary, #FF6B9D);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 34rpx;
    font-weight: bold;
    color: #ffffff;
  }
}
</style>
