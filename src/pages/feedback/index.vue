<template>
  <view class="feedback-overlay" @tap="handleClose" @touchmove.stop.prevent>
    <view class="feedback-panel" :class="{ 'panel-show': showPanel }" @tap.stop>
      <!-- 标题栏 -->
      <view class="panel-header">
        <text class="panel-title">问题反馈</text>
        <view class="close-btn" @tap="handleClose">
          <uni-icons type="closeempty" size="36rpx" color="#999"></uni-icons>
        </view>
      </view>

      <!-- 反馈内容区域 -->
      <view class="content-section">
        <text class="section-title">反馈内容</text>
        <view class="textarea-wrap">
          <textarea
            class="feedback-textarea"
            v-model="content"
            placeholder="请描述问题或建议"
            placeholder-style="color: #cccccc; font-size: 28rpx;"
            maxlength="200"
            :adjust-position="true"
            :show-confirm-bar="false"
          />
          <text class="char-count">{{ content.length }}/200</text>
        </view>
      </view>

      <!-- 提供截图区域 -->
      <view class="image-section">
        <view class="section-title-row">
          <text class="section-title">提供截图</text>
          <text class="section-sub">（最多上传6张）</text>
        </view>
        <view class="image-list">
          <!-- 已上传图片 -->
          <view
            v-for="(img, idx) in images"
            :key="idx"
            class="image-item"
          >
            <image
              class="image-thumb"
              :src="img.url"
              mode="aspectFill"
              @tap="previewImage(idx)"
            />
            <view class="image-delete" @tap.stop="removeImage(idx)">
              <uni-icons type="clear" size="32rpx" color="#fff"></uni-icons>
            </view>
            <!-- 上传中遮罩 -->
            <view v-if="img.uploading" class="image-loading-mask">
              <uni-icons type="spinner-cycle" size="44rpx" color="#fff"></uni-icons>
            </view>
          </view>
          <!-- 上传按钮（少于6张时显示） -->
          <view
            v-if="images.length < 6"
            class="image-add-btn"
            @tap="handleChooseImage"
          >
            <text class="add-plus">+</text>
          </view>
        </view>
      </view>

      <!-- 提交按钮 -->
      <view class="submit-area">
        <view
          class="submit-btn"
          :class="{ 'submitting': submitting }"
          @tap="handleSubmit"
        >
          <text>{{ submitting ? '提交中...' : '提交' }}</text>
        </view>
      </view>

      <!-- 安全底部 -->
      <view class="bottom-safe" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { post } from '@/utils/request'
import { uploadImage } from '@/utils/upload'

interface ImageItem {
  url: string
  uploading: boolean
}

const content = ref('')
const images = ref<ImageItem[]>([])
const showPanel = ref(false)
const submitting = ref(false)

onMounted(() => {
  // 延迟触发动画，确保 DOM 渲染完成
  setTimeout(() => {
    showPanel.value = true
  }, 50)
})

const handleClose = () => {
  showPanel.value = false
  // 等待动画结束后关闭页面
  setTimeout(() => {
    uni.navigateBack({ delta: 1 })
  }, 300)
}

const handleChooseImage = () => {
  const remain = 6 - images.value.length
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const paths = res.tempFilePaths as string[]
      handleUploadImages(paths)
    },
    fail: (err) => {
      if (err.errMsg !== 'chooseImage:fail cancel') {
        uni.showToast({ title: '选择图片失败', icon: 'none' })
      }
    },
  })
}

const handleUploadImages = async (tempFilePaths: string[]) => {
  for (const filePath of tempFilePaths) {
    // 先添加占位
    const item: ImageItem = { url: filePath, uploading: true }
    images.value.push(item)
    const currentIdx = images.value.length - 1

    try {
      const result = await uploadImage(filePath, 'file')
      images.value[currentIdx] = { url: result.url, uploading: false }
    } catch (err: any) {
      // 上传失败，移除该图片
      images.value.splice(currentIdx, 1)
      uni.showToast({
        title: err.message || '图片上传失败，请重试',
        icon: 'none',
        duration: 2000,
      })
    }
  }
}

const removeImage = (idx: number) => {
  images.value.splice(idx, 1)
}

const previewImage = (idx: number) => {
  const urls = images.value.map((img) => img.url)
  uni.previewImage({
    current: idx,
    urls,
  })
}

const handleSubmit = async () => {
  if (submitting.value) return

  // 校验内容
  if (!content.value.trim()) {
    uni.showToast({ title: '请填写您的举报理由', icon: 'none', duration: 2000 })
    return
  }

  submitting.value = true

  try {
    const imageUrls = images.value
      .filter((img) => !img.uploading)
      .map((img) => img.url)

    await post('/auth/feedback', {
      content: content.value.trim(),
      images: imageUrls,
    })

    uni.showToast({ title: '提交成功', icon: 'success', duration: 1500 })

    setTimeout(() => {
      showPanel.value = false
      setTimeout(() => {
        uni.navigateBack({ delta: 1 })
      }, 300)
    }, 1500)
  } catch (err: any) {
    uni.showToast({
      title: err.message || '提交失败，请重试',
      icon: 'none',
      duration: 2000,
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.feedback-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}

.feedback-panel {
  width: 100%;
  max-height: 85vh;
  background: #fff5f5;
  border-radius: 32rpx 30rpx 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  overflow-y: auto;

  &.panel-show {
    transform: translateY(0);
  }
}

// ========== 标题栏 ==========
.panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 36rpx 32rpx 24rpx;
  flex-shrink: 0;
}

.panel-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.close-btn {
  position: absolute;
  right: 32rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
}

// ========== 反馈内容区域 ==========
.content-section {
  padding: 0 32rpx 32rpx;
  flex-shrink: 0;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.textarea-wrap {
  position: relative;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
}

.feedback-textarea {
  width: 100%;
  min-height: 240rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: #333;
  box-sizing: border-box;
}

.char-count {
  text-align: right;
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-top: 8rpx;
  padding-right: 4rpx;
}

// ========== 图片区域 ==========
.image-section {
  padding: 0 32rpx 32rpx;
  flex-shrink: 0;
}

.section-title-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 16rpx;
}

.section-sub {
  font-size: 24rpx;
  color: #999;
  margin-left: 4rpx;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-item {
  position: relative;
  width: 156rpx;
  height: 156rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: #f5f5f5;
}

.image-thumb {
  width: 100%;
  height: 100%;
}

.image-delete {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  z-index: 2;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 50%;
}

.image-loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-add-btn {
  width: 156rpx;
  height: 156rpx;
  border: 2rpx dashed #ffb3c1;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.add-plus {
  font-size: 56rpx;
  color: #ff6b81;
  line-height: 1;
}

// ========== 提交按钮 ==========
.submit-area {
  padding: 16rpx 32rpx;
  flex-shrink: 0;
}

.submit-btn {
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #ff6b81, #ff758c);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;

  &.submitting {
    opacity: 0.7;
    pointer-events: none;
  }
}

.bottom-safe {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  min-height: 16rpx;
  flex-shrink: 0;
}
</style>
