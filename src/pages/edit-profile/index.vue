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
          <input class="form-input" v-model="form.nickname" placeholder="请输入昵称" maxlength="20" />
        </view>

        <view class="form-item">
          <text class="form-label">性别</text>
          <view class="gender-group">
            <view class="gender-btn" :class="{ active: form.gender === 1 }" @tap="form.gender = 1">男</view>
            <view class="gender-btn" :class="{ active: form.gender === 2 }" @tap="form.gender = 2">女</view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">出生年份</text>
          <picker mode="selector" :range="birthYearOptions" :value="birthYearIndex" @change="onBirthYearChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.birthYear }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.birthYear ? form.birthYear + '年' : '请选择出生年份' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">身高(cm)</text>
          <input class="form-input" v-model="form.height" placeholder="请输入身高" type="number" maxlength="3" />
        </view>

        <view class="form-item">
          <text class="form-label">体重(kg)</text>
          <input class="form-input" v-model="form.weight" placeholder="请输入体重" type="number" maxlength="3" />
        </view>

        <view class="form-item">
          <text class="form-label">学历</text>
          <picker mode="selector" :range="educationLabels" :value="educationIndex" @change="onEducationChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.education }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.education || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">职业</text>
          <input class="form-input" v-model="form.occupation" placeholder="请输入职业" maxlength="30" />
        </view>

        <view class="form-item">
          <text class="form-label">月薪</text>
          <picker mode="selector" :range="incomeLabels" :value="incomeIndex" @change="onIncomeChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.incomeRange }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.incomeRange || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">婚姻状况</text>
          <picker mode="selector" :range="maritalOptions" :value="maritalIndex" @change="onMaritalChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.maritalStatus }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.maritalStatus || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">独生子女</text>
          <picker mode="selector" :range="onlyChildOptions" :value="onlyChildIndex" @change="onOnlyChildChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.onlyChild }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.onlyChild || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">何时结婚</text>
          <picker mode="selector" :range="whenMarryOptions" :value="whenMarryIndex" @change="onWhenMarryChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.whenMarry }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.whenMarry || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">属相</text>
          <picker mode="selector" :range="zodiacOptions" :value="zodiacIndex" @change="onZodiacChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.zodiac }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.zodiac || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">星座</text>
          <picker mode="selector" :range="constellationOptions" :value="constellationIndex" @change="onConstellationChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.constellation }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.constellation || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item" @tap="openCityPicker('hometown')">
          <text class="form-label">户籍地</text>
          <view class="form-picker">
            <text class="picker-value" :class="{ placeholder: !form.hometown }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.hometown || '请选择户籍地' }}</text>
            <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
          </view>
        </view>

        <view class="form-item" @tap="openCityPicker('residence')">
          <text class="form-label">现居地</text>
          <view class="form-picker">
            <text class="picker-value" :class="{ placeholder: !form.residence }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.residence || '请选择现居地' }}</text>
            <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
          </view>
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

      <!-- 择偶要求 -->
      <view class="section-card">
        <view class="section-title-row">
          <text class="section-title-bar"></text>
          <text class="section-title">择偶要求</text>
        </view>

        <view class="form-item">
          <text class="form-label">年龄范围</text>
          <picker mode="selector" :range="partnerAgeRangeOptions" :value="partnerAgeIndex" @change="onPartnerAgeChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.partnerAgeRange }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.partnerAgeRange || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">最低身高</text>
          <picker mode="selector" :range="partnerHeightOptions" :value="partnerHeightIndex" @change="onPartnerHeightChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.partnerHeightMin }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.partnerHeightMin || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">最低学历</text>
          <picker mode="selector" :range="partnerEducationOptions" :value="partnerEducationIndex" @change="onPartnerEducationChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.partnerEducation }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.partnerEducation || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">收入要求</text>
          <picker mode="selector" :range="partnerIncomeOptions" :value="partnerIncomeIndex" @change="onPartnerIncomeChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.partnerIncome }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.partnerIncome || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item" @tap="openHousingPicker">
          <text class="form-label">住房要求</text>
          <view class="form-picker">
            <text class="picker-value" :class="{ placeholder: !form.housingRequirement }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.housingRequirement || '请选择' }}</text>
            <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">婚况要求</text>
          <picker mode="selector" :range="partnerMaritalOptions" :value="partnerMaritalIndex" @change="onPartnerMaritalChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.partnerMaritalStatus }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.partnerMaritalStatus || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">接受小孩</text>
          <picker mode="selector" :range="acceptChildrenOptions" :value="acceptChildrenIndex" @change="onAcceptChildrenChange" style="flex:1">
            <view class="form-picker">
              <text class="picker-value" :class="{ placeholder: !form.acceptChildren }" style="flex:1;text-align:right;font-size:28rpx;color:#333;">{{ form.acceptChildren || '请选择' }}</text>
              <text class="picker-arrow" style="font-size:24rpx;color:#ccc;margin-left:8rpx;flex-shrink:0;">></text>
            </view>
          </picker>
        </view>

        <!-- 希望TA -->
        <view class="hope-ta-section">
          <view class="section-title-row">
            <text class="section-title-bar"></text>
            <text class="section-title">希望TA</text>
          </view>
          <view class="hope-ta-tags">
            <view v-for="(tag, idx) in form.hopeTaTags" :key="idx" class="hope-tag-item" @tap="removeHopeTaTag(idx)">
              <text>{{ tag }}</text>
              <text class="hope-tag-close">×</text>
            </view>
            <view class="hope-tag-add" @tap="openTagPicker">
              <text>+</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>

    <!-- 底部保存按钮 -->
    <view class="save-bar">
      <view class="save-btn" @tap="handleSave">
        <text>保存</text>
      </view>
    </view>

    <!-- 住房要求弹窗 -->
    <view class="popup-mask" v-if="showHousingPopup" @tap="closeHousingPicker"></view>
    <view class="popup-panel" :class="{ show: showHousingPopup }">
      <view class="popup-header">
        <text class="popup-title">住房要求</text>
        <text class="popup-close" @tap="closeHousingPicker">✕</text>
      </view>
      <view class="popup-body">
        <view class="popup-options">
          <view
            v-for="(opt, idx) in housingOptions"
            :key="idx"
            class="popup-option"
            :class="{ active: tempHousing.includes(opt) }"
            @tap="toggleHousing(opt)"
          >
            <text>{{ opt }}</text>
          </view>
        </view>
      </view>
      <view class="popup-footer">
        <view class="popup-confirm" @tap="confirmHousingPicker">
          <text>确定</text>
        </view>
      </view>
    </view>

    <!-- 希望TA标签弹窗 -->
    <view class="popup-mask" v-if="showTagPopup" @tap="closeTagPicker"></view>
    <view class="popup-panel" :class="{ show: showTagPopup }">
      <view class="popup-header">
        <text class="popup-title">希望TA</text>
        <text class="popup-close" @tap="closeTagPicker">✕</text>
      </view>
      <view class="popup-body">
        <view class="popup-options">
          <view
            v-for="(tag, idx) in hopeTaTagOptions"
            :key="idx"
            class="popup-option"
            :class="{ active: tempTags.includes(tag) }"
            @tap="toggleTag(tag)"
          >
            <text>{{ tag }}</text>
          </view>
        </view>
      </view>
      <view class="popup-footer">
        <view class="popup-confirm" @tap="confirmTagPicker">
          <text>确定</text>
        </view>
      </view>
    </view>

    <!-- 城市选择器 -->
    <city-picker
      :visible="showCityPicker"
      @confirm="onCityConfirm"
      @close="showCityPicker = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import request, { put } from '@/utils/request'
import { uploadImage } from '@/utils/upload'
import CityPicker from '@/components/city-picker/city-picker.vue'

const userStore = useUserStore()
const saving = ref(false)
const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)

// ===== 选项数据 =====
const birthYearOptions = (() => {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let y = currentYear - 18; y >= 1940; y--) years.push(String(y))
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
const onlyChildOptions = ['是', '否']

const whenMarryOptions = ['闪婚', '一年内', '两年内', '三年内', '时机成熟就结婚', '顺其自然']

const zodiacOptions = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

const constellationOptions = [
  '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
  '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座',
]

// 择偶要求选项
const partnerAgeRangeOptions = ['不限', '18-22岁', '20-25岁', '22-28岁', '25-30岁', '28-33岁', '30-35岁', '33-38岁', '35-40岁', '40岁以上']
const partnerHeightOptions = ['不限', '150cm以上', '155cm以上', '160cm以上', '165cm以上', '170cm以上', '175cm以上', '180cm以上', '185cm以上']
const partnerEducationOptions = ['不限', '高中', '大专', '本科', '硕士', '博士']
const partnerIncomeOptions = ['不限', '3千以上', '5千以上', '8千以上', '1万以上', '2万以上', '3万以上', '5万以上']
const partnerMaritalOptions = ['不限', '仅限未婚', '仅限离异']
const acceptChildrenOptions = ['不限', '不接受', '无所谓']

const housingOptions = [
  '不限', '和家人同住', '已购房', '租房', '婚后购房', '住在单位宿舍',
  '有婚房无贷款', '有婚房有贷款', '住亲朋家', '已购房无贷款',
  '已购房有贷款', '与父母同住', '需要时可购置', '房子买在老家', '自建房',
]

const hopeTaTagOptions = [
  '品味出众', '喜欢厨艺', '不冷暴力', '重视家庭', '整洁干净', '阳光运动',
  '文艺范', '懂得尊重', '低调沉稳', '心地善良', '浪漫主义', '乐观积极',
  '成熟稳重', '爱情专一', '真诚靠谱', '风趣幽默', '温柔体贴', '有责任心',
  '有上进心', '孝敬父母', '能一起打拼', '独立不粘人',
]

// ===== 表单数据 =====
const form = ref({
  avatar: '',
  avatarReviewStatus: 1,
  reviewStatus: 1,
  nickname: '',
  gender: 0,
  birthYear: undefined as number | undefined,
  height: undefined as number | undefined,
  weight: undefined as number | undefined,
  education: '',
  occupation: '',
  incomeRange: '',
  maritalStatus: '',
  onlyChild: '',
  whenMarry: '',
  zodiac: '',
  constellation: '',
  residence: '',
  hometown: '',
  selfIntro: '',
  // 择偶要求
  partnerAgeRange: '',
  partnerHeightMin: '',
  partnerEducation: '',
  partnerIncome: '',
  housingRequirement: '',
  partnerMaritalStatus: '',
  acceptChildren: '',
  hopeTaTags: [] as string[],
})

// ===== 弹窗状态 =====
const showHousingPopup = ref(false)
const tempHousing = ref<string[]>([])
const showTagPopup = ref(false)
const tempTags = ref<string[]>([])

// 城市选择器
const showCityPicker = ref(false)
const cityTarget = ref<'residence' | 'hometown'>('residence')

// ===== 初始化 =====
onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)

  const info = userStore.userInfo as any
  if (info) {
    form.value = {
      avatar: info.avatar || '',
      avatarReviewStatus: info.avatarReviewStatus ?? 1,
      reviewStatus: info.reviewStatus ?? 1,
      nickname: info.nickname || '',
      gender: info.gender ?? 0,
      birthYear: info.birthYear,
      height: info.height,
      weight: info.weight,
      education: info.education || '',
      occupation: info.occupation || '',
      incomeRange: info.incomeRange || '',
      maritalStatus: info.maritalStatus || '',
      onlyChild: info.onlyChild || '',
      whenMarry: info.whenMarry || '',
      zodiac: info.zodiac || '',
      constellation: info.constellation || '',
      residence: info.residence || info.city || '',
      hometown: info.hometown || '',
      selfIntro: info.selfIntro || info.bio || '',
      partnerAgeRange: info.partnerAgeRange || '',
      partnerHeightMin: info.partnerHeightMin || '',
      partnerEducation: info.partnerEducation || '',
      partnerIncome: info.partnerIncome || '',
      housingRequirement: info.housingRequirement || '',
      partnerMaritalStatus: info.partnerMaritalStatus || '',
      acceptChildren: info.acceptChildren || '',
      hopeTaTags: parseTags(info.hopeTaTags),
    }
  }
})

const parseTags = (val: any): string[] => {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

// ===== Computed =====
const introLen = computed(() => form.value.selfIntro.length)

const birthYearIndex = computed(() => {
  if (!form.value.birthYear) return -1
  return birthYearOptions.findIndex((o) => o.startsWith(String(form.value.birthYear)))
})
const educationIndex = computed(() => educationOptions.findIndex((o) => o.value === form.value.education))
const incomeIndex = computed(() => incomeOptions.findIndex((o) => o.value === form.value.incomeRange))
const maritalIndex = computed(() => maritalOptions.indexOf(form.value.maritalStatus))
const onlyChildIndex = computed(() => onlyChildOptions.indexOf(form.value.onlyChild))
const whenMarryIndex = computed(() => whenMarryOptions.indexOf(form.value.whenMarry))
const zodiacIndex = computed(() => zodiacOptions.indexOf(form.value.zodiac))
const constellationIndex = computed(() => constellationOptions.indexOf(form.value.constellation))

const partnerAgeIndex = computed(() => partnerAgeRangeOptions.indexOf(form.value.partnerAgeRange))
const partnerHeightIndex = computed(() => partnerHeightOptions.indexOf(form.value.partnerHeightMin))
const partnerEducationIndex = computed(() => partnerEducationOptions.indexOf(form.value.partnerEducation))
const partnerIncomeIndex = computed(() => partnerIncomeOptions.indexOf(form.value.partnerIncome))
const partnerMaritalIndex = computed(() => partnerMaritalOptions.indexOf(form.value.partnerMaritalStatus))
const acceptChildrenIndex = computed(() => acceptChildrenOptions.indexOf(form.value.acceptChildren))

// ===== 头像 =====
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
        const msg = error.message === 'Unauthorized' ? '请先登录' : '上传失败，请重试'
        uni.showToast({ title: msg, icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

// ===== Picker 事件 =====
const onBirthYearChange = (e: { detail: { value: number } }) => {
  form.value.birthYear = parseInt(birthYearOptions[e.detail.value])
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
const onOnlyChildChange = (e: { detail: { value: number } }) => {
  form.value.onlyChild = onlyChildOptions[e.detail.value]
}
const onWhenMarryChange = (e: { detail: { value: number } }) => {
  form.value.whenMarry = whenMarryOptions[e.detail.value]
}
const onZodiacChange = (e: { detail: { value: number } }) => {
  form.value.zodiac = zodiacOptions[e.detail.value]
}
const onConstellationChange = (e: { detail: { value: number } }) => {
  form.value.constellation = constellationOptions[e.detail.value]
}
const onPartnerAgeChange = (e: { detail: { value: number } }) => {
  form.value.partnerAgeRange = partnerAgeRangeOptions[e.detail.value]
}
const onPartnerHeightChange = (e: { detail: { value: number } }) => {
  form.value.partnerHeightMin = partnerHeightOptions[e.detail.value]
}
const onPartnerEducationChange = (e: { detail: { value: number } }) => {
  form.value.partnerEducation = partnerEducationOptions[e.detail.value]
}
const onPartnerIncomeChange = (e: { detail: { value: number } }) => {
  form.value.partnerIncome = partnerIncomeOptions[e.detail.value]
}
const onPartnerMaritalChange = (e: { detail: { value: number } }) => {
  form.value.partnerMaritalStatus = partnerMaritalOptions[e.detail.value]
}
const onAcceptChildrenChange = (e: { detail: { value: number } }) => {
  form.value.acceptChildren = acceptChildrenOptions[e.detail.value]
}

// ===== 住房要求弹窗 =====
const openHousingPicker = () => {
  tempHousing.value = form.value.housingRequirement
    ? form.value.housingRequirement.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  showHousingPopup.value = true
}
const closeHousingPicker = () => { showHousingPopup.value = false }
const toggleHousing = (opt: string) => {
  const idx = tempHousing.value.indexOf(opt)
  if (idx > -1) {
    tempHousing.value.splice(idx, 1)
  } else {
    tempHousing.value.push(opt)
  }
}
const confirmHousingPicker = () => {
  form.value.housingRequirement = tempHousing.value.join(',')
  showHousingPopup.value = false
}

// ===== 希望TA标签弹窗 =====
const openTagPicker = () => {
  tempTags.value = [...form.value.hopeTaTags]
  showTagPopup.value = true
}
const closeTagPicker = () => { showTagPopup.value = false }
const toggleTag = (tag: string) => {
  const idx = tempTags.value.indexOf(tag)
  if (idx > -1) {
    tempTags.value.splice(idx, 1)
  } else {
    tempTags.value.push(tag)
  }
}
const confirmTagPicker = () => {
  form.value.hopeTaTags = [...tempTags.value]
  showTagPopup.value = false
}
const removeHopeTaTag = (idx: number) => {
  form.value.hopeTaTags.splice(idx, 1)
}

// ===== 城市选择器 =====
const openCityPicker = (target: 'residence' | 'hometown' = 'residence') => {
  cityTarget.value = target
  showCityPicker.value = true
}
const onCityConfirm = (value: string, _ids: number[]) => {
  if (cityTarget.value === 'hometown') {
    form.value.hometown = value
  } else {
    form.value.residence = value
  }
  showCityPicker.value = false
}

// ===== 保存 =====
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
      weight: form.value.weight ? Number(form.value.weight) : undefined,
      education: form.value.education,
      occupation: form.value.occupation.trim(),
      incomeRange: form.value.incomeRange,
      maritalStatus: form.value.maritalStatus,
      onlyChild: form.value.onlyChild,
      whenMarry: form.value.whenMarry,
      zodiac: form.value.zodiac,
      constellation: form.value.constellation,
      residence: form.value.residence.trim(),
      hometown: form.value.hometown.trim(),
      selfIntro: form.value.selfIntro.trim(),
      partnerAgeRange: form.value.partnerAgeRange,
      partnerHeightMin: form.value.partnerHeightMin,
      partnerEducation: form.value.partnerEducation,
      partnerIncome: form.value.partnerIncome,
      housingRequirement: form.value.housingRequirement,
      partnerMaritalStatus: form.value.partnerMaritalStatus,
      acceptChildren: form.value.acceptChildren,
      hopeTaTags: form.value.hopeTaTags.join(','),
    }

    const result = await put<Record<string, unknown>>('/users/profile', data)

    try {
      await request({ url: '/users/profile-review', method: 'POST', data } as any)
      form.value.reviewStatus = 0
    } catch (_) { /* 审核提交失败不阻断保存 */ }

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

.section-title-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;

  .section-title-bar {
    width: 6rpx;
    height: 32rpx;
    background-color: #FF6B9D;
    border-radius: 3rpx;
    margin-right: 12rpx;
  }

  .section-title {
    margin-bottom: 0;
  }
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

/* 希望TA 标签 */
.hope-ta-section {
  padding: 16rpx 0 20rpx;
}

.hope-ta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding-top: 8rpx;
}

.hope-tag-item {
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx;
  background-color: #FFF5F7;
  border-radius: 30rpx;
  height: 56rpx;
  box-sizing: border-box;

  text {
    font-size: 26rpx;
    color: #FF6B9D;
  }
}

.hope-tag-close {
  margin-left: 8rpx;
  font-size: 24rpx !important;
  color: #FF6B9D !important;
}

.hope-tag-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 30rpx;
  border: 2rpx solid #FFD0E0;

  text {
    font-size: 32rpx;
    color: #FF6B9D;
  }
}

/* 弹窗 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 200;
}

.popup-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  z-index: 201;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  max-height: 70vh;
  display: flex;
  flex-direction: column;

  &.show {
    transform: translateY(0);
  }
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 32rpx 20rpx;
  position: relative;
}

.popup-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.popup-close {
  position: absolute;
  right: 32rpx;
  font-size: 36rpx;
  color: #999;
  padding: 8rpx;
}

.popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 30rpx;
}

.popup-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx 20rpx;
}

.popup-option {
  padding: 16rpx 30rpx;
  border-radius: 40rpx;
  background-color: #f5f5f5;
  height: 66rpx;
  display: flex;
  align-items: center;
  box-sizing: border-box;

  text {
    font-size: 28rpx;
    color: #333;
  }

  &.active {
    background-color: #FF6B9D;

    text {
      color: #fff;
    }
  }
}

.popup-footer {
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.popup-confirm {
  width: 100%;
  height: 88rpx;
  background-color: #FF6B9D;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 30rpx;
    color: #fff;
    font-weight: bold;
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
