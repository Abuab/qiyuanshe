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
      :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px', paddingBottom: '200rpx' }"
    >
      <!-- 头部特权 -->
      <view class="header-section">
        <text class="header-title">开通会员，享受专属特权</text>
        <view class="benefits-row">
          <view class="benefit-item">
            <view class="benefit-icon">💬</view>
            <text class="benefit-label">无限畅聊</text>
          </view>
          <view class="benefit-item">
            <view class="benefit-icon">🔥</view>
            <text class="benefit-label">优先推荐</text>
          </view>
          <view class="benefit-item">
            <view class="benefit-icon">👁</view>
            <text class="benefit-label">查看访客</text>
          </view>
          <view class="benefit-item">
            <view class="benefit-icon">👑</view>
            <text class="benefit-label">专属标识</text>
          </view>
        </view>
      </view>

      <!-- 套餐选择 -->
      <view class="packages-section">
        <text class="section-title">选择套餐</text>
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

      <!-- 支付方式 -->
      <view class="payment-section">
        <text class="section-title">支付方式</text>
        <view class="payment-method selected">
          <view class="wechat-icon">微</view>
          <text class="method-name">微信支付</text>
          <text class="check-mark">✓</text>
        </view>
      </view>

      <!-- 安全征婚提示 -->
      <view class="safety-tips">
        <text class="tips-title">安全征婚提示</text>
        <view class="tips-list">
          <text v-for="(tip, idx) in safetyTips" :key="idx" class="tip-item">{{ idx + 1 }}. {{ tip }}</text>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 定制会员 Tab -->
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

      <!-- 适合人群 -->
      <view class="custom-section">
        <text class="section-title">{{ customConfig.suitableTitle || '哪些人适合1对1定制服务' }}</text>
        <view class="suitable-grid">
          <view class="suitable-item" v-for="(item, idx) in customConfig.suitableList" :key="idx">
            <view class="suitable-icon" :style="{ background: item.color || '#FFF0F3' }">
              <text>{{ item.icon }}</text>
            </view>
            <text class="suitable-name">{{ item.name }}</text>
            <text class="suitable-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 专属服务 -->
      <view class="custom-section">
        <text class="section-title">{{ customConfig.serviceTitle || '专属服务 助你脱单' }}</text>
        <view class="service-list">
          <view class="service-item" v-for="(item, idx) in customConfig.serviceList" :key="idx">
            <view class="service-icon" :style="{ background: item.color || '#FFF0F3' }">
              <text>{{ item.icon }}</text>
            </view>
            <view class="service-text">
              <text class="service-name">{{ item.name }}</text>
              <text class="service-desc">{{ item.desc }}</text>
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

      <!-- 平台特点 -->
      <view class="about-section" v-if="aboutConfig.title">
        <text class="section-title">{{ aboutConfig.title }}</text>
        <view class="feature-list">
          <view class="feature-card" v-for="(item, idx) in aboutConfig.features" :key="idx">
            <view class="feature-icon" :style="{ background: item.color || '#FFF0F3' }">
              <text>{{ item.icon }}</text>
            </view>
            <view class="feature-text">
              <text class="feature-name">{{ item.name }}</text>
              <text class="feature-desc">{{ item.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部支付栏（仅VIP会员Tab显示） -->
    <view v-if="activeTab === 'vip'" class="bottom-bar">
      <view class="bottom-price">
        <text class="price-label" v-if="selectedPackage">合计</text>
        <text class="price-total" v-if="selectedPackage">
          <text class="price-symbol-small">¥</text>
          <text class="price-number">{{ formatPrice(selectedPackage.price) }}</text>
        </text>
        <text class="price-total" v-else>请选择套餐</text>
      </view>
      <view class="pay-btn" :class="{ disabled: !selectedPackage }" @tap="handlePay">
        <text>确认支付</text>
      </view>
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
const navBarHeightPx = ref(82) // 36px level1 + 46px level2

const tabs = [
  { key: 'vip', label: 'VIP会员' },
  { key: 'custom', label: '定制会员' },
  { key: 'about', label: '关于我们' },
]
const activeTab = ref('vip')

const currentTabLabel = computed(() => {
  const tab = tabs.find(t => t.key === activeTab.value)
  return tab ? tab.label : 'VIP会员'
})

const redLineTerm = computed(() => systemStore.redLineTerm || '红线')

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
  if (Number.isInteger(price)) return String(price)
  return price.toFixed(2)
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

// ===== 安全征婚提示 =====
const safetyTips = ref<string[]>([
  '请认准平台官方客服，谨防冒充人员',
  '首次见面请选择公共场合，确保安全',
  '交往过程中请勿轻易转账、借贷',
  '如遇可疑行为请及时向平台举报',
  '平台将对违规用户进行封禁处理',
])

async function fetchSafetyTips() {
  try {
    const { get: getWithoutToast } = await import('@/utils/request')
    const res: any = await getWithoutToast('/vip/safety-tips')
    if (res?.tips?.length) {
      safetyTips.value = res.tips
    }
  } catch {
    // 保持默认值
  }
}

function handleBack() {
  safeNavigateBack()
}

// ===== 初始化 =====
onMounted(() => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20

  fetchPackages()
  fetchCustomConfig()
  fetchAboutConfig()
  fetchSafetyTips()
})

// tabBar 页面重新进入时刷新套餐数据
onShow(() => {
  if (packages.value.length === 0) {
    fetchPackages()
  }
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
  font-size: 16px;
  font-weight: 700;
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
    font-weight: 500;
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

.benefit-icon {
  width: 48px;
  height: 48px;
  background: #FFF0F3;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.benefit-label {
  font-size: 12px;
  color: #666;
}

// ===== 套餐选择 =====
.packages-section {
  padding: 0 20px 20px;
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
  font-size: 12px;
  color: #999;
  text-align: center;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
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
  font-size: 14px;
  font-weight: 700;
  color: #666;
  margin-bottom: 10px;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tip-item {
  font-size: 12px;
  color: #999;
  line-height: 1.6;
}

.bottom-spacer {
  height: 60px;
}

// ===== 底部支付栏 =====
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 16px 24px;
  padding-bottom: calc(220rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
  z-index: 1000;
}

.bottom-price {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price-label {
  font-size: 13px;
  color: #999;
}

.price-total {
  font-size: 13px;
  color: #999;
}

.price-symbol-small {
  font-size: 16px;
  color: #FF6B9D;
  font-weight: 700;
}

.price-number {
  font-size: 24px;
  color: #FF6B9D;
  font-weight: 800;
}

.pay-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  border-radius: 24px;
  box-shadow: 0 4px 14px rgba(255, 107, 157, 0.35);

  text {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }

  &.disabled {
    background: #ccc;
    box-shadow: none;
  }
}

// ===== 定制会员 =====
.custom-banner,
.about-banner {
  width: 100%;
}

.banner-img {
  width: 100%;
  display: block;
}

.custom-section,
.about-section {
  padding: 20px;
  background: #fff;
  margin-bottom: 12px;
}

// 适合人群网格
.suitable-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.suitable-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 10px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
}

.suitable-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 8px;
}

.suitable-name {
  font-size: 14px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.suitable-desc {
  font-size: 11px;
  color: #999;
}

// 服务列表
.service-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.service-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: #fff;
  border: 1px solid #f5f5f5;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.service-icon {
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-right: 14px;
}

.service-text {
  flex: 1;
}

.service-name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.service-desc {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}

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

.feature-icon {
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 14px;
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
</style>
