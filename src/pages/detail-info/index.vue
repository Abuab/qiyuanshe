<template>
  <view class="detail-info-page">
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
          <view class="step-circle step-circle--active">
            <text>1</text>
          </view>
          <text class="step-label step-label--active">详细信息</text>
        </view>

        <!-- 虚线连接 1-2 -->
        <view class="step-line" />

        <view class="step-item">
          <view class="step-circle">
            <text>2</text>
          </view>
          <text class="step-label">择偶要求</text>
        </view>

        <!-- 虚线连接 2-3 -->
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
        <!-- 现居地 -->
        <view class="form-item" @tap="openCityPicker('residence')">
          <text class="form-label">现居地</text>
          <view class="form-value">
            <text :class="form.residence ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.residence || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 户籍地 -->
        <view class="form-item" @tap="openCityPicker('hometown')">
          <text class="form-label">户籍地</text>
          <view class="form-value">
            <text :class="form.hometown ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.hometown || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 体重 -->
        <view class="form-item" @tap="openSinglePicker('weight')">
          <text class="form-label">体重</text>
          <view class="form-value">
            <text :class="form.weight ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.weight || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 职业 -->
        <view class="form-item" @tap="showOccupationPopup = true">
          <text class="form-label">职业</text>
          <view class="form-value">
            <text :class="form.occupation ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.occupation || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 独生子女 -->
        <view class="form-item" @tap="openSinglePicker('onlyChild')">
          <text class="form-label">独生子女</text>
          <view class="form-value">
            <text :class="form.onlyChild ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.onlyChild || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 何时结婚 -->
        <view class="form-item" @tap="openSinglePicker('whenMarry')">
          <text class="form-label">何时结婚</text>
          <view class="form-value">
            <text :class="form.whenMarry ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.whenMarry || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 买车情况 -->
        <view class="form-item" @tap="openSinglePicker('carStatus')">
          <text class="form-label">买车情况</text>
          <view class="form-value">
            <text :class="form.carStatus ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.carStatus || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 买房情况 -->
        <view class="form-item" @tap="openSinglePicker('housingStatus')">
          <text class="form-label">买房情况</text>
          <view class="form-value">
            <text :class="form.housingStatus ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.housingStatus || '请选择' }}
            </text>
            <text class="form-arrow">&gt;</text>
          </view>
        </view>

        <!-- 星座（自动计算，只读） -->
        <view class="form-item form-item--readonly">
          <text class="form-label">星座</text>
          <view class="form-value">
            <text class="form-value--selected">{{ form.constellation }}</text>
          </view>
        </view>

        <!-- 生肖（自动计算，只读） -->
        <view class="form-item form-item--readonly">
          <text class="form-label">生肖</text>
          <view class="form-value">
            <text class="form-value--selected">{{ form.zodiac }}</text>
          </view>
        </view>

        <!-- 我的特点 -->
        <view class="form-item" @tap="openTagPicker">
          <text class="form-label">我的特点</text>
          <view class="form-value">
            <text :class="form.personalityTags.length ? 'form-value--selected' : 'form-value--placeholder'">
              {{ form.personalityTags.length ? form.personalityTags.join('、') : '请选择' }}
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

    <!-- ========== 地址选择器（复用项目组件） ========== -->
    <CityPicker
      :visible="showCityPicker"
      :default-location="{ province: '山西省', city: '运城市' }"
      @confirm="onCityConfirm"
      @close="showCityPicker = false"
    />

    <!-- ========== 单列选择器（体重/独生子女/何时结婚/买车/买房） ========== -->
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

    <!-- ========== 职业选择弹窗 ========== -->
    <view
      v-if="showOccupationPopup"
      class="bottom-overlay"
      :class="{ 'bottom-overlay--in': occupationAnimIn }"
      @tap="showOccupationPopup = false"
    >
      <view
        class="bottom-panel"
        :class="{ 'bottom-panel--in': occupationAnimIn }"
        @tap.stop
      >
        <text class="bottom-panel-title">请选择职业</text>
        <scroll-view class="tag-cloud-wrap" scroll-y>
          <view class="tag-cloud">
            <view
              v-for="(opt, idx) in occupationOptions"
              :key="idx"
              class="tag-cloud-item"
              :class="{ 'tag-cloud-item--active': form.occupation === opt }"
              @tap="selectOccupation(opt)"
            >
              <text>{{ opt }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="bottom-panel-safe" />
      </view>
    </view>

    <!-- ========== 我的特点标签多选弹窗 ========== -->
    <view
      v-if="showTagPopup"
      class="bottom-overlay"
      :class="{ 'bottom-overlay--in': tagAnimIn }"
      @tap="closeTagPicker"
    >
      <view
        class="bottom-panel bottom-panel--tag"
        :class="{ 'bottom-panel--in': tagAnimIn }"
        @tap.stop
      >
        <!-- 顶部粉色提示（选择标签后消失） -->
        <view v-if="!tempTags.length" class="tag-hint">
          <text class="tag-hint-text">系统将根据所选标签生成个人简介</text>
          <text class="tag-hint-text">建议每个类型至少选择3项</text>
        </view>

        <!-- 已选标签区 -->
        <scroll-view v-if="tempTags.length" class="tag-selected-wrap" scroll-x>
          <view
            v-for="(tag, idx) in tempTags"
            :key="idx"
            class="tag-selected-item"
            @tap="toggleTag(tag)"
          >
            <text class="tag-selected-name">{{ tag }}</text>
            <text class="tag-selected-close">×</text>
          </view>
        </scroll-view>

        <!-- Tab 切换 -->
        <view class="tag-tabs">
          <view
            v-for="tab in personalityTabs"
            :key="tab.key"
            class="tag-tab"
            :class="{ 'tag-tab--active': activeTagTab === tab.key }"
            @tap="activeTagTab = tab.key"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>

        <!-- 标签云 -->
        <scroll-view class="tag-cloud-wrap" scroll-y>
          <view class="tag-cloud">
            <view
              v-for="(tag, idx) in currentTagOptions"
              :key="idx"
              class="tag-cloud-item"
              :class="{ 'tag-cloud-item--active': tempTags.includes(tag) }"
              @tap="toggleTag(tag)"
            >
              <text>{{ tag }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- 确定按钮 -->
        <view class="tag-confirm-area">
          <view class="tag-confirm-btn" @tap="confirmTagPicker">
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
import CityPicker from '@/components/city-picker/city-picker.vue'

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

// ========== 星座/生肖计算 ==========
const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

const CONSTELLATION_RULES: { name: string; mStart: number; dStart: number; mEnd: number; dEnd: number }[] = [
  { name: '白羊座', mStart: 3, dStart: 21, mEnd: 4, dEnd: 19 },
  { name: '金牛座', mStart: 4, dStart: 20, mEnd: 5, dEnd: 20 },
  { name: '双子座', mStart: 5, dStart: 21, mEnd: 6, dEnd: 21 },
  { name: '巨蟹座', mStart: 6, dStart: 22, mEnd: 7, dEnd: 22 },
  { name: '狮子座', mStart: 7, dStart: 23, mEnd: 8, dEnd: 22 },
  { name: '处女座', mStart: 8, dStart: 23, mEnd: 9, dEnd: 22 },
  { name: '天秤座', mStart: 9, dStart: 23, mEnd: 10, dEnd: 23 },
  { name: '天蝎座', mStart: 10, dStart: 24, mEnd: 11, dEnd: 22 },
  { name: '射手座', mStart: 11, dStart: 23, mEnd: 12, dEnd: 21 },
  { name: '摩羯座', mStart: 12, dStart: 22, mEnd: 1, dEnd: 19 },
  { name: '水瓶座', mStart: 1, dStart: 20, mEnd: 2, dEnd: 18 },
  { name: '双鱼座', mStart: 2, dStart: 19, mEnd: 3, dEnd: 20 },
]

const calcConstellation = (month: number, day: number): string => {
  for (const c of CONSTELLATION_RULES) {
    if (c.mStart === 12 && c.mEnd === 1) {
      if ((month === 12 && day >= c.dStart) || (month === 1 && day <= c.dEnd)) return c.name
      continue
    }
    if ((month === c.mStart && day >= c.dStart) || (month === c.mEnd && day <= c.dEnd)) return c.name
  }
  return ''
}

const calcZodiac = (year: number): string => {
  return ZODIACS[(year - 4) % 12]
}

// ========== 表单数据 ==========
const form = reactive({
  residence: '',
  hometown: '',
  weight: '',
  occupation: '',
  onlyChild: '',
  whenMarry: '',
  carStatus: '',
  housingStatus: '',
  constellation: '',
  zodiac: '',
  personalityTags: [] as string[],
})

// 从 store 读取生日并计算星座/生肖
onMounted(() => {
  const info = userStore.userInfo
  let year = info?.birthYear || 0
  let month = (info as any)?.birthMonth || 0
  let day = (info as any)?.birthDay || 0

  // 若 store 中无拆分字段，尝试从 birthday 字符串解析
  if (!year && (info as any)?.birthday) {
    const parts = ((info as any).birthday as string).split('-')
    if (parts.length === 3) {
      year = parseInt(parts[0])
      month = parseInt(parts[1])
      day = parseInt(parts[2])
    }
  }

  if (year && month && day) {
    form.constellation = calcConstellation(month, day)
    form.zodiac = calcZodiac(year)
  }

  // 自动填充已有数据
  if (info) {
    form.residence = (info.residence || '').replace(/\//g, ',')
    form.hometown = (info.hometown || '').replace(/\//g, ',')
    if (info.weight) form.weight = info.weight + 'kg'
    if (info.occupation) form.occupation = info.occupation
    if (info.onlyChild) form.onlyChild = info.onlyChild
    if (info.whenMarry) form.whenMarry = info.whenMarry
    if (info.carStatus) form.carStatus = info.carStatus
    if (info.housingStatus) form.housingStatus = info.housingStatus
    if (info.personalityTags) {
      form.personalityTags = Array.isArray(info.personalityTags) ? info.personalityTags : (info.personalityTags as string).split(',')
    }
  }
})

// ========== 地址选择器 ==========
const showCityPicker = ref(false)
const cityTarget = ref<'residence' | 'hometown'>('residence')

const openCityPicker = (target: 'residence' | 'hometown') => {
  cityTarget.value = target
  showCityPicker.value = true
}

const onCityConfirm = (value: string, _ids: number[]) => {
  form[cityTarget.value] = value
  showCityPicker.value = false
}

// ========== 单列选择器 ==========
const singlePickerVisible = ref(false)
const singlePickerAnimIn = ref(false)
const singlePickerType = ref('')
const singleTempValue = ref('')

const singleOptionMap: Record<string, string[]> = {
  weight: ['40kg以下', ...Array.from({ length: 61 }, (_, i) => (40 + i) + 'kg')],
  onlyChild: ['是', '否'],
  whenMarry: ['认同闪婚', '一年内结婚', '两年内结婚', '三年内结婚', '时机成熟就结婚'],
  carStatus: ['需要时可购车', '已购车有贷款', '已买车', '未买车'],
  housingStatus: ['和家人同住', '已购房', '租房', '婚后购房'],
}

const singleFieldMap: Record<string, keyof typeof form> = {
  weight: 'weight',
  onlyChild: 'onlyChild',
  whenMarry: 'whenMarry',
  carStatus: 'carStatus',
  housingStatus: 'housingStatus',
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
  if (field) { (form as any)[field] = opt }
  closeSinglePicker()
}

// ========== 职业选择弹窗 ==========
const DEFAULT_OCCUPATION = [
  '事业编','中学老师','小学老师','幼师','服务行业','保险','老师','药剂师',
  '设计','运营','个体工商户','普通职员','银行','工程','财务','技术',
  '餐饮','体制内','事业单位','销售','公务员','国企职员','工程师','银行职员',
  '个体户','老板创业者','公司职员','公司高管','律师','设计师','IT从业者','客服','人事',
  '财务会计','军人','服务业','教师','医生','护士','警察','其他',
]

const occupationOptions = computed(() => (systemStore.dicts.occupation as string[]) || DEFAULT_OCCUPATION)
const showOccupationPopup = ref(false)
const occupationAnimIn = ref(false)

const selectOccupation = (opt: string) => {
  form.occupation = opt
  occupationAnimIn.value = false
  setTimeout(() => { showOccupationPopup.value = false }, 200)
}

// 监听弹窗显示触发动画
watch(showOccupationPopup, (val) => {
  if (val) setTimeout(() => { occupationAnimIn.value = true }, 20)
  else occupationAnimIn.value = false
})

// ========== 我的特点标签多选弹窗 ==========
const DEFAULT_PERSONALITY_TAGS: Record<string, string[]> = {
  character: [
    '话痨', '社牛', '慢热', '敏感', '闷骚', '佛系', '有强迫症', '热爱工作',
    '关注细节', '比较乖', '没心机', '笑点低', '真诚靠谱', '乐观自信', '调皮可爱',
    '温柔体贴', '贤惠顾家', '严谨细心', '智慧颜值并存', '爱玩爱闹', '勤奋好学',
    '风趣幽默', '有气质', '御姐范', '敢爱敢恨', '有选择恐惧症', '喜欢宅',
    '大方直率', '善解人意', '有完美主义', '知书达理', '有点社恐', '欢乐逗比',
    '外冷内热', '斯文内敛', '开朗积极', '淳朴憨厚',
  ],
  hobby: [
    '剧本杀', '玩游戏', '二次元', '看动漫', '看小说', '美食', '自驾游',
    '听音乐', '看电影', '爱追剧', 'K歌', '看书', '逛街', '宠物', '厨艺',
    '旅行', '运动', '户外爬山', '跑步', '精致生活',
  ],
  loveRule: [
    '接受姐弟恋', '绝不做舔狗', '接受异地恋', '信一见钟情', '拒绝异地恋',
    '宁缺也毋滥', '喜欢被照顾', '恋爱以结婚为目的', '拒大男子主义',
  ],
}

const personalityTabs = [
  { key: 'character' as const, label: '性格' },
  { key: 'hobby' as const, label: '爱好' },
  { key: 'loveRule' as const, label: '恋爱准则' },
]

const personalityTagMap = computed<Record<string, string[]>>(() =>
  (systemStore.dicts.personalityTags as Record<string, string[]>) || DEFAULT_PERSONALITY_TAGS
)

const activeTagTab = ref<'character' | 'hobby' | 'loveRule'>('character')
const currentTagOptions = computed(() => personalityTagMap.value[activeTagTab.value] || [])

const showTagPopup = ref(false)
const tagAnimIn = ref(false)
const tempTags = ref<string[]>([])

watch(showTagPopup, (val) => {
  if (val) setTimeout(() => { tagAnimIn.value = true }, 20)
  else tagAnimIn.value = false
})

const openTagPicker = () => {
  tempTags.value = [...form.personalityTags]
  activeTagTab.value = 'character'
  showTagPopup.value = true
}

const closeTagPicker = () => {
  tagAnimIn.value = false
  setTimeout(() => { showTagPopup.value = false }, 200)
}

const toggleTag = (tag: string) => {
  const idx = tempTags.value.indexOf(tag)
  if (idx > -1) {
    tempTags.value.splice(idx, 1)
  } else {
    if (tempTags.value.length >= 8) {
      showToast('最多选择8项')
      return
    }
    tempTags.value.push(tag)
  }
}

const confirmTagPicker = () => {
  form.personalityTags = [...tempTags.value]
  closeTagPicker()
}

// ========== 提交 ==========
const handleSubmit = async () => {
  const requiredFields = [
    { key: 'residence', label: '现居地' },
    { key: 'hometown', label: '户籍地' },
    { key: 'weight', label: '体重' },
    { key: 'occupation', label: '职业' },
    { key: 'onlyChild', label: '独生子女' },
    { key: 'whenMarry', label: '何时结婚' },
    { key: 'carStatus', label: '买车情况' },
    { key: 'housingStatus', label: '买房情况' },
  ]

  for (const f of requiredFields) {
    if (!form[f.key as keyof typeof form]) {
      showToast('请完善所有信息')
      return
    }
  }
  if (!form.personalityTags.length) {
    showToast('请完善所有信息')
    return
  }

  try {
    const weightNum = parseInt(form.weight.replace('kg', '')) || 0
    await post('/users/profile', {
      residence: form.residence,
      hometown: form.hometown,
      weight: weightNum,
      occupation: form.occupation.trim(),
      onlyChild: form.onlyChild,
      whenMarry: form.whenMarry,
      carStatus: form.carStatus,
      housingStatus: form.housingStatus,
      personalityTags: form.personalityTags.join(','),
    })

    // 同步更新 store
    userStore.updateProfile({
      residence: form.residence,
      hometown: form.hometown,
      weight: weightNum,
      occupation: form.occupation.trim(),
      onlyChild: form.onlyChild,
      whenMarry: form.whenMarry,
      carStatus: form.carStatus,
      housingStatus: form.housingStatus,
      personalityTags: form.personalityTags.join(','),
    })

    showToast('保存成功', 'success')
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/mate-requirement/index' })
    }, 800)
  } catch (err: any) {
    console.error('[detail-info] 提交失败:', err?.message || err)
  }
}

const handleSkip = () => {
  uni.navigateTo({ url: '/pages/mate-requirement/index' })
}
</script>

<style lang="scss" scoped>
.detail-info-page {
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
.nav-back { font-size: 36rpx; color: #333; width: 80rpx; }
.nav-title { font-size: 34rpx; font-weight: bold; color: #333; }
.nav-placeholder { width: 80rpx; }

// ========== 内容区 ==========
.page-content { flex: 1; height: 100vh; box-sizing: border-box; }

// ========== 三步进度指示器 ==========
.steps-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 32rpx 60rpx;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.step-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #E0E0E0;
  display: flex;
  align-items: center;
  justify-content: center;
  text { font-size: 28rpx; color: #ffffff; font-weight: bold; }
}

.step-circle--active {
  background: #FF4D6A;
}

.step-label {
  font-size: 28rpx;
  color: #999999;
}

.step-label--active {
  color: #FF4D6A;
}

.step-line {
  flex: 1;
  height: 2rpx;
  margin: 0 12rpx;
  margin-bottom: 52rpx;
  border-top: 2rpx dashed #CCCCCC;
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
  &:active { background: #f9f9f9; }
}

.form-item--readonly {
  &:active { background: #ffffff; }
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

// ========== 底部提示 ==========
.bottom-tip {
  padding: 32rpx 32rpx 0;
  text { font-size: 24rpx; color: #999999; line-height: 1.5; }
}

// ========== 下一步按钮 ==========
.submit-btn-area {
  padding: 40rpx 60rpx 0;
}
.submit-btn {
  height: 96rpx;
  background: #FF4D6A;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  text { font-size: 32rpx; font-weight: bold; color: #ffffff; }
  &:active { opacity: 0.85; }
}

// ========== 暂时跳过 ==========
.skip-btn {
  margin-top: 24rpx;
  text-align: center;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  padding-bottom: 40rpx;
  text {
    font-size: 28rpx;
    color: #CCCCCC;
    text-decoration: underline;
  }
  &:active { text { color: #999999; } }
}

// ========== 底部安全区 ==========
.safe-bottom {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  min-height: 40rpx;
}

// ========== 单列选择器弹窗 ==========
.picker-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 200ms ease-out;
  &--in { opacity: 1; }
}
.picker-box {
  width: 480rpx; max-height: 720rpx;
  background: #ffffff; border-radius: 24rpx;
  display: flex; flex-direction: column;
  padding: 24rpx 0;
  transform: scale(0.9); opacity: 0; transition: all 200ms ease-out;
  &--in { transform: scale(1); opacity: 1; }
}
.picker-title {
  font-size: 32rpx; font-weight: bold; color: #333333;
  text-align: center; padding-bottom: 16rpx;
}
.picker-options { max-height: 600rpx; }
.picker-option {
  height: 88rpx;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 30rpx; color: #333333; }
  &:active { background: #f5f5f5; }
}
.picker-option--active {
  background: #FFF5F7;
  text { color: #FF4D6A; }
}

// ========== 底部弹窗通用（职业/标签） ==========
.bottom-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  z-index: 1000; background: rgba(0, 0, 0, 0.6);
  opacity: 0; transition: opacity 200ms ease-out;
  &--in { opacity: 1; }
}
.bottom-panel {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  transform: translateY(100%); transition: transform 200ms ease-out;
  &--in { transform: translateY(0); }
  display: flex; flex-direction: column;
  max-height: 75vh;
}
.bottom-panel-title {
  font-size: 32rpx; font-weight: bold; color: #333333;
  text-align: center; padding: 24rpx 0 16rpx;
}
.bottom-panel-safe {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}

// 标签云
.tag-cloud-wrap {
  flex: 1;
  min-height: 0;
  padding: 0 24rpx;
}
.tag-cloud {
  display: flex; flex-wrap: wrap;
  gap: 16rpx; padding: 8rpx 0;
}
.tag-cloud-item {
  padding: 14rpx 28rpx;
  border-radius: 48rpx;
  background: #F5F5F5;
  text { font-size: 26rpx; color: #666666; }
  &:active { opacity: 0.8; }
}
.tag-cloud-item--active {
  background: #FF4D6A;
  text { color: #ffffff; }
}

// ========== 标签弹窗特有样式 ==========
.bottom-panel--tag { max-height: 80vh; }

.tag-hint {
  padding: 16rpx 32rpx 12rpx;
  display: flex; flex-direction: column; align-items: center;
}
.tag-hint-text {
  font-size: 24rpx; color: #FF4D6A; line-height: 1.6;
}

.tag-selected-wrap {
  padding: 12rpx 24rpx;
  white-space: nowrap;
  height: auto;
  max-height: 120rpx;
}
.tag-selected-item {
  display: inline-flex; align-items: center;
  background: #FF4D6A;
  border-radius: 48rpx;
  padding: 8rpx 16rpx;
  margin-right: 12rpx;
}
.tag-selected-name {
  font-size: 24rpx; color: #ffffff;
  margin-right: 6rpx;
}
.tag-selected-close {
  font-size: 24rpx; color: #ffffff; font-weight: bold;
}

.tag-tabs {
  display: flex; border-bottom: 1rpx solid #eee;
  padding: 0 24rpx;
}
.tag-tab {
  flex: 1; text-align: center;
  padding: 20rpx 0;
  position: relative;
  text { font-size: 28rpx; color: #666666; }
}
.tag-tab--active {
  text { color: #FF4D6A; font-weight: bold; }
  &::after {
    content: '';
    position: absolute; bottom: 0; left: 50%;
    transform: translateX(-50%);
    width: 60rpx; height: 4rpx;
    background: #FF4D6A; border-radius: 2rpx;
  }
}

.tag-confirm-area {
  padding: 24rpx 32rpx;
}
.tag-confirm-btn {
  height: 88rpx;
  background: #FF4D6A;
  border-radius: 48rpx;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 30rpx; font-weight: bold; color: #ffffff; }
  &:active { opacity: 0.85; }
}
</style>
