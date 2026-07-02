<template>
  <view class="upload-avatar-page">
    <!-- 自定义导航栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <text class="nav-back" @tap="handleBack">←</text>
        <text class="nav-title">灵通相亲</text>
        <text class="nav-placeholder"></text>
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view
      class="page-content"
      scroll-y
      :style="{ paddingTop: navTopPx + 'px' }"
    >
      <!-- 标题区 -->
      <view class="header-section">
        <text class="header-title">上传头像</text>
        <text class="header-subtitle">真实的头像，没有相片何来眼缘，仅需几秒，缘分就会开启！</text>
      </view>

      <!-- 上传区域 -->
      <view class="upload-area" @tap="handleSelectAvatar">
        <view class="upload-box">
          <!-- 已上传：显示图片 -->
          <image
            v-if="avatarPath"
            :src="avatarPath"
            mode="aspectFill"
            class="upload-image"
          />
          <!-- 未上传：显示十字 + -->
          <view v-else class="upload-plus">
            <view class="plus-h" />
            <view class="plus-v" />
          </view>
        </view>
        <text class="upload-hint">请上传本人头像</text>
      </view>

      <!-- 提交上传按钮 -->
      <view class="submit-btn-area">
        <view
          class="submit-btn"
          :class="avatarPath ? 'submit-btn--active' : 'submit-btn--disabled'"
          @tap="handleSubmit"
        >
          <text>提交上传</text>
        </view>
      </view>

      <!-- ========== 示例照片区 ========== -->
      <view class="example-section">
        <text class="section-title--light">这样的照片会受到更多的关注</text>
        <view class="example-grid example-grid--3">
          <view
            v-for="(item, idx) in goodPhotoExamples"
            :key="idx"
            class="example-photo-item"
          >
            <view class="example-photo-wrap example-photo-wrap--tall">
              <view class="example-photo-placeholder placeholder-good" />
              <view class="example-photo-like">
                <text class="like-text">999+ 关注</text>
                <text class="like-heart">❤️</text>
              </view>
            </view>
            <text class="example-photo-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- ========== 禁止上传照片区 ========== -->
      <view class="example-section">
        <text class="section-title--light">请勿上传以下几类照片</text>
        <view class="example-grid example-grid--5">
          <view
            v-for="(item, idx) in badPhotoExamples"
            :key="idx"
            class="example-photo-item"
          >
            <view class="example-photo-wrap example-photo-wrap--short">
              <view class="example-photo-placeholder placeholder-bad" />
              <view class="example-photo-mark mark-red">
                <text class="mark-cross">×</text>
              </view>
            </view>
            <text class="example-photo-label--small">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 底部安全区 -->
      <view class="safe-bottom" />
    </scroll-view>

    <!-- ========== 底部选择弹窗（复用 PhotoGuide） ========== -->
    <PhotoGuide
      v-model:visible="showPhotoGuide"
      :good-examples="photoGuideGoodExamples"
      :bad-examples="photoGuideBadExamples"
      @camera="onGuideCamera"
      @album="onGuideAlbum"
      @cancel="showPhotoGuide = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/store/user'
import { uploadImage } from '@/utils/upload'
import { setCropImageData } from '@/utils/crop-bridge'
import { showToast, getFullImageUrl } from '@/utils/common'
import PhotoGuide from '@/components/photo-guide/photo-guide.vue'

const userStore = useUserStore()

// ========== 导航相关 ==========
const statusBarHeight = ref(20)
const navTopPx = ref(64)

onMounted(() => {
  const sysInfo = uni.getWindowInfo()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navTopPx.value = (sysInfo.statusBarHeight || 20) + 44
})

const handleBack = () => {
  uni.navigateBack()
}

// ========== 头像数据 ==========
const avatarPath = ref('') // 裁剪后的本地临时路径

// 进入时若已有头像，回显
onMounted(() => {
  const avatar = userStore.userInfo?.avatar
  if (avatar) {
    avatarPath.value = getFullImageUrl(avatar)
  }
})

// ========== 选择头像 → 裁剪 ==========
const showPhotoGuide = ref(false)

// PhotoGuide 弹窗内示例数据
const photoGuideGoodExamples = [
  { src: '', label: '光线充足' },
  { src: '', label: '五官清晰' },
  { src: '', label: '正面照' },
]

const photoGuideBadExamples = [
  { src: '', label: '衣着不当' },
  { src: '', label: '模糊遮挡' },
  { src: '', label: '非人物照' },
  { src: '', label: '无正脸' },
  { src: '', label: '网络照片' },
]

// 页面示例照片数据
const goodPhotoExamples = [
  { label: '正向的形象照' },
  { label: '阳光的生活照' },
  { label: '好看的写真照' },
]

const badPhotoExamples = [
  { label: '裸照' },
  { label: '模糊照' },
  { label: '头像太小' },
  { label: '非人物照' },
  { label: '网络图片' },
]

const handleSelectAvatar = () => {
  showPhotoGuide.value = true
}

const onGuideCamera = () => {
  pickAndCropAvatar('camera')
}

const onGuideAlbum = () => {
  pickAndCropAvatar('album')
}

// ========== 选择图片 + 裁剪（复用 edit-profile 模式） ==========
const pickAndCropAvatar = (sourceType: 'album' | 'camera') => {
  uni.chooseImage({
    count: 1,
    sizeType: ['original'],
    sourceType: [sourceType],
    success: (res) => {
      const tempPath = res.tempFilePaths[0]
      uni.getImageInfo({
        src: tempPath,
        success: (info) => {
          setCropImageData(tempPath, info.width, info.height)
          uni.navigateTo({
            url: '/pages/image-crop/index',
            events: {
              cropped: (data: { path: string }) => {
                handleCroppedResult(data.path)
              },
            },
          })
        },
        fail: () => {
          // 兜底：压缩后再获取尺寸
          uni.compressImage({
            src: tempPath,
            quality: 90,
            success: (cr) => {
              uni.getImageInfo({
                src: cr.tempFilePath,
                success: (info2) => {
                  setCropImageData(cr.tempFilePath, info2.width, info2.height)
                  uni.navigateTo({
                    url: '/pages/image-crop/index',
                    events: {
                      cropped: (data: { path: string }) => {
                        handleCroppedResult(data.path)
                      },
                    },
                  })
                },
                fail: () => {
                  showToast('图片加载失败，请重试')
                },
              })
            },
            fail: () => {
              showToast('图片处理失败，请重试')
            },
          })
        },
      })
    },
  })
}

// 备用通道：全局事件接收裁剪结果
const onImageCropped = (data: any) => {
  if (data?.path) {
    handleCroppedResult(data.path)
  }
}

onMounted(() => {
  uni.$on('IMAGE_CROPPED', onImageCropped)
})

onUnmounted(() => {
  uni.$off('IMAGE_CROPPED', onImageCropped)
})

// ========== 裁剪结果处理 ==========
const handleCroppedResult = (filePath: string) => {
  avatarPath.value = filePath
}

// ========== 提交上传 ==========
const handleSubmit = async () => {
  if (!avatarPath.value) return

  try {
    uni.showLoading({ title: '上传中...', mask: true })

    const uploadRes = await uploadImage(avatarPath.value)

    // 更新 store
    userStore.updateProfile({ avatar: uploadRes.url, avatarReviewStatus: 0 })

    uni.hideLoading()
    showToast('上传成功', 'success')

    setTimeout(() => {
      uni.navigateTo({ url: '/pages/detail-info/index' })
    }, 800)
  } catch (err: any) {
    uni.hideLoading()
    console.error('[upload-avatar] 上传失败:', err?.message || err)
  }
}
</script>

<style lang="scss" scoped>
.upload-avatar-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

// ========== 导航栏 ==========
.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #ffffff;
}

.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
}

.nav-back {
  font-size: 36rpx;
  color: #333;
  width: 80rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.nav-placeholder {
  width: 80rpx;
}

// ========== 内容区 ==========
.page-content {
  flex: 1;
  height: 100vh;
  box-sizing: border-box;
}

// ========== 标题区 ==========
.header-section {
  padding: 40rpx 32rpx 0;
}

.header-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #333333;
}

.header-subtitle {
  display: block;
  font-size: 28rpx;
  color: #999999;
  margin-top: 16rpx;
  line-height: 1.5;
}

// ========== 上传区域 ==========
.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 48rpx;
}

.upload-box {
  width: 400rpx;
  height: 400rpx;
  background: #ffffff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.upload-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.upload-plus {
  width: 80rpx;
  height: 80rpx;
  position: relative;
}

.plus-h {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 4rpx;
  background: #E0E0E0;
  transform: translateY(-50%);
}

.plus-v {
  position: absolute;
  left: 50%;
  top: 0;
  width: 4rpx;
  height: 100%;
  background: #E0E0E0;
  transform: translateX(-50%);
}

.upload-hint {
  font-size: 26rpx;
  color: #999999;
  margin-top: 24rpx;
}

// ========== 提交按钮 ==========
.submit-btn-area {
  padding: 48rpx 60rpx 0;
}

.submit-btn {
  height: 96rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 32rpx;
    font-weight: bold;
    color: #ffffff;
  }
}

.submit-btn--disabled {
  background: #E0E0E0;
  pointer-events: none;
}

.submit-btn--active {
  background: #FF4D6A;

  &:active {
    opacity: 0.85;
  }
}

// ========== 示例照片区 & 禁止上传区共用 ==========
.example-section {
  padding: 0 32rpx;
}

.section-title--light {
  display: block;
  font-size: 26rpx;
  color: #999999;
  margin-top: 60rpx;
  margin-bottom: 24rpx;
}

// ========== 示例照片网格（3列） ==========
.example-grid--3 {
  display: flex;
  gap: 16rpx;
}

.example-grid--3 .example-photo-item {
  flex: 1;
}

// ========== 禁止照片网格（5列） ==========
.example-grid--5 {
  display: flex;
  gap: 12rpx;
}

.example-grid--5 .example-photo-item {
  flex: 1;
}

.example-photo-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.example-photo-wrap {
  width: 100%;
  border-radius: 16rpx;
  overflow: hidden;
  position: relative;
}

.example-photo-wrap--tall {
  height: 220rpx;
  border-radius: 16rpx;
}

.example-photo-wrap--short {
  height: 140rpx;
  border-radius: 12rpx;
}

.example-photo-placeholder {
  width: 100%;
  height: 100%;
}

.placeholder-good {
  background: linear-gradient(135deg, #FFD6E0, #FFB3C6);
}

.placeholder-bad {
  background: linear-gradient(135deg, #F0F0F0, #E0E0E0);
}

// ========== 示例照片：底部叠加"999+ 关注 ❤️" ==========
.example-photo-like {
  position: absolute;
  bottom: 8rpx;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}

.like-text {
  font-size: 20rpx;
  color: #ffffff;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.3);
}

.like-heart {
  font-size: 20rpx;
}

// ========== 禁止照片：右下角红色 × 标记 ==========
.example-photo-mark {
  position: absolute;
  right: 8rpx;
  bottom: 8rpx;
}

.mark-red {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #FF4D6A;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mark-cross {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: bold;
  line-height: 1;
}

// ========== 照片下方说明文字 ==========
.example-photo-label {
  font-size: 24rpx;
  color: #666666;
  margin-top: 12rpx;
  text-align: center;
}

.example-photo-label--small {
  font-size: 20rpx;
  color: #999999;
  margin-top: 8rpx;
  text-align: center;
}

// ========== 底部安全区 ==========
.safe-bottom {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  min-height: 40rpx;
}
</style>
