<template>
  <view class="mate-requirement-page">
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
      <!-- ========== 三步进度指示器 ========== -->
      <view class="steps-bar">
        <view class="step-item">
          <view class="step-circle step-circle--done">
            <text>1</text>
          </view>
          <text class="step-label step-label--done">详细信息</text>
        </view>

        <view class="step-line" />

        <view class="step-item">
          <view class="step-circle step-circle--active">
            <text>2</text>
          </view>
          <text class="step-label step-label--active">择偶要求</text>
        </view>

        <view class="step-line" />

        <view class="step-item">
          <view class="step-circle">
            <text>3</text>
          </view>
          <text class="step-label">实名认证</text>
        </view>
      </view>

      <!-- ========== 表单列表 ========== -->
      <view class="form-list">
        <!-- 年龄范围 -->
        <view class="form-item" @tap="openAgePicker">
          <text class="form-label">年龄范围</text>
          <view class="form-value">
            <text :class="form.ageRange ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.ageRange || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 最低身高 -->
        <view class="form-item" @tap="openSinglePicker('minHeight')">
          <text class="form-label">最低身高</text>
          <view class="form-value">
            <text :class="form.minHeight ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.minHeight || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 最低学历 -->
        <view class="form-item" @tap="openSinglePicker('minEducation')">
          <text class="form-label">最低学历</text>
          <view class="form-value">
            <text :class="form.minEducation ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.minEducation || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 最低月薪 -->
        <view class="form-item" @tap="openSinglePicker('minIncome')">
          <text class="form-label">最低月薪</text>
          <view class="form-value">
            <text :class="form.minIncome ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.minIncome || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 婚况要求 -->
        <view class="form-item" @tap="openSinglePicker('maritalRequirement')">
          <text class="form-label">婚况要求</text>
          <view class="form-value">
            <text :class="form.maritalRequirement ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.maritalRequirement || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 住房要求 -->
        <view class="form-item" @tap="showHousingPopup = true">
          <text class="form-label">住房要求</text>
          <view class="form-value">
            <text :class="form.housingRequirement ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.housingRequirement || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 接受对方小孩 -->
        <view class="form-item" @tap="openSinglePicker('acceptChildren')">
          <text class="form-label">接受对方小孩</text>
          <view class="form-value">
            <text :class="form.acceptChildren ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.acceptChildren || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 希望TA -->
        <view class="form-item" @tap="openHopeTaPicker">
          <text class="form-label">希望TA</text>
          <view class="form-value">
            <text :class="form.hopeTaTags.length ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.hopeTaTags.length ? form.hopeTaTags.join('、') : '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="bottom-tip">
        <text>❤️ 请填写真实的个人信息，只有真实的自己才能找到真爱！</text>
      </view>

      <!-- 下一步按钮 -->
      <view class="submit-btn-area">
        <view class="submit-btn" @tap="handleSubmit">
          <text>下一步</text>
        </view>
      </view>

      <!-- 暂时跳过 -->
      <view class="skip-btn" @tap="handleSkip">
        <text>暂时跳过</text>
      </view>

      <!-- 底部安全区 -->
      <view class="safe-bottom" />
    </scroll-view>

    <!-- ========== 单列选择器（最低身高/学历/月薪/婚况/接受小孩） ========== -->
    <view
      v-if="singlePickerVisible"
      class="picker-overlay"
      :class="{ 'picker-overlay--in': singlePickerAnimIn }"
      @tap="closeSinglePicker"
    >
      <view
        class="picker-box"
        :class="{ 'picker-box--in': singlePickerAnimIn }"
        @tap.stop
      >
        <text class="picker-title">请选择</text>
        <scroll-view class="picker-options" scroll-y>
          <view
            v-for="(opt, idx) in currentSingleOptions"
            :key="idx"
            class="picker-option"
            :class="{ 'picker-option--active': singleTempValue === opt }"
            @tap="selectSingleOption(opt)"
          >
            <text>{{ opt }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ========== 年龄范围双列选择器（底部弹出） ========== -->
    <view
      v-if="agePickerVisible"
      class="bottom-overlay"
      :class="{ 'bottom-overlay--in': agePickerAnimIn }"
      @tap="closeAgePicker"
    >
      <view
        class="bottom-panel bottom-panel--age"
        :class="{ 'bottom-panel--in': agePickerAnimIn }"
        @tap.stop
      >
        <text class="bottom-panel-title">选择器</text>

        <view class="age-columns">
          <!-- 左列：最小年龄 -->
          <view class="age-column">
            <text class="age-column-header">最小年龄</text>
            <picker-view
              class="age-picker-view"
              :value="ageMinIndexes"
              indicator-style="height:88rpx;"
              @change="onAgeMinChange"
            >
              <picker-view-column>
                <view
                  v-for="(opt, idx) in ageOptions"
                  :key="'min-'+idx"
                  class="age-picker-item"
                  :class="{ 'age-picker-item--active': ageMinValue === idx }"
                >
                  <text>{{ opt }}</text>
                </view>
              </picker-view-column>
            </picker-view>
          </view>

          <!-- 右列：最大年龄 -->
          <view class="age-column">
            <text class="age-column-header">最大年龄</text>
            <picker-view
              class="age-picker-view"
              :value="ageMaxIndexes"
              indicator-style="height:88rpx;"
              @change="onAgeMaxChange"
            >
              <picker-view-column>
                <view
                  v-for="(opt, idx) in ageOptions"
                  :key="'max-'+idx"
                  class="age-picker-item"
                  :class="{ 'age-picker-item--active': ageMaxValue === idx }"
                >
                  <text>{{ opt }}</text>
                </view>
              </picker-view-column>
            </picker-view>
          </view>
        </view>

        <!-- 底部按钮 -->
        <view class="age-footer">
          <view class="age-footer-btn age-footer-btn--cancel" @tap="closeAgePicker">
            <text>取消</text>
          </view>
          <view class="age-footer-btn age-footer-btn--confirm" @tap="confirmAgePicker">
            <text>确定</text>
          </view>
        </view>
        <view class="bottom-panel-safe" />
      </view>
    </view>

    <!-- ========== 住房要求选择弹窗（底部标签云，单选） ========== -->
    <view
      v-if="showHousingPopup"
      class="bottom-overlay"
      :class="{ 'bottom-overlay--in': housingAnimIn }"
      @tap="closeHousingPicker"
    >
      <view
        class="bottom-panel"
        :class="{ 'bottom-panel--in': housingAnimIn }"
        @tap.stop
      >
        <view class="popup-header-row">
          <text class="bottom-panel-title">住房要求</text>
          <text class="popup-close" @tap="closeHousingPicker">✕</text>
        </view>
        <scroll-view class="tag-cloud-wrap" scroll-y>
          <view class="tag-cloud">
            <view
              v-for="(opt, idx) in housingOptions"
              :key="idx"
              class="tag-cloud-item"
              :class="{ 'tag-cloud-item--active': housingTempValue === opt }"
              @tap="housingTempValue = opt"
            >
              <text>{{ opt }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="tag-confirm-area">
          <view class="tag-confirm-btn" @tap="confirmHousingPicker">
            <text>确定</text>
          </view>
        </view>
        <view class="bottom-panel-safe" />
      </view>
    </view>

    <!-- ========== 希望TA标签多选弹窗（底部标签云） ========== -->
    <view
      v-if="showHopeTaPopup"
      class="bottom-overlay"
      :class="{ 'bottom-overlay--in': hopeTaAnimIn }"
      @tap="closeHopeTaPicker"
    >
      <view
        class="bottom-panel bottom-panel--tag"
        :class="{ 'bottom-panel--in': hopeTaAnimIn }"
        @tap.stop
      >
        <view class="popup-header-row">
          <text class="bottom-panel-title">希望TA</text>
          <text class="popup-close" @tap="closeHopeTaPicker">✕</text>
        </view>

        <!-- 已选标签区 -->
        <scroll-view v-if="hopeTaTempTags.length" class="tag-selected-wrap" scroll-x>
          <view
            v-for="(tag, idx) in hopeTaTempTags"
            :key="idx"
            class="tag-selected-item"
            @tap="toggleHopeTaTag(tag)"
          >
            <text class="tag-selected-name">{{ tag }}</text>
            <text class="tag-selected-close">×</text>
          </view>
        </scroll-view>

        <scroll-view class="tag-cloud-wrap" scroll-y>
          <view class="tag-cloud">
            <view
              v-for="(opt, idx) in hopeTaOptions"
              :key="idx"
              class="tag-cloud-item"
              :class="{ 'tag-cloud-item--active': hopeTaTempTags.includes(opt) }"
              @tap="toggleHopeTaTag(opt)"
            >
              <text>{{ opt }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="tag-confirm-area">
          <view class="tag-confirm-btn" @tap="confirmHopeTaPicker">
            <text>确定</text>
          </view>
        </view>
        <view class="bottom-panel-safe" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { post } from '@/utils/request'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { showToast } from '@/utils/common'

const userStore = useUserStore()
const systemStore = useSystemStore()

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
  ageRange: '',
  minHeight: '',
  minEducation: '',
  minIncome: '',
  maritalRequirement: '',
  housingRequirement: '',
  acceptChildren: '',
  hopeTaTags: [] as string[],
})

// 自动填充已有数据
onMounted(() => {
  const info = userStore.userInfo
  if (!info) return
  if ((info as any).ageRange) form.ageRange = (info as any).ageRange
  if ((info as any).minHeight) form.minHeight = (info as any).minHeight
  if ((info as any).minEducation) form.minEducation = (info as any).minEducation
  if ((info as any).minIncome) form.minIncome = (info as any).minIncome
  if ((info as any).maritalRequirement) form.maritalRequirement = (info as any).maritalRequirement
  if ((info as any).housingRequirement) form.housingRequirement = (info as any).housingRequirement
  if (info.acceptChildren) form.acceptChildren = info.acceptChildren
  if ((info as any).hopeTaTags) {
    form.hopeTaTags = Array.isArray((info as any).hopeTaTags)
      ? (info as any).hopeTaTags
      : (info as any).hopeTaTags.split(',')
  }
})

// ========== 单列选择器（最低身高/学历/月薪/婚况要求/接受对方小孩） ==========
const singlePickerVisible = ref(false)
const singlePickerAnimIn = ref(false)
const singlePickerType = ref('')
const singleTempValue = ref('')

const singleOptionMap: Record<string, string[]> = {
  minHeight: [
    '请选择', '不限',
    '140cm以下',
    ...Array.from({ length: 81 }, (_, i) => (140 + i) + 'cm'),
  ],
  minEducation: ['请选择', '不限', '高中及以上', '大专及以上', '本科及以上'],
  minIncome: ['不限', '3千以上', '5千以上', '8千以上', '1.2万以上'],
  maritalRequirement: ['请选择', '不限', '仅限未婚', '仅限离异'],
  acceptChildren: ['请选择', '无所谓', '不接受'],
}

const singleFieldMap: Record<string, keyof typeof form> = {
  minHeight: 'minHeight',
  minEducation: 'minEducation',
  minIncome: 'minIncome',
  maritalRequirement: 'maritalRequirement',
  acceptChildren: 'acceptChildren',
}

const currentSingleOptions = computed(() => singleOptionMap[singlePickerType.value] || [])

const openSinglePicker = (type: string) => {
  singlePickerType.value = type
  const field = singleFieldMap[type]
  singleTempValue.value = (form[field] as string) || ''
  singlePickerVisible.value = true
  setTimeout(() => { singlePickerAnimIn.value = true }, 20)
}

const closeSinglePicker = () => {
  singlePickerAnimIn.value = false
  setTimeout(() => { singlePickerVisible.value = false; singlePickerType.value = '' }, 200)
}

const selectSingleOption = (opt: string) => {
  const field = singleFieldMap[singlePickerType.value]
  if (field) {
    // 若选"请选择"则清空值
    (form as any)[field] = opt === '请选择' ? '' : opt
  }
  closeSinglePicker()
}

// ========== 年龄范围双列选择器 ==========
const agePickerVisible = ref(false)
const agePickerAnimIn = ref(false)
const ageMinValue = ref(0) // index: 0 = 不限, 1 = 18, ...
const ageMaxValue = ref(0)

const ageOptions = ['不限', ...Array.from({ length: 43 }, (_, i) => String(18 + i))] // 不限, 18~60

const ageMinIndexes = ref([0])
const ageMaxIndexes = ref([0])

watch(agePickerVisible, (val) => {
  if (val) setTimeout(() => { agePickerAnimIn.value = true }, 20)
  else agePickerAnimIn.value = false
})

const onAgeMinChange = (e: any) => {
  ageMinValue.value = e.detail.value[0]
}

const onAgeMaxChange = (e: any) => {
  ageMaxValue.value = e.detail.value[0]
}

const openAgePicker = () => {
  ageMinValue.value = 0
  ageMaxValue.value = 0
  ageMinIndexes.value = [0]
  ageMaxIndexes.value = [0]
  agePickerVisible.value = true
}

const closeAgePicker = () => {
  agePickerAnimIn.value = false
  setTimeout(() => { agePickerVisible.value = false }, 200)
}

const confirmAgePicker = () => {
  const minLabel = ageOptions[ageMinValue.value]
  const maxLabel = ageOptions[ageMaxValue.value]
  if (minLabel === '不限' && maxLabel === '不限') {
    form.ageRange = '不限'
  } else if (minLabel !== '不限' && maxLabel === '不限') {
    form.ageRange = minLabel + '岁以上'
  } else if (minLabel === '不限' && maxLabel !== '不限') {
    form.ageRange = maxLabel + '岁以下'
  } else {
    form.ageRange = minLabel + '-' + maxLabel + '岁'
  }
  closeAgePicker()
}

// ========== 住房要求选择弹窗 ==========
const housingOptions = [
  '不限', '和家人同住', '已购房', '租房', '婚后购房',
  '住在单位宿舍', '有婚房无贷款', '有婚房有贷款', '住亲朋家',
  '已购房无贷款', '已购房有贷款', '与父母同住',
  '需要时可购置', '房子买在老家', '自建房',
]

const showHousingPopup = ref(false)
const housingAnimIn = ref(false)
const housingTempValue = ref('')

watch(showHousingPopup, (val) => {
  if (val) setTimeout(() => { housingAnimIn.value = true }, 20)
  else housingAnimIn.value = false
})

const closeHousingPicker = () => {
  housingAnimIn.value = false
  setTimeout(() => { showHousingPopup.value = false }, 200)
}

const confirmHousingPicker = () => {
  form.housingRequirement = housingTempValue.value
  closeHousingPicker()
}

// 打开时初始化临时值
watch(showHousingPopup, (val) => {
  if (val) housingTempValue.value = form.housingRequirement
})

// ========== 希望TA标签多选弹窗 ==========
const DEFAULT_HOPE_TA_TAGS = [
  '品味出众', '喜欢厨艺', '不冷暴力', '重视家庭', '整洁干净', '阳光运动',
  '文艺范', '懂得尊重', '低调沉稳', '心地善良', '浪漫主义', '乐观积极',
  '成熟稳重', '爱情专一', '真诚靠谱', '风趣幽默', '温柔体贴', '有责任心',
  '有上进心', '孝敬父母', '能一起打拼', '独立不粘人',
]

const hopeTaOptions = computed(() =>
  (systemStore.dicts.hopeTaTags as string[]) || DEFAULT_HOPE_TA_TAGS
)

const showHopeTaPopup = ref(false)
const hopeTaAnimIn = ref(false)
const hopeTaTempTags = ref<string[]>([])

watch(showHopeTaPopup, (val) => {
  if (val) setTimeout(() => { hopeTaAnimIn.value = true }, 20)
  else hopeTaAnimIn.value = false
})

const openHopeTaPicker = () => {
  hopeTaTempTags.value = [...form.hopeTaTags]
  showHopeTaPopup.value = true
}

const closeHopeTaPicker = () => {
  hopeTaAnimIn.value = false
  setTimeout(() => { showHopeTaPopup.value = false }, 200)
}

const toggleHopeTaTag = (tag: string) => {
  const idx = hopeTaTempTags.value.indexOf(tag)
  if (idx > -1) {
    hopeTaTempTags.value.splice(idx, 1)
  } else {
    hopeTaTempTags.value.push(tag)
  }
}

const confirmHopeTaPicker = () => {
  form.hopeTaTags = [...hopeTaTempTags.value]
  closeHopeTaPicker()
}

// ========== 提交 ==========
const handleSubmit = async () => {
  const requiredFields = [
    { key: 'ageRange', label: '年龄范围' },
    { key: 'minHeight', label: '最低身高' },
    { key: 'minEducation', label: '最低学历' },
    { key: 'minIncome', label: '最低月薪' },
    { key: 'maritalRequirement', label: '婚况要求' },
    { key: 'housingRequirement', label: '住房要求' },
    { key: 'acceptChildren', label: '接受对方小孩' },
  ]

  for (const f of requiredFields) {
    if (!form[f.key as keyof typeof form]) {
      showToast('请完善所有信息')
      return
    }
  }
  if (!form.hopeTaTags.length) {
    showToast('请完善所有信息')
    return
  }

  try {
    await post('/users/profile', {
      ageRange: form.ageRange,
      minHeight: form.minHeight,
      minEducation: form.minEducation,
      minIncome: form.minIncome,
      maritalRequirement: form.maritalRequirement,
      housingRequirement: form.housingRequirement,
      acceptChildren: form.acceptChildren,
      hopeTaTags: form.hopeTaTags.join(','),
    })

    // 同步更新 store
    ;(userStore.updateProfile as any)({
      ageRange: form.ageRange,
      minHeight: form.minHeight,
      minEducation: form.minEducation,
      minIncome: form.minIncome,
      maritalRequirement: form.maritalRequirement,
      housingRequirement: form.housingRequirement,
      acceptChildren: form.acceptChildren,
      hopeTaTags: form.hopeTaTags.join(','),
    })

    showToast('保存成功', 'success')
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/real-name-auth/index' })
    }, 800)
  } catch (err: any) {
    console.error('[mate-requirement] 提交失败:', err?.message || err)
    showToast(err?.message || '保存失败，请稍后重试')
  }
}

const handleSkip = () => {
  uni.navigateTo({ url: '/pages/real-name-auth/index' })
}
</script>

<style lang="scss" scoped>
.mate-requirement-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

// ========== 导航栏 ==========
.nav-wrap {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 100; background: #ffffff;
}
.nav-bar {
  height: 88rpx; display: flex; align-items: center;
  justify-content: space-between; padding: 0 32rpx;
}
.nav-back { font-size: 36rpx; color: #333; width: 80rpx; }
.nav-title { font-size: 34rpx; font-weight: bold; color: #333; }
.nav-placeholder { width: 80rpx; }

.page-content { flex: 1; height: 100vh; box-sizing: border-box; }

// ========== 进度指示器 ==========
.steps-bar {
  display: flex; align-items: center; justify-content: center;
  background: #ffffff; padding: 32rpx 60rpx;
}
.step-item { display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.step-circle {
  width: 64rpx; height: 64rpx; border-radius: 50%;
  background: #E0E0E0;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 28rpx; color: #ffffff; font-weight: bold; }
}
.step-circle--active, .step-circle--done { background: #FF4D6A; }
.step-label { font-size: 28rpx; color: #999999; }
.step-label--active { color: #FF4D6A; }
.step-label--done { color: #FF4D6A; }
.step-line {
  flex: 1; height: 2rpx; margin: 0 12rpx; margin-bottom: 52rpx;
  border-top: 2rpx dashed #CCCCCC;
}

// ========== 表单列表 ==========
.form-list {
  padding: 32rpx 32rpx 0;
  display: flex; flex-direction: column; gap: 20rpx;
}
.form-item {
  background: #ffffff; border-radius: 16rpx; height: 100rpx;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28rpx; box-sizing: border-box;
  &:active { background: #f9f9f9; }
}
.form-label { font-size: 30rpx; font-weight: bold; color: #333333; flex-shrink: 0; }
.form-value {
  display: flex; align-items: center; flex: 1;
  justify-content: flex-end; gap: 8rpx;
}
.form-value--placeholder { font-size: 28rpx; color: #FF4D6A; }
.form-value--selected { font-size: 28rpx; color: #333333; }
.form-arrow { font-size: 28rpx; color: #999999; }

// ========== 底部 ==========
.bottom-tip {
  padding: 32rpx 32rpx 0;
  text { font-size: 24rpx; color: #999999; line-height: 1.5; }
}
.submit-btn-area { padding: 40rpx 60rpx 0; }
.submit-btn {
  height: 96rpx; background: #FF4D6A; border-radius: 48rpx;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 32rpx; font-weight: bold; color: #ffffff; }
  &:active { opacity: 0.85; }
}

// ========== 暂时跳过 ==========
.skip-btn {
  margin-top: 24rpx; text-align: center;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  padding-bottom: 40rpx;
  text { font-size: 28rpx; color: #CCCCCC; text-decoration: underline; }
  &:active { text { color: #999999; } }
}

.safe-bottom {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  min-height: 40rpx;
}

// ========== 单列选择器弹窗 ==========
.picker-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  z-index: 1000; background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 200ms ease-out;
  &--in { opacity: 1; }
}
.picker-box {
  width: 480rpx; max-height: 720rpx;
  background: #ffffff; border-radius: 24rpx;
  display: flex; flex-direction: column; padding: 24rpx 0;
  transform: scale(0.9); opacity: 0; transition: all 200ms ease-out;
  &--in { transform: scale(1); opacity: 1; }
}
.picker-title {
  font-size: 32rpx; font-weight: bold; color: #333333;
  text-align: center; padding-bottom: 16rpx;
}
.picker-options { max-height: 600rpx; }
.picker-option {
  height: 88rpx; display: flex; align-items: center; justify-content: center;
  text { font-size: 30rpx; color: #333333; }
  &:active { background: #f5f5f5; }
}
.picker-option--active { background: #FFF5F7; text { color: #FF4D6A; } }

// ========== 底部弹窗通用 ==========
.bottom-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  z-index: 1000; background: rgba(0, 0, 0, 0.6);
  opacity: 0; transition: opacity 200ms ease-out;
  &--in { opacity: 1; }
}
.bottom-panel {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: #ffffff; border-radius: 24rpx 24rpx 0 0;
  transform: translateY(100%); transition: transform 200ms ease-out;
  &--in { transform: translateY(0); }
  display: flex; flex-direction: column; max-height: 75vh;
}
.bottom-panel-title {
  font-size: 32rpx; font-weight: bold; color: #333333;
  text-align: center; padding: 24rpx 0 16rpx;
}
.bottom-panel-safe {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}

// 弹窗头部（标题+×）
.popup-header-row {
  display: flex; align-items: center; justify-content: center;
  padding: 24rpx 32rpx 16rpx; position: relative;
  .bottom-panel-title { padding: 0; }
}
.popup-close {
  position: absolute; right: 32rpx; top: 24rpx;
  font-size: 36rpx; color: #999; padding: 8rpx;
}

// 标签云
.tag-cloud-wrap { flex: 1; min-height: 0; padding: 0 24rpx; }
.tag-cloud {
  display: flex; flex-wrap: wrap; gap: 16rpx;
  padding: 8rpx 0 16rpx;
}
.tag-cloud-item {
  padding: 14rpx 28rpx; border-radius: 48rpx;
  background: #F5F5F5;
  text { font-size: 26rpx; color: #333333; }
  &:active { opacity: 0.8; }
}
.tag-cloud-item--active {
  background: #FF4D6A;
  text { color: #ffffff; }
}

.tag-confirm-area { padding: 24rpx 32rpx; }
.tag-confirm-btn {
  height: 88rpx; background: #FF4D6A; border-radius: 48rpx;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 30rpx; font-weight: bold; color: #ffffff; }
  &:active { opacity: 0.85; }
}

// ========== 年龄选择器 ==========
.bottom-panel--age { max-height: 65vh; }

.age-columns {
  display: flex; gap: 24rpx; padding: 0 32rpx;
}
.age-column {
  flex: 1; display: flex; flex-direction: column;
}
.age-column-header {
  font-size: 26rpx; color: #999999; text-align: center; padding: 8rpx 0;
}
.age-picker-view {
  height: 440rpx; width: 100%;
}
.age-picker-item {
  height: 88rpx; display: flex; align-items: center; justify-content: center;
  text { font-size: 30rpx; color: #999999; }
}
.age-picker-item--active {
  text { color: #333333; font-weight: bold; }
}

.age-footer {
  display: flex; gap: 24rpx; padding: 16rpx 32rpx;
}
.age-footer-btn {
  flex: 1; height: 80rpx; border-radius: 12rpx;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 30rpx; font-weight: bold; }
  &--cancel { background: #F5F5F5; text { color: #333333; } }
  &--confirm { background: #07C160; text { color: #ffffff; } }
}

// ========== 标签弹窗特有 ==========
.bottom-panel--tag { max-height: 80vh; }

.tag-selected-wrap {
  padding: 12rpx 24rpx; white-space: nowrap;
  height: auto; max-height: 120rpx;
}
.tag-selected-item {
  display: inline-flex; align-items: center;
  background: #FF4D6A; border-radius: 48rpx;
  padding: 8rpx 16rpx; margin-right: 12rpx;
}
.tag-selected-name { font-size: 24rpx; color: #ffffff; margin-right: 6rpx; }
.tag-selected-close { font-size: 24rpx; color: #ffffff; font-weight: bold; }
</style>
