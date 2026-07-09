<template>
  <view class="edu-page">
    <!-- 顶部导航栏（白底 + 居中标题 + 右侧留给微信原生胶囊） -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar" :style="{ height: navBarHeightPx + 'px' }">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="nav-title">学历认证</text>
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
        <!-- 毕业院校 -->
        <view class="form-row">
          <text class="row-label">毕业院校</text>
          <input
            class="row-input"
            v-model="school"
            type="text"
            placeholder="请输入院校名称"
            placeholder-class="row-input-ph"
          />
        </view>
        <view class="divider" />

        <!-- 学历 -->
        <view class="form-row" @tap="openDegreePicker">
          <text class="row-label">学历</text>
          <view class="row-value-wrap">
            <text class="row-value" :class="{ placeholder: !degree }">{{ degree || '请选择' }}</text>
            <text class="row-arrow">›</text>
          </view>
        </view>
        <view class="divider" />

        <!-- 图片上传 -->
        <view class="upload-section">
          <text class="upload-title">请上传您的毕业证书、学位证书或学信网截图</text>
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
              <text v-else class="upload-plus">＋</text>
              <view v-if="previewImage && reviewBadgeText" class="upload-review-overlay">
                <text class="upload-review-text">{{ reviewBadgeText }}</text>
              </view>
            </view>

            <!-- 示例图 -->
            <view class="sample-box">
              <view class="sample-badge"><text class="sample-badge-text">示例</text></view>
              <view class="sample-cert">
                <view class="sample-emblem"><text class="sample-emblem-text">🎓</text></view>
                <view class="sample-line sample-line--title" />
                <view class="sample-line" />
                <view class="sample-line sample-line--short" />
                <view class="sample-seal" />
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

    <!-- 学历选择弹窗 -->
    <view v-if="showPicker" class="picker-mask" @tap="closeDegreePicker">
      <view class="picker-panel" @tap.stop>
        <text class="picker-title">请选择</text>
        <scroll-view class="picker-list" scroll-y>
          <view
            v-for="item in degreeOptions"
            :key="item"
            class="picker-item"
            @tap="selectDegree(item)"
          >
            <text class="picker-item-text" :class="{ active: item === degree }">{{ item }}</text>
          </view>
        </scroll-view>
        <view class="picker-cancel" @tap="closeDegreePicker">
          <text class="picker-cancel-text">取消</text>
        </view>
      </view>
    </view>
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

const school = ref('')
const degree = ref('')
// 本地选取的临时图片路径（用于上传），远端已存图片单独记录
const localImagePath = ref('')
const remoteImageUrl = ref('')
const submitting = ref(false)
// 认证状态：null-未提交草稿, 0-审核中, 1-已通过, 2-未通过
const authStatus = ref<number | null>(null)

const showPicker = ref(false)
const degreeOptions = ['初中及以下', '高中', '中专', '大专', '本科', '硕士', '博士']

// 预览优先展示新选取的本地图片，否则展示远端已上传图片
const previewImage = ref('')

// 图片上的审核状态角标（草稿态不显示）
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
    const res: any = await get('/education-auth/status')
    const data = res?.data || res
    if (data?.exists) {
      school.value = data.school || ''
      degree.value = data.degree || ''
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

function openDegreePicker() {
  showPicker.value = true
}

function closeDegreePicker() {
  showPicker.value = false
}

function selectDegree(item: string) {
  degree.value = item
  showPicker.value = false
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
        authStatus.value = null // 重新选取视为草稿，隐藏审核角标
        refreshPreview()
      }
    },
  })
}

function handleSubmit() {
  if (submitting.value) return
  if (!school.value.trim()) {
    uni.showToast({ title: '请输入毕业院校', icon: 'none' })
    return
  }
  if (!degree.value) {
    uni.showToast({ title: '请选择学历', icon: 'none' })
    return
  }
  if (!localImagePath.value && !remoteImageUrl.value) {
    uni.showToast({ title: '请上传证书图片', icon: 'none' })
    return
  }

  // 未重新选取图片且已有远端图片时，需重新上传：远端图片无法直接作为文件重传，
  // 故要求用户在重新提交时重新选取。若仅修改文字，仍需带图片文件。
  if (!localImagePath.value) {
    uni.showToast({ title: '请重新上传证书图片', icon: 'none' })
    return
  }

  submitting.value = true
  uni.showLoading({ title: '提交中...', mask: true })

  const token = getToken()
  const uploadUrl = `${getBaseUrl()}/education-auth/submit`

  uni.uploadFile({
    url: uploadUrl,
    filePath: localImagePath.value,
    name: 'file',
    formData: {
      school: school.value.trim(),
      degree: degree.value,
    },
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
        // 保留已选图片继续展示，并立即置为审核中，随后拉取最新状态
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
.edu-page {
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

/* ===== 粉色渐变宣传区 ===== */
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

.form-row {
  display: flex;
  align-items: center;
  min-height: 104rpx;
}
.row-label {
  font-size: 30rpx;
  color: #222;
  flex-shrink: 0;
}
.row-input {
  flex: 1;
  text-align: right;
  font-size: 30rpx;
  color: #222;
}
.row-input-ph {
  color: #BBBBBB;
}
.row-value-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.row-value {
  font-size: 30rpx;
  color: #222;
}
.row-value.placeholder {
  color: #BBBBBB;
}
.row-arrow {
  font-size: 34rpx;
  color: #C4C4C4;
  margin-left: 10rpx;
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

/* 示例证书（CSS 绘制，避免依赖远端图导致真机域名白名单问题） */
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
.sample-cert {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
  background: linear-gradient(160deg, #FFFDF7 0%, #FDEFEF 100%);
  border: 2rpx solid #F0D6D6;
  box-sizing: border-box;
  padding: 26rpx 22rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
.sample-emblem {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: radial-gradient(circle, #FFE1B3 0%, #E7A64A 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.sample-emblem-text {
  font-size: 30rpx;
}
.sample-line {
  width: 100%;
  height: 10rpx;
  border-radius: 6rpx;
  background: #E9D3D3;
  margin-top: 12rpx;
}
.sample-line--title {
  width: 70%;
  height: 12rpx;
  background: #D9B48A;
}
.sample-line--short {
  width: 50%;
}
.sample-seal {
  position: absolute;
  right: 20rpx;
  bottom: 18rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(214, 48, 49, 0.65);
  opacity: 0.75;
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

/* ===== 学历选择弹窗 ===== */
.picker-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}
.picker-panel {
  width: 100%;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}
.picker-title {
  display: block;
  text-align: center;
  font-size: 32rpx;
  color: #222;
  padding: 32rpx 0 12rpx;
}
.picker-list {
  max-height: 560rpx;
}
.picker-item {
  height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.picker-item-text {
  font-size: 32rpx;
  color: #333;
}
.picker-item-text.active {
  color: #FF5B84;
  font-weight: 600;
}
.picker-cancel {
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 12rpx solid #F5F5F7;
}
.picker-cancel-text {
  font-size: 32rpx;
  color: #999;
}
</style>
