<template>
  <view class="basic-info-page">
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
      <!-- 页面标题区 -->
      <view class="header-section">
        <text class="header-title">基本信息</text>
        <text class="header-subtitle">填写基本信息，只需几秒，开启缘分！</text>
      </view>

      <!-- 表单列表 -->
      <view class="form-list">
        <!-- 性别 -->
        <view class="form-item" @tap="openPicker('gender')">
          <text class="form-label">性别</text>
          <view class="form-value">
            <text :class="form.gender ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.gender || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 身高 -->
        <view class="form-item" @tap="openPicker('height')">
          <text class="form-label">身高</text>
          <view class="form-value">
            <text :class="form.height ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.height || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 学历 -->
        <view class="form-item" @tap="openPicker('education')">
          <text class="form-label">学历</text>
          <view class="form-value">
            <text :class="form.education ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.education || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 月薪 -->
        <view class="form-item" @tap="openPicker('income')">
          <text class="form-label">月薪</text>
          <view class="form-value">
            <text :class="form.income ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.income || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 生日 -->
        <view class="form-item" @tap="openBirthdayPicker">
          <text class="form-label">生日</text>
          <view class="form-value">
            <text :class="form.birthday ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.birthday || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 婚况 -->
        <view class="form-item" @tap="openPicker('marital')">
          <text class="form-label">婚况</text>
          <view class="form-value">
            <text :class="form.marital ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.marital || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 昵称 -->
        <view class="form-item form-item--input">
          <text class="form-label">昵称</text>
          <view class="form-value">
            <input
              class="form-input"
              v-model="form.nickname"
              placeholder="请填写昵称"
              placeholder-style="color: #FF4D6A"
              maxlength="20"
            />
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="bottom-tip">
        <text>请填写真实的个人信息，只有真实的自己才能找到真爱！</text>
      </view>

      <!-- 底部按钮 -->
      <view class="bottom-btn-area">
        <view class="submit-btn" @tap="handleSubmit">
          <text>下一步</text>
        </view>
      </view>

      <!-- iPhone X 底部安全区占位 -->
      <view class="safe-bottom" />
    </scroll-view>

    <!-- ========== 单列选择器弹窗 ========== -->
    <view
      v-if="pickerVisible"
      class="picker-overlay"
      :class="{ 'picker-overlay--in': pickerAnimIn }"
      @tap="closePicker"
    >
      <view
        class="picker-box"
        :class="{ 'picker-box--in': pickerAnimIn }"
        @tap.stop
      >
        <text class="picker-title">请选择</text>
        <scroll-view class="picker-options" scroll-y>
          <view
            v-for="(opt, idx) in currentPickerOptions"
            :key="idx"
            class="picker-option"
            :class="{ 'picker-option--active': pickerTempValue === opt }"
            @tap="selectPickerOption(opt)"
          >
            <text>{{ opt }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ========== 生日选择器弹窗 ========== -->
    <view
      v-if="birthdayPickerVisible"
      class="birthday-overlay"
      :class="{ 'birthday-overlay--in': birthdayAnimIn }"
      @tap="closeBirthdayPicker"
    >
      <view
        class="birthday-box"
        :class="{ 'birthday-box--in': birthdayAnimIn }"
        @tap.stop
      >
        <!-- 顶部操作栏 -->
        <view class="birthday-toolbar">
          <text class="birthday-cancel" @tap="cancelBirthday">取消</text>
          <text class="birthday-label">选择器</text>
          <text class="birthday-confirm" @tap="confirmBirthday">确认</text>
        </view>

        <!-- 三列选择器 -->
        <picker-view
          class="birthday-picker-view"
          :value="birthdayPickerValue"
          @change="onBirthdayChange"
          indicator-style="height: 100rpx;"
        >
          <picker-view-column>
            <view
              v-for="y in years"
              :key="y"
              class="pick-col-item"
            >
              <text>{{ y }}年</text>
            </view>
          </picker-view-column>
          <picker-view-column>
            <view
              v-for="m in months"
              :key="m"
              class="pick-col-item"
            >
              <text>{{ m }}月</text>
            </view>
          </picker-view-column>
          <picker-view-column>
            <view
              v-for="d in days"
              :key="d"
              class="pick-col-item"
            >
              <text>{{ d }}日</text>
            </view>
          </picker-view-column>
        </picker-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { post } from '@/utils/request'
import { useUserStore } from '@/store/user'
import { showToast } from '@/utils/common'

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

// ========== 表单数据 ==========
const form = reactive({
  gender: '',
  height: '',
  education: '',
  income: '',
  birthday: '',
  marital: '',
  nickname: '',
})

// 初始化已有数据
onMounted(() => {
  const userInfo = userStore.userInfo
  if (userInfo) {
    if (userInfo.gender) {
      form.gender = userInfo.gender === 1 ? '男' : userInfo.gender === 2 ? '女' : ''
    }
    if (userInfo.height) {
      form.height = userInfo.height + 'cm'
    }
    if (userInfo.education) form.education = userInfo.education
    if (userInfo.incomeRange) form.income = userInfo.incomeRange
    if (userInfo.maritalStatus) form.marital = userInfo.maritalStatus
    if (userInfo.nickname) form.nickname = userInfo.nickname
  }
})

// ========== 单列选择器 ==========
const pickerVisible = ref(false)
const pickerAnimIn = ref(false)
const pickerType = ref('')
const pickerTempValue = ref('')

const pickerOptionMap: Record<string, string[]> = {
  gender: ['男', '女'],
  height: Array.from({ length: 81 }, (_, i) => (140 + i) + 'cm'),
  education: ['初中及以下', '高中', '中专', '大专', '本科', '硕士', '博士'],
  income: ['3千以下', '3千~5千', '5千~8千', '8千~1.2万', '1.2万~2万', '2万~3万', '3万以上'],
  marital: ['未婚', '离异未育', '离异带孩', '离异孩跟对方'],
}

const formFieldMap: Record<string, keyof typeof form> = {
  gender: 'gender',
  height: 'height',
  education: 'education',
  income: 'income',
  marital: 'marital',
}

const currentPickerOptions = computed(() => {
  return pickerOptionMap[pickerType.value] || []
})

const openPicker = (type: string) => {
  pickerType.value = type
  const field = formFieldMap[type]
  pickerTempValue.value = form[field] || ''
  pickerVisible.value = true
  setTimeout(() => {
    pickerAnimIn.value = true
  }, 20)
}

const closePicker = () => {
  pickerAnimIn.value = false
  setTimeout(() => {
    pickerVisible.value = false
    pickerType.value = ''
  }, 200)
}

const selectPickerOption = (opt: string) => {
  const field = formFieldMap[pickerType.value]
  if (field) {
    ;(form as any)[field] = opt
  }
  closePicker()
}

// ========== 生日选择器 ==========
const birthdayPickerVisible = ref(false)
const birthdayAnimIn = ref(false)

const currentYear = new Date().getFullYear()
const years = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => 1940 + i)
const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

// 默认选中 2001年 01月 01日 → picker-view index
const defaultYearIndex = years.indexOf(2001)
const birthdayPickerValue = ref([defaultYearIndex >= 0 ? defaultYearIndex : 61, 0, 0])
const birthdayTemp = ref({ year: 2001, month: 1, day: 1 })

const openBirthdayPicker = () => {
  // 若已有生日数据，回显
  if (form.birthday) {
    const parts = form.birthday.split('-')
    const y = parseInt(parts[0])
    const m = parseInt(parts[1])
    const d = parseInt(parts[2])
    const yIdx = years.indexOf(y)
    birthdayPickerValue.value = [
      yIdx >= 0 ? yIdx : defaultYearIndex >= 0 ? defaultYearIndex : 61,
      m - 1,
      d - 1,
    ]
    birthdayTemp.value = { year: y, month: m, day: d }
  } else {
    const yIdx = defaultYearIndex >= 0 ? defaultYearIndex : 61
    birthdayPickerValue.value = [yIdx, 0, 0]
    birthdayTemp.value = { year: years[yIdx], month: 1, day: 1 }
  }
  birthdayPickerVisible.value = true
  setTimeout(() => {
    birthdayAnimIn.value = true
  }, 20)
}

const closeBirthdayPicker = () => {
  birthdayAnimIn.value = false
  setTimeout(() => {
    birthdayPickerVisible.value = false
  }, 200)
}

const cancelBirthday = () => {
  closeBirthdayPicker()
}

const onBirthdayChange = (e: any) => {
  const [yIdx, mIdx, dIdx] = e.detail.value
  birthdayPickerValue.value = [yIdx, mIdx, dIdx]
  birthdayTemp.value = {
    year: years[yIdx],
    month: parseInt(months[mIdx]),
    day: parseInt(days[dIdx]),
  }
}

const confirmBirthday = () => {
  const { year, month, day } = birthdayTemp.value
  form.birthday = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  closeBirthdayPicker()
}

// ========== 提交 ==========
const handleSubmit = async () => {
  // 校验所有字段是否已填写
  const fields = [
    { key: 'gender', label: '性别' },
    { key: 'height', label: '身高' },
    { key: 'education', label: '学历' },
    { key: 'income', label: '月薪' },
    { key: 'birthday', label: '生日' },
    { key: 'marital', label: '婚况' },
    { key: 'nickname', label: '昵称' },
  ]

  for (const f of fields) {
    if (!form[f.key as keyof typeof form]) {
      showToast('请完善所有信息')
      return
    }
  }

  // 提交到后端
  try {
    // 将身高 cm 后缀去掉转数字
    const heightNum = parseInt(form.height.replace('cm', ''))
    // 性别转数字
    const genderNum = form.gender === '男' ? 1 : 2

    await post('/users/profile', {
      gender: genderNum,
      height: heightNum,
      education: form.education,
      incomeRange: form.income,
      birthday: form.birthday,
      maritalStatus: form.marital,
      nickname: form.nickname,
    })

    // 同步更新 store 中的生日字段，供后续页面计算星座/生肖
    const birthdayParts = form.birthday.split('-')
    ;(userStore.updateProfile as any)({
      birthYear: parseInt(birthdayParts[0]),
      birthMonth: parseInt(birthdayParts[1]),
      birthDay: parseInt(birthdayParts[2]),
    })

    // 保存成功，进入上传头像流程
    showToast('保存成功', 'success')
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/upload-avatar/index' })
    }, 800)
  } catch (err: any) {
    console.error('[basic-info] 提交失败:', err?.message || err)
  }
}
</script>

<style lang="scss" scoped>
.basic-info-page {
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
}

// ========== 表单列表 ==========
.form-list {
  padding: 32rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.form-item {
  background: #ffffff;
  border-radius: 16rpx;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28rpx;
  box-sizing: border-box;

  &:active {
    background: #f9f9f9;
  }
}

.form-item--input {
  &:active {
    background: #ffffff;
  }
}

.form-label {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  flex-shrink: 0;
}

.form-value {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
  gap: 8rpx;
}

.form-value--placeholder {
  font-size: 28rpx;
  color: #FF4D6A;
}

.form-value--selected {
  font-size: 28rpx;
  color: #333333;
}

.form-arrow {
  font-size: 28rpx;
  color: #999999;
}

.form-input {
  text-align: right;
  font-size: 28rpx;
  color: #333333;
  height: 100rpx;
  line-height: 100rpx;
  flex: 1;
  background: transparent;
}

// ========== 底部提示 ==========
.bottom-tip {
  padding: 32rpx 32rpx 0;
}

.bottom-tip text {
  font-size: 24rpx;
  color: #999999;
  line-height: 1.5;
}

// ========== 底部按钮 ==========
.bottom-btn-area {
  padding: 40rpx 60rpx 0;
}

.submit-btn {
  height: 96rpx;
  background: #FF4D6A;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 32rpx;
    font-weight: bold;
    color: #ffffff;
  }

  &:active {
    opacity: 0.85;
  }
}

// ========== iPhone X 底部安全区 ==========
.safe-bottom {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  min-height: 40rpx;
}

// ========== 单列选择器弹窗 ==========
.picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 200ms ease-out;

  &--in {
    opacity: 1;
  }
}

.picker-box {
  width: 480rpx;
  max-height: 720rpx;
  background: #ffffff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  padding: 24rpx 0;
  transform: scale(0.9);
  opacity: 0;
  transition: all 200ms ease-out;

  &--in {
    transform: scale(1);
    opacity: 1;
  }
}

.picker-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  text-align: center;
  padding-bottom: 16rpx;
}

.picker-options {
  max-height: 600rpx;
}

.picker-option {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 30rpx;
    color: #333333;
  }

  &:active {
    background: #f5f5f5;
  }
}

.picker-option--active {
  background: #FFF5F7;

  text {
    color: #FF4D6A;
  }
}

// ========== 生日选择器弹窗 ==========
.birthday-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  transition: opacity 200ms ease-out;

  &--in {
    opacity: 1;
  }
}

.birthday-box {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  transform: translateY(100%);
  transition: transform 200ms ease-out;

  &--in {
    transform: translateY(0);
  }
}

.birthday-toolbar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  border-bottom: 1rpx solid #eee;
}

.birthday-cancel {
  font-size: 30rpx;
  color: #999999;
}

.birthday-label {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.birthday-confirm {
  font-size: 30rpx;
  color: #07C160;
  font-weight: 500;
}

.birthday-picker-view {
  width: 100%;
  height: 400rpx;
}

.pick-col-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100rpx;

  text {
    font-size: 30rpx;
  }
}
</style>
