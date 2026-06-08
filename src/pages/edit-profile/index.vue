<template>
  <view class="edit-profile-page">
    <!-- 自定义导航栏（含状态栏占位） -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <view class="nav-title">编辑资料</view>
        <view class="nav-right"></view>
      </view>
    </view>

    <scroll-view class="page-scroll" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx + 12) + 'px', height: 'calc(100vh - 120rpx)' }">
      <!-- 头像 -->
      <view class="section-card">
        <text class="section-title">头像</text>
        <view class="avatar-row" @tap="chooseAvatar">
          <image
            class="avatar-img"
            :src="form.avatar || '/static/default-avatar.png'"
            mode="aspectFill"
          />
          <text class="avatar-tip">点击更换头像</text>
        </view>
        <view class="avatar-badges" v-if="form.avatarReviewStatus === 0 || form.avatarReviewStatus === 2">
          <text v-if="form.avatarReviewStatus === 0" class="badge pending">头像审核中</text>
          <text v-if="form.avatarReviewStatus === 2" class="badge rejected">头像已驳回</text>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="section-card">
        <text class="section-title">基本信息</text>

        <view class="form-item">
          <text class="form-label">昵称</text>
          <input
            class="form-input"
            v-model="form.nickname"
            placeholder="请输入昵称"
            maxlength="20"
          />
        </view>

        <view class="form-item">
          <text class="form-label">性别</text>
          <view class="gender-group">
            <view
              class="gender-btn"
              :class="{ active: form.gender === 1 }"
              @tap="form.gender = 1"
            >男</view>
            <view
              class="gender-btn"
              :class="{ active: form.gender === 2 }"
              @tap="form.gender = 2"
            >女</view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">出生年份</text>
          <picker
            mode="selector"
            :range="birthYearOptions"
            :value="birthYearIndex"
            @change="onBirthYearChange"
            style="flex:1"
          >
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.birthYear }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">
                {{ form.birthYear ? form.birthYear + '年' : '请选择出生年份' }}
              </text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">身高(cm)</text>
          <input
            class="form-input"
            v-model="form.height"
            placeholder="请输入身高"
            type="number"
            maxlength="3"
          />
        </view>

        <view class="form-item">
          <text class="form-label">学历</text>
          <picker
            mode="selector"
            :range="educationLabels"
            :value="educationIndex"
            @change="onEducationChange"
            style="flex:1"
          >
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.education }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">
                {{ form.education || '请选择' }}
              </text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">职业</text>
          <input
            class="form-input"
            v-model="form.occupation"
            placeholder="请输入职业"
            maxlength="30"
          />
        </view>

        <view class="form-item">
          <text class="form-label">月薪</text>
          <picker
            mode="selector"
            :range="incomeLabels"
            :value="incomeIndex"
            @change="onIncomeChange"
            style="flex:1"
          >
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.incomeRange }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">
                {{ form.incomeRange || '请选择' }}
              </text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">婚姻状况</text>
          <picker
            mode="selector"
            :range="maritalOptions"
            :value="maritalIndex"
            @change="onMaritalChange"
            style="flex:1"
          >
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.maritalStatus }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">
                {{ form.maritalStatus || '请选择' }}
              </text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">户籍地</text>
          <input
            class="form-input"
            v-model="form.hometown"
            placeholder="请输入户籍地"
            maxlength="50"
          />
        </view>

        <view class="form-item">
          <text class="form-label">现居地</text>
          <input
            class="form-input"
            v-model="form.residence"
            placeholder="请输入现居地"
            maxlength="50"
          />
        </view>
      </view>

      <!-- 自我介绍 -->
      <view class="section-card">
        <text class="section-title">自我介绍</text>
        <textarea
          class="intro-textarea"
          v-model="form.selfIntro"
          placeholder="介绍一下自己吧，让别人更好地了解你..."
          maxlength="500"
        />
        <text class="intro-count" :class="{ over: introLen > 500 }">{{ introLen }}/500</text>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>

    <!-- 底部保存按钮 -->
    <view class="save-bar">
      <view class="save-btn" @tap="handleSave">
        <text>保存</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import request, { put } from '@/utils/request'
import { uploadImage } from '@/utils/upload'

const userStore = useUserStore()
const saving = ref(false)
const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)

  const info = userStore.userInfo
  if (info) {
    form.value = {
      avatar: info.avatar || '',
      avatarReviewStatus: (info as any).avatarReviewStatus ?? 1,
      reviewStatus: (info as any).reviewStatus ?? 1,
      nickname: info.nickname || '',
      gender: info.gender ?? 0,
      birthYear: info.birthYear,
      height: info.height,
      education: info.education || '',
      occupation: info.occupation || '',
      incomeRange: info.incomeRange || '',
      maritalStatus: info.maritalStatus || '',
      residence: info.residence || info.city || '',
      hometown: info.hometown || '',
      selfIntro: info.selfIntro || info.bio || '',
    }
  }
})

const birthYearOptions = (() => {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let y = currentYear - 18; y >= 1940; y--) {
    years.push(String(y))
  }
  return years
})()

const educationOptions = [
  { label: '高中', value: '高中' },
  { label: '大专', value: '大专' },
  { label: '本科', value: '本科' },
  { label: '硕士', value: '硕士' },
  { label: '博士', value: '博士' },
]
const educationLabels = educationOptions.map((e) => e.label)

const incomeOptions = [
  { label: '3千以下', value: '3千以下' },
  { label: '3-5千', value: '3-5千' },
  { label: '5-8千', value: '5-8千' },
  { label: '8千-1.2万', value: '8千-1.2万' },
  { label: '1.2-2万', value: '1.2-2万' },
  { label: '2-5万', value: '2-5万' },
  { label: '5万以上', value: '5万以上' },
]
const incomeLabels = incomeOptions.map((o) => o.label)

const maritalOptions = ['未婚', '离异', '丧偶']

const form = ref({
  avatar: '',
  avatarReviewStatus: 1,
  reviewStatus: 1,
  nickname: '',
  gender: 0,
  birthYear: undefined as number | undefined,
  height: undefined as number | undefined,
  education: '',
  occupation: '',
  incomeRange: '',
  maritalStatus: '',
  residence: '',
  hometown: '',
  selfIntro: '',
})

const introLen = computed(() => form.value.selfIntro.length)

const birthYearIndex = computed(() => {
  if (!form.value.birthYear) return -1
  return birthYearOptions.findIndex((o) => o.startsWith(String(form.value.birthYear)))
})

const educationIndex = computed(() => {
  return educationOptions.findIndex((o) => o.value === form.value.education)
})

const incomeIndex = computed(() => {
  return incomeOptions.findIndex((o) => o.value === form.value.incomeRange)
})

const maritalIndex = computed(() => {
  return maritalOptions.indexOf(form.value.maritalStatus)
})

const chooseAvatar = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0]
      uni.showLoading({ title: '上传中...' })
      try {
        const uploadRes = await uploadImage(filePath)
        form.value.avatar = uploadRes.url
        await request({ url: '/users/avatar-review', method: 'POST', data: { avatarUrl: uploadRes.url } } as any)
        form.value.avatarReviewStatus = 0
        uni.showToast({ title: '已提交审核', icon: 'success' })
      } catch (err: unknown) {
        const error = err as Error
        console.error('头像上传失败:', error)
        const msg = error.message === 'Unauthorized'
          ? '请先登录'
          : '上传失败，请重试'
        uni.showToast({ title: msg, icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

const onBirthYearChange = (e: { detail: { value: number } }) => {
  const yearStr = birthYearOptions[e.detail.value]
  form.value.birthYear = parseInt(yearStr)
}

const onEducationChange = (e: { detail: { value: number } }) => {
  form.value.education = educationOptions[e.detail.value].value
}

const onIncomeChange = (e: { detail: { value: number } }) => {
  form.value.incomeRange = incomeOptions[e.detail.value].value
}

const onMaritalChange = (e: { detail: { value: number } }) => {
  form.value.maritalStatus = maritalOptions[e.detail.value]
}

const handleSave = async () => {
  if (saving.value) return

  if (!form.value.nickname.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }

  saving.value = true
  uni.showLoading({ title: '保存中...' })

  try {
    const data: Record<string, unknown> = {
      nickname: form.value.nickname.trim(),
      avatar: form.value.avatar,
      gender: form.value.gender,
      birthYear: form.value.birthYear,
      height: form.value.height ? Number(form.value.height) : undefined,
      education: form.value.education,
      occupation: form.value.occupation.trim(),
      incomeRange: form.value.incomeRange,
      maritalStatus: form.value.maritalStatus,
      residence: form.value.residence.trim(),
      hometown: form.value.hometown.trim(),
      selfIntro: form.value.selfIntro.trim(),
    }

    const result = await put<Record<string, unknown>>('/users/profile', data)

    try {
      await request({ url: '/users/profile-review', method: 'POST', data } as any)
      form.value.reviewStatus = 0
    } catch (_) {
      // 审核提交失败不阻断保存
    }

    userStore.updateProfile(result)
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack({ delta: 1 })
    }, 1200)
  } catch (err: unknown) {
    const error = err as Error
    console.error('保存失败:', error.message)
    if (error.message !== 'Unauthorized') {
      uni.showToast({ title: error.message || '保存失败，请重试', icon: 'none' })
    }
  } finally {
    saving.value = false
    uni.hideLoading()
  }
}

const handleBack = () => {
  uni.navigateBack({ delta: 1 })
}
</script>

<style lang="scss" scoped>
.edit-profile-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
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

.back-icon {
  font-size: 40rpx;
  color: #333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.page-scroll {
  box-sizing: border-box;
}

.section-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 28rpx 28rpx 8rpx;
  margin: 0 24rpx 20rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding-bottom: 20rpx;
}

.avatar-img {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background-color: #f0f0f0;
}

.avatar-tip {
  font-size: 24rpx;
  color: #999;
}

.avatar-badges {
  display: flex;
  justify-content: center;
  margin-top: 8rpx;
}

.badge {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;

  &.pending {
    background-color: #FFF7E6;
    color: #FA8C16;
  }

  &.rejected {
    background-color: #FFF1F0;
    color: #FF4D4F;
  }
}

.form-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.form-label {
  width: 140rpx;
  font-size: 28rpx;
  color: #666;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  text-align: right;
  height: 60rpx;
}

.form-picker {
  flex: 1;
  display: flex;
  align-items: center;
  height: 60rpx;

  .picker-value {
    flex: 1;
    text-align: right;
    font-size: 28rpx;
    color: #333;
  }

  .picker-arrow {
    font-size: 24rpx;
    color: #ccc;
    margin-left: 8rpx;
    flex-shrink: 0;
  }
}

.placeholder {
  color: #ccc;
}

.picker-arrow {
  font-size: 24rpx;
  color: #ccc;
}

.gender-group {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
}

.gender-btn {
  padding: 10rpx 40rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #999;
  background-color: #f5f5f5;

  &.active {
    background-color: #FF6B9D;
    color: #fff;
  }
}

.intro-textarea {
  width: 100%;
  min-height: 200rpx;
  font-size: 28rpx;
  color: #333;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  padding: 20rpx;
  box-sizing: border-box;
}

.intro-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #999;
  padding: 8rpx 0 12rpx;

  &.over {
    color: #FF6B9D;
  }
}

.bottom-safe {
  height: 40rpx;
}

.save-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);
  z-index: 99;
}

.save-btn {
  width: 100%;
  height: 88rpx;
  background-color: #FF6B9D;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 32rpx;
    font-weight: bold;
    color: #fff;
  }
}
</style>
