<template>
  <view class="vip-page">
    <!-- ===== 顶部导航：两级导航栏 ===== -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <!-- 第一级：当前页面标题 + 返回 -->
      <view class="nav-level1">
        <view class="nav-left" @tap="handleBack"><text class="back-icon">←</text></view>
        <text class="nav-title">{{ currentTabLabel }}</text>
        <view class="nav-right"></view>
      </view>
      <!-- 第二级：Tab 切换栏 -->
      <view class="nav-level2">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="nav-tab"
          :class="{ active: activeTab === tab.key }"
          @tap="switchTab(tab.key)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- VIP 会员 Tab -->
    <scroll-view
      v-if="activeTab === 'vip'"
      class="tab-content"
      scroll-y
      :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px', paddingBottom: '300rpx' }"
    >
      <!-- 资料置顶（VIP 置顶卡） -->
      <view v-if="systemStore.vipEnabled" class="topcard-card" @tap="handleUseTopCard">
        <view class="topcard-left">
          <text class="topcard-title">资料置顶</text>
          <text class="topcard-desc">{{ topCardDesc }}</text>
        </view>
        <view class="topcard-btn" :class="{ 'topcard-btn-disabled': topCardBtnDisabled }">
          <text>{{ topCardBtnText }}</text>
        </view>
      </view>

      <!-- 套餐选择 -->
      <view class="packages-section">
        <text class="section-title">会员套餐</text>
        <view class="packages-list">
          <view
            v-for="pkg in packages"
            :key="pkg.id"
            class="package-card"
            :class="{ selected: selectedPackageId === pkg.id }"
            @tap="selectPackage(pkg)"
          >
            <view class="card-tag" v-if="pkg.tagText" :style="{ background: pkg.tagColor || '#FF6B9D' }">
              <text>{{ pkg.tagText }}</text>
            </view>
            <text class="card-name">{{ pkg.name }}</text>
            <text class="card-desc">{{ pkg.description || pkg.name }}</text>
            <view class="card-price">
              <text class="price-symbol">¥</text>
              <text class="price-value">{{ formatPrice(pkg.price) }}</text>
            </view>
            <view class="card-redline" v-if="pkg.redLineCount > 0">
              <text>含{{ pkg.redLineCount }}根{{ redLineTerm }}</text>
            </view>
            <view class="card-features" v-if="pkg.features && pkg.features.length">
              <text v-for="(f, i) in pkg.features" :key="i" class="feature-tag">{{ f }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 安全征婚提示 -->
      <view class="safety-tips">
        <text class="tips-title">安全征婚提示</text>
        <view class="tips-list">
          <text class="tips-intro">在以下情况下请不要轻易透露你的联系方式（如：电话、手机号码、邮箱、即时通信、通信地址等）</text>
          <text class="tip-item">1. 在未充分了解对方前，请不要轻易透露你的联系方式。</text>
          <text class="tip-item">2. 当对方无相片或资料填写不完整时，请不要轻易透露你的联系方式。</text>
          <text class="tip-item">3. 相亲过程中，如遇对方提及借款、投资或索要礼物等行为，请务必提高警惕，谨防受骗，并及时举报。</text>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 定制会员 Tab（纯 CSS 图标，无图片/emoji） -->
    <scroll-view
      v-if="activeTab === 'custom'"
      class="tab-content"
      scroll-y
      :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px', paddingBottom: '140rpx' }"
    >
      <!-- Banner -->
      <view class="custom-banner" v-if="customConfig.bannerUrl">
        <image :src="customConfig.bannerUrl" mode="widthFix" class="banner-img" />
      </view>

      <!-- 模块一：哪些人适合1对1定制服务 -->
      <view class="cd-card">
        <text class="cd-card-title">{{ customConfig.suitableTitle || '哪些人适合1对1定制服务' }}</text>
        <view class="cd-grid">
          <view class="cd-item" v-for="(item, idx) in customConfig.suitableList" :key="idx">
            <!-- 图标1: 晕眩表情 -->
            <view v-if="idx === 0" class="cd-circ cd-circ-red">
              <view class="cd-dizzy">
                <view class="dz-dot dz-left-dot"></view>
                <view class="dz-dot dz-right-dot"></view>
                <view class="dz-mouth"></view>
              </view>
            </view>
            <!-- 图标2: 指南针 -->
            <view v-else-if="idx === 1" class="cd-circ cd-circ-orange">
              <view class="cd-compass">
                <view class="cp-diamond"></view>
                <view class="cp-center"></view>
                <view class="cp-tick cp-t1"></view>
                <view class="cp-tick cp-t2"></view>
                <view class="cp-tick cp-t3"></view>
                <view class="cp-tick cp-t4"></view>
              </view>
            </view>
            <!-- 图标3: 人形铃铛 -->
            <view v-else-if="idx === 2" class="cd-circ cd-circ-pink">
              <view class="cd-bell">
                <view class="bl-head"></view>
                <view class="bl-body"></view>
                <view class="bl-bottom"></view>
              </view>
            </view>
            <!-- 图标4: 盾牌对勾 -->
            <view v-else class="cd-circ cd-circ-purple">
              <view class="cd-shield">
                <view class="sh-body"><view class="sh-check"></view></view>
              </view>
            </view>
            <text class="cd-name">{{ item.name }}</text>
            <text class="cd-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 模块二：专属服务 祝你脱单 -->
      <view class="cd-card">
        <text class="cd-card-title">{{ customConfig.serviceTitle || '专属服务 助你脱单' }}</text>
        <view class="cd-svc-list">
          <view class="cd-svc" v-for="(item, idx) in customConfig.serviceList" :key="'svc'+idx">
            <!-- 服务图标 -->
            <view v-if="idx === 0" class="cd-svc-icon cd-svc-grad-pink">
              <view class="si-target"><view class="tg-ring1"></view><view class="tg-ring2"></view><view class="tg-core"></view></view>
            </view>
            <view v-else-if="idx === 1" class="cd-svc-icon cd-svc-grad-purple">
              <view class="si-smile">
                <view class="sm-eye sm-l"></view>
                <view class="sm-eye sm-r"></view>
                <view class="sm-mouth"></view>
              </view>
            </view>
            <view v-else-if="idx === 2" class="cd-svc-icon cd-svc-grad-blue">
              <view class="si-lock">
                <view class="lk-shackle"></view>
                <view class="lk-body"></view>
              </view>
            </view>
            <view v-else-if="idx === 3" class="cd-svc-icon cd-svc-grad-green">
              <view class="si-shield-bolt">
                <view class="sb-shield"><view class="sb-bolt"></view></view>
              </view>
            </view>
            <view v-else-if="idx === 4" class="cd-svc-icon cd-svc-grad-purple2">
              <view class="si-heart-check">
                <view class="hc-heart"></view>
                <view class="hc-check"></view>
              </view>
            </view>
            <view v-else-if="idx === 5" class="cd-svc-icon cd-svc-grad-red">
              <view class="si-redhead">
                <view class="rh-hair"></view>
                <view class="rh-bangs">
                  <view class="rh-bang"></view>
                  <view class="rh-bang"></view>
                  <view class="rh-bang"></view>
                </view>
                <view class="rh-face"></view>
                <view class="rh-body"></view>
              </view>
            </view>
            <view v-else-if="idx === 6" class="cd-svc-icon cd-svc-grad-green">
              <view class="si-person-pin">
                <view class="pp-head"></view>
                <view class="pp-body"></view>
                <view class="pp-pin"></view>
              </view>
            </view>
            <view v-else class="cd-svc-icon cd-svc-grad-blue">
              <view class="si-bubble-simple">
                <view class="bs-box"></view>
              </view>
            </view>
            <view class="cd-svc-text">
              <text class="cd-svc-name">{{ item.name }}</text>
              <text class="cd-svc-desc">{{ item.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 关于我们 Tab -->
    <scroll-view
      v-if="activeTab === 'about'"
      class="tab-content"
      scroll-y
      :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px', paddingBottom: '140rpx' }"
    >
      <!-- Banner -->
      <view class="about-banner" v-if="aboutConfig.bannerUrl">
        <image :src="aboutConfig.bannerUrl" mode="widthFix" class="banner-img" />
      </view>

      <!-- 平台特点（纯 CSS 绘制，无图片/emoji） -->
      <view class="pf-section" v-if="aboutConfig.title">
        <!-- 顶部波浪 + 星星 -->
        <view class="pf-waves">
          <view class="pf-wave pf-wave1"></view>
          <view class="pf-wave pf-wave2"></view>
          <view class="pf-wave pf-wave3"></view>
          <view class="pf-star pf-star1 pf-blink"></view>
          <view class="pf-star pf-star2"></view>
          <view class="pf-star pf-star3 pf-blink"></view>
          <view class="pf-star pf-star4"></view>
          <view class="pf-star pf-star5 pf-blink"></view>
          <view class="pf-star pf-star6"></view>
        </view>
        <!-- 中间爱心装饰 -->
        <view class="pf-hero">
          <view class="pf-heart"></view>
          <view class="pf-dots"><view class="pf-dot"></view><view class="pf-dot"></view></view>
        </view>
        <!-- 标题 -->
        <view class="pf-title">{{ aboutConfig.title }}</view>
        <view class="pf-line"></view>
        <!-- 卖点卡片 -->
        <view class="pf-list">
          <view class="pf-card" v-for="(item, idx) in aboutConfig.features" :key="idx">
            <view class="pf-icon">
              <view class="ic-house" v-if="idx % 4 === 0">
                <view class="h-sign"></view>
                <view class="h-roof"></view>
                <view class="h-body"><view class="h-door"></view></view>
              </view>
              <view class="ic-trophy" v-else-if="idx % 4 === 1">
                <view class="t-handle t-left"></view>
                <view class="t-handle t-right"></view>
                <view class="t-cup"></view>
                <view class="t-base"></view>
              </view>
              <view class="ic-chart" v-else-if="idx % 4 === 2">
                <view class="c-line c-line1"></view>
                <view class="c-line c-line2"></view>
                <view class="c-node c-node1"></view>
                <view class="c-node c-node2"></view>
                <view class="c-bar c-bar1"></view>
                <view class="c-bar c-bar2"></view>
                <view class="c-bar c-bar3"></view>
              </view>
              <view class="ic-couple" v-else>
                <view class="mini-heart"></view>
                <view class="person p-left"><view class="p-head"></view><view class="p-body"></view></view>
                <view class="person p-right"><view class="p-head"></view><view class="p-body"></view></view>
              </view>
            </view>
            <text class="pf-text">{{ item.name }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部支付栏（仅VIP会员Tab显示） -->
    <view v-if="activeTab === 'vip'" class="bottom-bar" :style="{ bottom: `calc(120rpx + ${safeAreaOffset}px)` }">
      <view class="bottom-price">
        <text class="price-label" v-if="selectedPackage">{{ vipActionLabel }}</text>
        <text class="price-total" v-if="selectedPackage">
          <text class="price-symbol-small">¥</text>
          <text class="price-number">{{ formatPrice(selectedPackage.price) }}</text>
        </text>
        <text class="price-total" v-else>请选择套餐</text>
      </view>
      <view class="pay-btn" :class="{ disabled: !selectedPackage }" @tap="handlePay">
        <text>{{ vipActionButtonText }}</text>
      </view>
    </view>
    <view v-if="activeTab === 'vip' && vipActionHint" class="bottom-hint" :style="{ bottom: `calc(120rpx + 58px + ${safeAreaOffset}px)` }">
      <text>{{ vipActionHint }}</text>
    </view>

    <tab-bar />
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabBar from '@/components/tab-bar/tab-bar.vue'
import { get, post, put } from '@/utils/request'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { safeNavigateBack } from '@/utils/navigate'

const userStore = useUserStore()
const systemStore = useSystemStore()

interface VipPackageItem {
  id: number
  name: string
  price: number
  durationDays: number
  dailyTopCards: number
  topCardValidHours: number
  redLineCount: number
  description: string
  features: string[]
  tagText?: string
  tagColor?: string
}

interface SuitableItem {
  icon: string
  name: string
  desc: string
  color?: string
}

interface ServiceItem {
  icon: string
  name: string
  desc: string
  color?: string
}

interface FeatureItem {
  icon: string
  name: string
  desc: string
  color?: string
}

// ===== 导航 =====
const statusBarHeight = ref(20)
const safeAreaOffset = ref(0)
const navBarHeightPx = ref(82) // 36px level1 + 46px level2

const tabs = computed(() => {
  const list: { key: string; label: string }[] = [
    { key: 'custom', label: '定制会员' },
    { key: 'about', label: '关于我们' },
  ]
  if (systemStore.vipEnabled && userStore.isLoggedIn) {
    list.unshift(
      { key: 'vip', label: 'VIP会员' },
    )
  }
  return list
})
const activeTab = ref(systemStore.vipEnabled && userStore.isLoggedIn ? 'vip' : 'custom')

const currentTabLabel = computed(() => {
  const tab = tabs.value.find(t => t.key === activeTab.value)
  return tab ? tab.label : '关于我们'
})

const redLineTerm = computed(() => systemStore.redLineTerm || '红线')

// VIP 续期/升级判断
const currentVipName = computed(() => userStore.userInfo?.vipPackageName || '')
const currentVipDays = computed(() => {
  if (!userStore.isVipValid) return 0
  // 从套餐列表中查找当前套餐的天数
  const pkg = packages.value.find(p => p.name === currentVipName.value)
  return pkg ? pkg.durationDays : 0
})
const vipActionLabel = computed(() => {
  if (!userStore.isVipValid) return ''
  if (!selectedPackage.value) return '续期/升级'
  if (selectedPackage.value.durationDays <= currentVipDays.value) return '续期'
  return '升级套餐'
})
const vipActionButtonText = computed(() => {
  if (!userStore.isVipValid) return '确认支付'
  if (!selectedPackage.value) return '选择套餐'
  if (selectedPackage.value.durationDays <= currentVipDays.value) return '确认续期'
  return '确认升级'
})
const vipActionHint = computed(() => {
  if (!userStore.isVipValid) return ''
  const pkgLabel = currentVipName.value || '会员'
  if (!selectedPackage.value) {
    return '当前为' + pkgLabel + '，可续期或选择更长套餐升级'
  }
  if (selectedPackage.value.durationDays <= currentVipDays.value) {
    return '当前为' + pkgLabel + '，续期后有效期将延长'
  }
  return '当前为' + pkgLabel + '，升级为新套餐后将按新套餐生效'
})

const selectPackage = (pkg: VipPackageItem) => {
  selectedPackageId.value = pkg.id
  selectedPackage.value = pkg
}

function switchTab(key: string) {
  activeTab.value = key
}

// ===== VIP 会员数据 =====
const packages = ref<VipPackageItem[]>([])
const selectedPackageId = ref<number | null>(null)
const selectedPackage = ref<VipPackageItem | null>(null)
const packagesLoading = ref(false)

function formatPrice(price: number): string {
  // 数据库存储单位为「分」（整数），展示时需除以 100 转为「元」
  const yuan = price / 100
  return yuan.toFixed(2)
}

async function fetchPackages() {
  packagesLoading.value = true
  try {
    const res: any = await get('/vip/packages')
    const list: VipPackageItem[] = res.list || res || []
    // 给套餐添加标签
    const tagConfigs = [
      { text: '推荐', color: '#FF6B9D' },
      { text: '热销', color: '#FF9500' },
      { text: '超值', color: '#722ED1' },
    ]
    packages.value = list.map((pkg, idx) => ({
      ...pkg,
      tagText: tagConfigs[idx]?.text || '',
      tagColor: tagConfigs[idx]?.color || '',
    }))
    // 默认选中第一个
    if (packages.value.length > 0) {
      selectPackage(packages.value[0])
    }
  } catch {
    // 接口失败时使用空列表
    packages.value = []
  } finally {
    packagesLoading.value = false
  }
}

// ===== 支付流程 =====
const paying = ref(false)

async function handlePay() {
  if (!selectedPackage.value || paying.value) return
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  paying.value = true
  try {
    uni.showLoading({ title: '创建订单...', mask: true })
    const orderResult: any = await post('/vip/orders', {
      packageId: selectedPackage.value.id,
    })

    if (orderResult.orderNo) {
      // 模拟支付成功
      const payResult: any = await put(`/vip/orders/${orderResult.orderNo}/pay`, {
        transactionId: 'MOCK_' + Date.now(),
      })
      uni.hideLoading()
      uni.showToast({ title: '支付成功，会员已激活', icon: 'success' })
      // 刷新用户会员状态
      userStore.checkVip()
      // 延迟跳转
      setTimeout(() => {
        uni.switchTab({ url: '/pages/my/index' })
      }, 1500)
    } else {
      uni.hideLoading()
      uni.showToast({ title: '创建订单失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e?.message || '支付失败', icon: 'none' })
  } finally {
    paying.value = false
  }
}

// ===== 定制会员配置数据（从后台获取，这里提供默认值兜底） =====
const customConfig = reactive({
  bannerUrl: '',
  suitableTitle: '哪些人适合1对1定制服务',
  suitableList: [
    { icon: '💼', name: '工作繁忙', desc: '没时间自己筛选', color: '#FFF0F3' },
    { icon: '🎯', name: '目标明确', desc: '想找特定类型', color: '#F0F0FF' },
    { icon: '🔒', name: '注重隐私', desc: '不愿公开信息', color: '#FFF8E1' },
    { icon: '⚡', name: '追求效率', desc: '希望快速脱单', color: '#E8F5E9' },
  ] as SuitableItem[],
  serviceTitle: '专属服务 助你脱单',
  serviceList: [
    { icon: '🎯', name: '精准1对1匹配', desc: '红娘根据您的条件精准筛选推荐', color: '#FFF0F3' },
    { icon: '💌', name: '红娘主动推荐', desc: '专业红娘主动为您匹配合适人选', color: '#F0F0FF' },
    { icon: '👑', name: '开放隐藏会员', desc: '解锁隐藏优质会员资料查看权限', color: '#FFF8E1' },
    { icon: '⭐', name: '优先优质配对', desc: '平台优先推荐优质匹配对象', color: '#E8F5E9' },
    { icon: '💡', name: '情感指导服务', desc: '专业情感顾问一对一指导', color: '#FCE4EC' },
    { icon: '📸', name: '个人形象提升', desc: '专业团队帮您打造最佳形象', color: '#E3F2FD' },
    { icon: '🤝', name: '线下约见服务', desc: '协助安排安全舒适的线下见面', color: '#FFF3E0' },
    { icon: '📊', name: '及时反馈结果', desc: '定期反馈匹配进展和优化建议', color: '#F3E5F5' },
  ] as ServiceItem[],
})

// ===== 关于我们配置数据 =====
const aboutConfig = reactive({
  bannerUrl: '',
  title: '平台特点',
  features: [
    { icon: '👥', name: '真实海量本地用户', desc: '严格审核机制，确保用户真实可靠', color: '#FFF0F3' },
    { icon: '🤝', name: '靠谱本地服务团队', desc: '专业红娘团队，深耕本地婚恋市场', color: '#F0F0FF' },
    { icon: '💍', name: '匹配资源丰富脱单效率高', desc: '海量优质资源，智能匹配快速脱单', color: '#FFF8E1' },
    { icon: '👑', name: '私人定制专享红娘服务', desc: '一对一专属服务，全程陪伴指导', color: '#E8F5E9' },
  ] as FeatureItem[],
})

// 尝试从后台加载配置
async function fetchCustomConfig() {
  try {
    const res: any = await get('/vip/custom-config')
    if (res) {
      if (res.bannerUrl) customConfig.bannerUrl = res.bannerUrl
      if (res.suitableTitle) customConfig.suitableTitle = res.suitableTitle
      if (res.suitableList?.length) customConfig.suitableList = res.suitableList
      if (res.serviceTitle) customConfig.serviceTitle = res.serviceTitle
      if (res.serviceList?.length) customConfig.serviceList = res.serviceList
    }
  } catch {
    // 使用默认配置
  }
}

async function fetchAboutConfig() {
  try {
    const res: any = await get('/vip/about-config')
    if (res) {
      if (res.bannerUrl) aboutConfig.bannerUrl = res.bannerUrl
      if (res.title) aboutConfig.title = res.title
      if (res.features?.length) aboutConfig.features = res.features
    }
  } catch {
    // 使用默认配置
  }
}

// ===== 安全征婚提示（固定文案） =====

function handleBack() {
  safeNavigateBack()
}

const fetchPackagesAndProfile = async () => {
  await fetchPackages()
  // 刷新用户信息以获取最新 vipPackageName 和 VIP 状态
  if (userStore.isLoggedIn) {
    try {
      const res: any = await get('/auth/profile')
      if (res) {
        // 先更新 userInfo（含 vipPackageName、avatar、updatedAt）
        userStore.updateProfile({ ...res, vipPackageName: res.vipPackageName || '' })
        // 同步更新 VIP 状态 ref，确保 isVipValid 生效
        userStore.updateUserInfo({
          isVip: !!res.isVip,
          vipExpireTime: res.vipExpireTime || '',
          vipPackageName: res.vipPackageName || '',
        })
      }
    } catch (_) { /* 忽略 */ }
  }
}

// ===== 生命周期 =====
// ===== 资料置顶卡（VIP 置顶卡） =====
const topCardStatus = ref<{
  todayRemaining: number
  todayTotal: number
  todayUsed: number
  isPinned: boolean
  pinnedUntil: string | null
}>({ todayRemaining: 0, todayTotal: 0, todayUsed: 0, isPinned: false, pinnedUntil: null })
const topCardUsing = ref(false)

const formatPinnedUntil = (v: string | null): string => {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const topCardDesc = computed(() => {
  if (topCardStatus.value.isPinned) {
    return `置顶中，有效期至 ${formatPinnedUntil(topCardStatus.value.pinnedUntil)}`
  }
  if (!userStore.isVipValid) return '开通会员后可置顶资料，获得更多曝光'
  if (topCardStatus.value.todayRemaining > 0) {
    return `今日剩余 ${topCardStatus.value.todayRemaining} 次，置顶后优先展示给更多异性`
  }
  return '今日置顶次数已用完，明天再来吧'
})

const topCardBtnText = computed(() => {
  if (topCardStatus.value.isPinned) return '置顶中'
  if (!userStore.isVipValid) return '未开通'
  if (topCardStatus.value.todayRemaining <= 0) return '已用完'
  return '立即置顶'
})

// 未开通 / 置顶中 / 当日已用完 → 按钮置灰
const topCardBtnDisabled = computed(() =>
  topCardStatus.value.isPinned || !userStore.isVipValid || topCardStatus.value.todayRemaining <= 0,
)

const loadTopCardStatus = async () => {
  if (!userStore.isLoggedIn || !systemStore.vipEnabled) return
  try {
    const res: any = await get('/vip/top-card/status')
    if (res) {
      topCardStatus.value = {
        todayRemaining: res.todayRemaining ?? 0,
        todayTotal: res.todayTotal ?? 0,
        todayUsed: res.todayUsed ?? 0,
        isPinned: !!res.isPinned,
        pinnedUntil: res.pinnedUntil || null,
      }
    }
  } catch { /* 静默失败，不打断页面 */ }
}

const handleUseTopCard = async () => {
  if (!userStore.isLoggedIn) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
  // 未开通会员 → 引导在下方选择套餐
  if (!userStore.isVipValid) { uni.showToast({ title: '请在下方选择套餐开通会员后使用', icon: 'none' }); return }
  // 已在置顶中 → 提示有效期，不重复消耗
  if (topCardStatus.value.isPinned) {
    uni.showToast({ title: `置顶中，有效期至 ${formatPinnedUntil(topCardStatus.value.pinnedUntil)}`, icon: 'none' })
    return
  }
  // 今日次数已用完 → 直接提示，避免无谓的失败请求
  if (topCardStatus.value.todayRemaining <= 0) {
    uni.showToast({ title: '今日置顶次数已用完，明天再来吧', icon: 'none' })
    return
  }
  if (topCardUsing.value) return
  topCardUsing.value = true
  try {
    const res: any = await post('/vip/top-card/use')
    if (res && res.pinnedUntil) {
      uni.showToast({ title: '置顶成功', icon: 'success' })
    } else {
      // data 为 null → 功能维护中
      uni.showToast({ title: '功能维护中，请稍后再试', icon: 'none' })
    }
  } catch { /* request 层已弹出后端错误信息（如今日已用完/会员过期） */ } finally {
    await loadTopCardStatus()
    topCardUsing.value = false
  }
}

onMounted(() => {
  const systemInfo = uni.getWindowInfo()
  statusBarHeight.value = systemInfo.statusBarHeight || 20

  // 安全区偏移，与 tab-bar 组件保持一致（Android 陀螺仪导航栏预留28px）
  const sysInfo: any = uni.getSystemInfoSync()
  const raw = sysInfo.safeAreaInsets?.bottom ?? 0
  safeAreaOffset.value = raw > 0 ? raw : (sysInfo.platform === 'android' ? 28 : 0)

  fetchPackagesAndProfile()
  fetchCustomConfig()
  fetchAboutConfig()
  loadTopCardStatus()
})

onShow(() => {
  fetchPackagesAndProfile()
  loadTopCardStatus()
})
</script>

<style lang="scss" scoped>
// ===== 全局 =====
.vip-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFE4EC 0%, #FFF0F5 40%, #FFF8FA 100%);
  display: flex;
  flex-direction: column;
}

// ===== 导航栏 =====
.nav-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(180deg, #FFE4EC 0%, #FFE4EC 60%, #FFF0F5 100%);
  box-shadow: none;
}

// 第一级：标题行
.nav-level1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 16px;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 400;
  color: #333;
  text-align: center;
  flex: 1;
}

.nav-left,
.nav-right {
  width: 60px;
  flex-shrink: 0;
}

.nav-left {
  display: flex;
  align-items: center;
}

.back-icon {
  font-size: 18px;
  color: #333;
  font-weight: bold;
}

// 第二级：Tab 切换行
.nav-level2 {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 46px;
  padding: 0 12px;
  gap: 0;
}

.nav-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  position: relative;

  text {
    font-size: 14px;
    color: #999;
    font-weight: 400;
    white-space: nowrap;
    transition: color 0.25s;
  }

  &.active {
    text {
      color: #333;
      font-weight: 700;
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      width: 32px;
      height: 3px;
      background: #FF6B9D;
      border-radius: 2px;
    }
  }
}

// ===== 内容区 =====
.tab-content {
  flex: 1;
  overflow: hidden;
}

// ===== VIP 会员 - 头部特权 =====
.header-section {
  padding: 20px 20px 16px;
}

.header-title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin-bottom: 20px;
}

.benefits-row {
  display: flex;
  justify-content: space-around;
}

.benefit-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.benefit-label {
  font-size: 12px;
  color: #666;
}

// ===== 套餐选择 =====
.packages-section {
  padding: 0 20px 20px;
}

// ===== 资料置顶卡（VIP 置顶卡） =====
.topcard-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 20px 16px;
  padding: 24rpx;
  background: linear-gradient(135deg, #FFF0F3 0%, #FFE3EC 100%);
  border-radius: 16rpx;
}

.topcard-left {
  flex: 1;
  min-width: 0;
  padding-right: 16rpx;
}

.topcard-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 6rpx;
}

.topcard-desc {
  font-size: 22rpx;
  color: #B0748A;
  line-height: 1.4;
}

.topcard-btn {
  flex-shrink: 0;
  min-width: 128rpx;
  height: 56rpx;
  padding: 0 24rpx;
  border-radius: 28rpx;
  background: linear-gradient(90deg, #FFA0B9 0%, #FF5B84 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 24rpx;
    color: #fff;
    font-weight: bold;
  }
}

.topcard-btn-disabled {
  background: #E5C3CE;
}

.section-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin-bottom: 16px;
}

.packages-scroll {
  width: 100%;
}

.packages-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0;
}

.package-card {
  position: relative;
  width: 100%;
  padding: 28px 20px 24px;
  background: #fff;
  border: 2px solid #f0f0f0;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.25s;

  &.selected {
    border-color: #FF6B9D;
    background: #FFF5F7;
    box-shadow: 0 2px 12px rgba(255, 107, 157, 0.15);
  }
}

.card-tag {
  position: absolute;
  top: -1px;
  right: -1px;
  padding: 2px 10px;
  border-radius: 0 12px 0 8px;

  text {
    font-size: 11px;
    color: #fff;
    font-weight: 600;
  }
}

.card-name {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin-top: 4px;
  margin-bottom: 6px;
}

.card-desc {
  font-size: 13px;
  color: #555;
  font-weight: 500;
  text-align: center;
  margin-bottom: 12px;
  line-height: 1.5;
  word-break: break-all;
}

.card-price {
  display: flex;
  align-items: baseline;
  margin-bottom: 8px;
}

.card-redline {
  margin-bottom: 10px;
  padding: 4px 12px;
  background: #FFF0F3;
  border-radius: 4px;

  text {
    font-size: 12px;
    color: #FF6B9D;
    font-weight: 600;
  }
}

.price-symbol {
  font-size: 14px;
  color: #FF6B9D;
  font-weight: 700;
}

.price-value {
  font-size: 28px;
  font-weight: 800;
  color: #FF6B9D;
  line-height: 1;
}

.card-features {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  width: 100%;
}

.feature-tag {
  font-size: 10px;
  color: #FF6B9D;
  background: #FFF0F3;
  padding: 2px 8px;
  border-radius: 4px;
}

// ===== 支付方式 =====
.payment-section {
  padding: 20px;
  margin-bottom: 12px;
}

.payment-method {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: #FFF5F7;
  border: 1.5px solid #FF6B9D;
  border-radius: 10px;
}

.wechat-icon {
  width: 36px;
  height: 36px;
  background: #07C160;
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.method-name {
  flex: 1;
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.check-mark {
  color: #FF6B9D;
  font-size: 18px;
  font-weight: 700;
}

// ===== 安全提示 =====
.safety-tips {
  margin: 12px 20px;
  padding: 16px;
  background: #F5F5F5;
  border-radius: 10px;
}

.tips-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #888;
  margin-bottom: 10px;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tip-item {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  line-height: 1.6;
}

.tips-intro {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  line-height: 1.6;
  margin-bottom: 4px;
}

.bottom-spacer {
  height: 60px;
}

// ===== 底部支付栏（深色椭圆形风格，紧凑包裹文字） =====
.bottom-bar {
  position: fixed;
  bottom: 120rpx;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  padding: 4px 4px 4px 12px;
  gap: 88px;
  background: #2d2d2d;
  border-radius: 999px;
  z-index: 1002;
  white-space: nowrap;
}

.bottom-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price-label {
  font-size: 20px;
  color: #fff;
  font-weight: 700;
}

.price-total {
  font-size: 20px;
  color: #fff;
}

.price-symbol-small {
  font-size: 22px;
  color: #fff;
  font-weight: 700;
}

.price-number {
  font-size: 26px;
  color: #fff;
  font-weight: 800;
}

.pay-btn {
  padding: 10px 16px;
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(255, 107, 157, 0.35);

  text {
    font-size: 14px;
    font-weight: 700;
    color: #fff;
  }

  &.disabled {
    background: #666;
    box-shadow: none;
  }
}

.bottom-hint {
  position: fixed;
  bottom: calc(120rpx + 58px);
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 999px;
  z-index: 1003;
  white-space: nowrap;

  text {
    font-size: 26rpx;
    color: #FF6B9D;
    font-weight: 600;
    text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
  }
}

// ===== 定制会员（纯 CSS 图标） =====
.custom-banner,
.about-banner {
  width: 100%;
}

.banner-img {
  width: 100%;
  display: block;
}

// 卡片容器
.cd-card {
  margin: 0 32rpx 24rpx;
  padding: 32rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
}
.cd-card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 24rpx;
}

// 模块一：四列网格
.cd-grid {
  display: flex;
}
.cd-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cd-name {
  font-size: 24rpx;
  color: #333;
  font-weight: bold;
  margin-top: 16rpx;
  text-align: center;
}
.cd-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  text-align: center;
  line-height: 1.4;
}

// 模块一图标圆圈
.cd-circ {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.cd-circ-red { background: linear-gradient(135deg, #FF6B6B, #FF8E8E); }
.cd-circ-orange { background: linear-gradient(135deg, #FF9F43, #FFB876); }
.cd-circ-pink { background: linear-gradient(135deg, #FF6B9D, #FF8FAB); }
.cd-circ-purple { background: linear-gradient(135deg, #A55EEA, #C084FC); }

// 图标1：晕眩表情（两眼改为纯点）
.cd-dizzy { position: relative; width: 60rpx; height: 50rpx; }
.dz-dot { position: absolute; top: 14rpx; width: 6rpx; height: 6rpx; border-radius: 50%; background: #fff; }
.dz-left-dot { left: 16rpx; }
.dz-right-dot { right: 16rpx; }
.dz-mouth { position: absolute; bottom: 4rpx; left: 50%; transform: translateX(-50%); width: 28rpx; height: 14rpx; border-bottom: 3rpx solid #fff; border-radius: 0 0 50% 50%; }

// 图标2：指南针
.cd-compass { position: relative; width: 60rpx; height: 60rpx; }
.cp-diamond { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg); width: 24rpx; height: 24rpx; border: 2rpx solid #fff; }
.cp-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 6rpx; height: 6rpx; border-radius: 50%; background: #fff; }
.cp-tick { position: absolute; width: 0; height: 0; border-left: 4rpx solid transparent; border-right: 4rpx solid transparent; border-bottom: 6rpx solid #fff; }
.cp-t1 { top: 6rpx; left: 50%; transform: translateX(-50%); }
.cp-t2 { bottom: 6rpx; left: 50%; transform: translateX(-50%) rotate(180deg); }
.cp-t3 { left: 6rpx; top: 50%; transform: translateY(-50%) rotate(-90deg); }
.cp-t4 { right: 6rpx; top: 50%; transform: translateY(-50%) rotate(90deg); }

// 图标3：人形铃铛
.cd-bell { position: relative; width: 40rpx; height: 56rpx; display: flex; flex-direction: column; align-items: center; }
.bl-head { width: 18rpx; height: 18rpx; border-radius: 50%; background: #fff; }
.bl-body { width: 0; height: 0; border-left: 12rpx solid transparent; border-right: 12rpx solid transparent; border-bottom: 20rpx solid #fff; margin-top: -2rpx; }
.bl-bottom { width: 20rpx; height: 8rpx; border-radius: 0 0 50% 50%; background: #fff; margin-top: -2rpx; }

// 图标4：盾牌对勾
.cd-shield { position: relative; width: 44rpx; height: 50rpx; display: flex; align-items: center; justify-content: center; }
.sh-body { width: 32rpx; height: 36rpx; border-radius: 50% 50% 50% 50% / 15% 15% 85% 85%; background: #fff; display: flex; align-items: center; justify-content: center; }
.sh-check { width: 14rpx; height: 8rpx; border-right: 3rpx solid #A55EEA; border-bottom: 3rpx solid #A55EEA; transform: rotate(45deg); margin-top: -4rpx; }

// 模块二：服务列表
.cd-svc-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.cd-svc {
  display: flex;
  align-items: center;
}
.cd-svc-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 24rpx;
  position: relative;
}
.cd-svc-grad-pink { background: linear-gradient(135deg, #FFB6C1, #FFD4A0); }
.cd-svc-grad-purple { background: linear-gradient(135deg, #B19CD9, #D4B8F0); }
.cd-svc-grad-purple2 { background: linear-gradient(135deg, #B19CD9, #D4B8F0); }
.cd-svc-grad-blue { background: linear-gradient(135deg, #74B9FF, #A29BFE); }
.cd-svc-grad-green { background: linear-gradient(135deg, #55E6C1, #58B19F); }
.cd-svc-grad-red { background: linear-gradient(135deg, #FF6B6B, #FF8E8E); }
.cd-svc-text { flex: 1; }
.cd-svc-name { font-size: 32rpx; font-weight: bold; color: #4A4A8A; display: block; margin-bottom: 6rpx; }
.cd-svc-desc { font-size: 26rpx; color: #999; line-height: 1.5; }

// 服务图标1：靶心
.si-target { position: relative; width: 44rpx; height: 44rpx; }
.tg-ring1 { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40rpx; height: 40rpx; border-radius: 50%; border: 4rpx solid #FF6B6B; }
.tg-ring2 { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 28rpx; height: 28rpx; border-radius: 50%; border: 4rpx solid #FFD700; }
.tg-core { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 12rpx; height: 12rpx; border-radius: 50%; background: #FF6B6B; }

// 服务图标2：笑脸
.si-smile { position: relative; width: 44rpx; height: 36rpx; }
.sm-eye { position: absolute; top: 4rpx; width: 8rpx; height: 10rpx; border-radius: 50%; background: #fff; }
.sm-l { left: 10rpx; }
.sm-r { right: 10rpx; }
.sm-mouth { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 24rpx; height: 12rpx; border-bottom: 3rpx solid #fff; border-radius: 0 0 50% 50%; }

// 服务图标3：锁
.si-lock { position: relative; width: 30rpx; height: 36rpx; display: flex; flex-direction: column; align-items: center; }
.lk-shackle { width: 24rpx; height: 14rpx; border: 3rpx solid #fff; border-bottom: none; border-radius: 50% 50% 0 0; }
.lk-body { width: 22rpx; height: 18rpx; background: #fff; border-radius: 4rpx; margin-top: -2rpx; }

// 服务图标4：绿盾闪电
.si-shield-bolt { position: relative; width: 44rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.sb-shield { width: 36rpx; height: 40rpx; border-radius: 50% 50% 50% 50% / 15% 15% 70% 70%; background: #fff; display: flex; align-items: center; justify-content: center; }
.sb-bolt { width: 8rpx; height: 20rpx; background: #FFD700; clip-path: polygon(40% 0%, 100% 50%, 60% 50%, 60% 100%, 0% 50%, 40% 50%); }

// 服务图标5：紫心对勾
.si-heart-check { position: relative; width: 40rpx; height: 38rpx; display: flex; align-items: center; justify-content: center; }
.hc-heart { position: relative; width: 30rpx; height: 26rpx; }
.hc-heart::before,
.hc-heart::after {
  content: '';
  position: absolute;
  top: 0;
  left: 15rpx;
  width: 15rpx;
  height: 22rpx;
  background: #fff;
  border-radius: 15rpx 15rpx 0 0;
  transform: rotate(-45deg);
  transform-origin: 0 100%;
}
.hc-heart::after { left: 0; transform: rotate(45deg); transform-origin: 100% 100%; }
.hc-check { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg); width: 10rpx; height: 6rpx; border-right: 2rpx solid #B19CD9; border-bottom: 2rpx solid #B19CD9; margin-top: -2rpx; }

// 服务图标6：红发人物
.si-redhead { position: relative; width: 46rpx; height: 60rpx; display: flex; flex-direction: column; align-items: center; }
.rh-hair { width: 40rpx; height: 20rpx; background: #FF4757; border-radius: 50% 50% 0 0; position: relative; z-index: 2; }
.rh-bangs { display: flex; gap: 2rpx; margin-top: -6rpx; position: relative; z-index: 3; }
.rh-bang { width: 6rpx; height: 8rpx; background: #FF4757; }
.rh-face { width: 18rpx; height: 18rpx; border-radius: 50%; background: #fff; position: relative; z-index: 1; margin-top: -4rpx; }
.rh-body { width: 0; height: 0; border-left: 10rpx solid transparent; border-right: 10rpx solid transparent; border-bottom: 16rpx solid #fff; margin-top: 2rpx; }

// 服务图标7：人形+定位
.si-person-pin { position: relative; width: 52rpx; height: 48rpx; }
.pp-head { position: absolute; top: 2rpx; left: 4rpx; width: 14rpx; height: 14rpx; border-radius: 50%; background: #fff; }
.pp-body { position: absolute; top: 16rpx; left: 1rpx; width: 0; height: 0; border-left: 10rpx solid transparent; border-right: 10rpx solid transparent; border-bottom: 16rpx solid #fff; }
.pp-pin { position: absolute; bottom: 4rpx; right: 6rpx; width: 18rpx; height: 22rpx; border-radius: 50% 50% 50% 0; background: #FFD700; transform: rotate(-45deg); }

// 服务图标8：纯圆角气泡（居中）
.si-bubble-simple { display: flex; align-items: center; justify-content: center; }
.bs-box { width: 36rpx; height: 24rpx; background: #fff; border-radius: 8rpx; }

// ===== 关于我们 =====
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
}

.feature-text {
  flex: 1;
}

.feature-name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}

/* ===== 平台特点（纯 CSS 绘制） ===== */
.pf-section {
  position: relative;
  margin: 24rpx 32rpx;
  padding: 40rpx 32rpx 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #D4B8F0, #B8A0E0);
  overflow: hidden;
}
.pf-waves { position: absolute; top: 0; left: 0; right: 0; height: 220rpx; pointer-events: none; }
.pf-wave { position: absolute; border-radius: 50%; }
.pf-wave1 { width: 380rpx; height: 190rpx; background: rgba(150, 110, 200, 0.18); top: -70rpx; left: -50rpx; transform: rotate(-15deg); }
.pf-wave2 { width: 340rpx; height: 170rpx; background: rgba(205, 150, 225, 0.18); top: -55rpx; right: -40rpx; transform: rotate(30deg); }
.pf-wave3 { width: 300rpx; height: 150rpx; background: rgba(175, 135, 215, 0.15); top: -30rpx; left: 130rpx; }
.pf-star {
  position: absolute;
  background: #FFD700;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}
.pf-star1 { width: 18rpx; height: 18rpx; top: 24rpx; left: 56rpx; }
.pf-star2 { width: 12rpx; height: 12rpx; top: 60rpx; left: 180rpx; }
.pf-star3 { width: 16rpx; height: 16rpx; top: 30rpx; right: 90rpx; }
.pf-star4 { width: 14rpx; height: 14rpx; top: 70rpx; right: 40rpx; }
.pf-star5 { width: 20rpx; height: 20rpx; top: 100rpx; left: 40rpx; }
.pf-star6 { width: 12rpx; height: 12rpx; top: 110rpx; right: 120rpx; }
.pf-blink { animation: pf-blink 1.8s ease-in-out infinite; }
@keyframes pf-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

.pf-hero { position: relative; height: 300rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pf-heart { position: relative; width: 120rpx; height: 108rpx; }
.pf-heart::before,
.pf-heart::after {
  content: '';
  position: absolute;
  top: 0;
  left: 60rpx;
  width: 60rpx;
  height: 96rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 60rpx 60rpx 0 0;
  transform: rotate(-45deg);
  transform-origin: 0 100%;
}
.pf-heart::after { left: 0; transform: rotate(45deg); transform-origin: 100% 100%; }
.pf-dots { display: flex; gap: 24rpx; margin-top: 28rpx; }
.pf-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: rgba(255, 255, 255, 0.25); }

.pf-title { position: relative; text-align: center; color: #fff; font-weight: bold; font-size: 40rpx; }
.pf-line { width: 80rpx; height: 6rpx; border-radius: 3rpx; background: #FFD700; margin: 12rpx auto 0; }

.pf-list { position: relative; margin-top: 32rpx; }
.pf-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.pf-card + .pf-card { margin-top: 24rpx; }
.pf-text { font-size: 32rpx; font-weight: bold; color: #333; }
.pf-icon {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFB6C1, #FFD4A0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 24rpx;
}

/* 图标一：小房子 */
.ic-house { position: relative; width: 40rpx; height: 52rpx; }
.h-sign { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 20rpx; height: 4rpx; background: #FFB6C1; border-radius: 2rpx; }
.h-roof { position: absolute; top: 8rpx; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 20rpx solid transparent; border-right: 20rpx solid transparent; border-bottom: 16rpx solid #fff; }
.h-body { position: absolute; top: 24rpx; left: 50%; transform: translateX(-50%); width: 32rpx; height: 24rpx; background: #fff; border-radius: 0 0 4rpx 4rpx; }
.h-door { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 8rpx; height: 12rpx; background: #FF9A56; border-radius: 2rpx 2rpx 0 0; }

/* 图标二：奖杯 */
.ic-trophy { position: relative; width: 40rpx; height: 44rpx; }
.t-cup { position: absolute; top: 4rpx; left: 50%; transform: translateX(-50%); width: 22rpx; height: 0; border-bottom: 26rpx solid #fff; border-left: 6rpx solid transparent; border-right: 6rpx solid transparent; }
.t-base { position: absolute; bottom: 2rpx; left: 50%; transform: translateX(-50%); width: 20rpx; height: 6rpx; background: #fff; border-radius: 2rpx; }
.t-handle { position: absolute; top: 6rpx; width: 12rpx; height: 18rpx; border: 3rpx solid #fff; border-radius: 50%; }
.t-left { left: 2rpx; border-right: none; }
.t-right { right: 2rpx; border-left: none; }

/* 图标三：上升图表 */
.ic-chart { position: relative; width: 42rpx; height: 32rpx; }
.c-bar { position: absolute; bottom: 0; width: 6rpx; background: #fff; border-radius: 3rpx; }
.c-bar1 { left: 4rpx; height: 12rpx; }
.c-bar2 { left: 18rpx; height: 20rpx; }
.c-bar3 { left: 32rpx; height: 16rpx; }
.c-line { position: absolute; height: 2rpx; background: #fff; transform-origin: left center; }
.c-line1 { left: 7rpx; bottom: 12rpx; width: 16rpx; transform: rotate(-27deg); }
.c-line2 { left: 21rpx; bottom: 20rpx; width: 15rpx; transform: rotate(15deg); }
.c-node { position: absolute; width: 5rpx; height: 5rpx; background: #fff; transform: rotate(45deg); }
.c-node1 { left: 19rpx; bottom: 18rpx; }
.c-node2 { left: 33rpx; bottom: 14rpx; }

/* 图标四：双人+爱心 */
.ic-couple { position: relative; width: 52rpx; height: 40rpx; }
.person { position: absolute; bottom: 4rpx; }
.p-left { left: 4rpx; }
.p-right { right: 4rpx; }
.p-head { width: 14rpx; height: 14rpx; border-radius: 50%; background: #fff; margin: 0 auto; }
.p-body { width: 0; height: 0; margin-top: 2rpx; border-left: 5rpx solid transparent; border-right: 5rpx solid transparent; border-bottom: 16rpx solid #fff; }
.mini-heart { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 14rpx; height: 12rpx; }
.mini-heart::before,
.mini-heart::after {
  content: '';
  position: absolute;
  top: 0;
  left: 7rpx;
  width: 7rpx;
  height: 11rpx;
  background: #FF6B9D;
  border-radius: 7rpx 7rpx 0 0;
  transform: rotate(-45deg);
  transform-origin: 0 100%;
}
.mini-heart::after { left: 0; transform: rotate(45deg); transform-origin: 100% 100%; }

</style>
