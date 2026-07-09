<template>
  <view class="prop-page">
    <!-- 顶部导航栏（白底 + 居中标题 + 右侧留给微信原生胶囊） -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar" :style="{ height: navBarHeightPx + 'px' }">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">&#8249;</text>
        </view>
        <text class="nav-title">房产认证</text>
        <view class="nav-right" />
      </view>
    </view>

    <scroll-view
      class="content"
      scroll-y
      :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }"
    >
      <!-- 粉色渐变宣传区 -->
      <view class="hero">
        <text class="hero-title">为什么要认证</text>
        <view class="hero-tags">
          <view class="hero-tag"><text class="hero-tag-text">更真实</text></view>
          <view class="hero-tag"><text class="hero-tag-text">更匹配</text></view>
          <view class="hero-tag"><text class="hero-tag-text">更高效</text></view>
        </view>
        <text class="hero-desc">平台会优先推荐信息更为全面真实的用户</text>
      </view>

      <!-- 白色圆角卡片表单区 -->
      <view class="form-card">
        <!-- 图片上传（唯一表单内容，复刻学历认证上传区布局） -->
        <view class="upload-section">
          <text class="upload-title">请上传房产证内页或购房合同内页，需露出署名</text>
          <text class="upload-note">(您上传的照片资料仅作认证使用，并加密处理)</text>

          <view class="upload-row">
            <!-- 上传按钮 / 预览 -->
            <view class="upload-box" @tap="chooseImage">
              <image
                v-if="previewImage"
                class="upload-preview"
                :src="previewImage"
                mode="aspectFill"
              />
              <text v-else class="upload-plus">&#xFF0B;</text>
              <view v-if="previewImage && reviewBadgeText" class="upload-review-overlay">
                <text class="upload-review-text">{{ reviewBadgeText }}</text>
              </view>
            </view>

            <!-- 示例图（房产证内页风格，CSS 绘制） -->
            <view class="sample-box">
              <view class="sample-badge"><text class="sample-badge-text">示例</text></view>
              <view class="sample-deed">
                <view class="sample-deed-title" />
                <view class="sample-deed-row" />
                <view class="sample-deed-row sample-deed-row--mid" />
                <view class="sample-deed-row sample-deed-row--short" />
                <view class="sample-deed-row" />
                <view class="sample-deed-seal" />
              </view>
            </view>
          </view>
        </view>
        <view class="divider" />

        <!-- 底部提示 -->
        <text class="bottom-tip">请确保提交的信息真实有效，盗用他人资料认证将会被封号！</text>

        <!-- 提交按钮 -->
        <view class="submit-btn" :class="{ disabled: submitting }" @tap="handleSubmit">
          <text class="submit-text">{{ submitting ? '提交中...' : '提交认证' }}</text>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { safeNavigateBack } from '@/utils/navigate'
import { get, getBaseUrl } from '@/utils/request'
import { getToken } from '@/utils/auth'
import { getFullImageUrl } from '@/utils/common'

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)

const localImagePath = ref('')
const remoteImageUrl = ref('')
const submitting = ref(false)
const authStatus = ref<number | null>(null)

const previewImage = ref('')

const reviewBadgeText = computed(() => {
  if (authStatus.value === 0) return '审核中'
  if (authStatus.value === 2) return '审核未通过'
  return ''
})

function refreshPreview() {
  if (localImagePath.value) {
    previewImage.value = localImagePath.value
  } else if (remoteImageUrl.value) {
    previewImage.value = getFullImageUrl(remoteImageUrl.value)
  } else {
    previewImage.value = ''
  }
}

onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
  loadStatus()
})

async function loadStatus() {
  try {
    const res: any = await get('/property-auth/status')
    const data = res?.data || res
    if (data?.exists) {
      remoteImageUrl.value = data.image || ''
      authStatus.value = typeof data.status === 'number' ? data.status : null
      refreshPreview()
      if (data.status === 2 && data.rejectReason) {
        uni.showToast({ title: `审核未通过：${data.rejectReason}`, icon: 'none' })
      }
    }
  } catch (_) {
    // 静默失败，保持空表单
  }
}

function handleBack() {
  safeNavigateBack()
}

function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const path = res.tempFilePaths?.[0]
      if (path) {
        localImagePath.value = path
        authStatus.value = null
        refreshPreview()
      }
    },
  })
}

function handleSubmit() {
  if (submitting.value) return
  if (!localImagePath.value && !remoteImageUrl.value) {
    uni.showToast({ title: '请上传房产证明材料', icon: 'none' })
    return
  }
  if (!localImagePath.value) {
    uni.showToast({ title: '请重新上传证明材料', icon: 'none' })
    return
  }

  submitting.value = true
  uni.showLoading({ title: '提交中...', mask: true })

  const token = getToken()
  const uploadUrl = `${getBaseUrl()}/property-auth/submit`

  uni.uploadFile({
    url: uploadUrl,
    filePath: localImagePath.value,
    name: 'file',
    formData: {},
    header: token ? { Authorization: `Bearer ${token}` } : {},
    success: (uploadRes) => {
      uni.hideLoading()
      submitting.value = false
      let data: any = {}
      try {
        data = JSON.parse(uploadRes.data)
      } catch (_) {
        uni.showToast({ title: '提交失败，请重试', icon: 'none' })
        return
      }
      if (data?.code === 200 || data?.success) {
        uni.showToast({ title: '提交成功，等待审核', icon: 'success' })
        authStatus.value = 0
        refreshPreview()
        setTimeout(() => loadStatus(), 1500)
      } else {
        uni.showToast({ title: data?.msg || data?.message || '提交失败', icon: 'none' })
      }
    },
    fail: () => {
      uni.hideLoading()
      submitting.value = false
      uni.showToast({ title: '网络异常，提交失败', icon: 'none' })
    },
  })
}
</script>

<style lang="scss" scoped>
.prop-page {
  min-height: 100vh;
  background: #F5F5F7;
}

/* ===== 导航栏 ===== */
.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
  border-bottom: 1rpx solid #EEEEEE;
}
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  position: relative;
}
.nav-left {
  width: 120rpx;
  display: flex;
  align-items: center;
}
.back-icon {
  font-size: 56rpx;
  color: #222;
  line-height: 1;
}
.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 34rpx;
  font-weight: bold;
  color: #222;
}
.nav-right {
  width: 120rpx;
}

/* ===== 内容区 ===== */
.content {
  height: 100vh;
  box-sizing: border-box;
}

/* ===== 粉色渐变宣传区（与学历认证一致） ===== */
.hero {
  padding: 40rpx 44rpx 96rpx;
  background: linear-gradient(180deg, #FF5E86 0%, #FF89A6 45%, #FFD3DE 100%);
  display: flex;
  flex-direction: column;
}
.hero-title {
  font-size: 46rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 28rpx;
}
.hero-tags {
  display: flex;
  flex-direction: row;
  margin-bottom: 24rpx;
}
.hero-tag {
  background: rgba(255, 255, 255, 0.28);
  border-radius: 999rpx;
  padding: 10rpx 26rpx;
  margin-right: 20rpx;
}
.hero-tag-text {
  font-size: 26rpx;
  color: #fff;
}
.hero-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
}

/* ===== 白色表单卡片（浮出覆盖） ===== */
.form-card {
  position: relative;
  margin: -64rpx 32rpx 0;
  background: #fff;
  border-radius: 28rpx;
  padding: 12rpx 32rpx 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}

.divider {
  height: 1rpx;
  background: #F0F0F0;
}

/* ===== 上传区域 ===== */
.upload-section {
  padding: 28rpx 0 24rpx;
}
.upload-title {
  display: block;
  font-size: 28rpx;
  color: #222;
  line-height: 1.5;
}
.upload-note {
  display: block;
  font-size: 22rpx;
  color: #FF6B8A;
  margin-top: 10rpx;
  margin-bottom: 26rpx;
}
.upload-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
}
.upload-box {
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-right: 28rpx;
  position: relative;
}
.upload-plus {
  font-size: 68rpx;
  color: #FF5B84;
  font-weight: 300;
  line-height: 1;
}
.upload-preview {
  width: 100%;
  height: 100%;
}
.upload-review-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 44rpx;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-review-text {
  font-size: 22rpx;
  color: #fff;
}

/* 示例房产证（CSS 绘制，表格线 + 圆形公章） */
.sample-box {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  margin-top: 16rpx;
}
.sample-badge {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  background: #F5352E;
  border-radius: 0 12rpx 0 12rpx;
  padding: 4rpx 14rpx;
}
.sample-badge-text {
  font-size: 20rpx;
  color: #fff;
}
.sample-deed {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
  background: linear-gradient(160deg, #FFFDF7 0%, #FDEFEF 100%);
  border: 2rpx solid #F0D6D6;
  box-sizing: border-box;
  padding: 20rpx 18rpx;
  display: flex;
  flex-direction: column;
  position: relative;
}
.sample-deed-title {
  width: 60%;
  height: 10rpx;
  border-radius: 5rpx;
  background: #C5A87E;
  margin-bottom: 14rpx;
  align-self: center;
}
.sample-deed-row {
  width: 100%;
  height: 8rpx;
  border-radius: 4rpx;
  background: #E9D3D3;
  margin-top: 10rpx;
}
.sample-deed-row--mid {
  width: 75%;
}
.sample-deed-row--short {
  width: 48%;
}
.sample-deed-seal {
  position: absolute;
  right: 18rpx;
  bottom: 14rpx;
  width: 50rpx;
  height: 50rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(214, 48, 49, 0.7);
  opacity: 0.78;
}

/* ===== 底部提示与提交按钮 ===== */
.bottom-tip {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin: 28rpx 0 32rpx;
  line-height: 1.5;
}
.submit-btn {
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(90deg, #FFA0B9 0%, #FF5B84 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(255, 91, 132, 0.28);
}
.submit-btn.disabled {
  opacity: 0.6;
}
.submit-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}

.bottom-spacer {
  height: 60rpx;
}
</style>
