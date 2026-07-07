<template>
  <view class="presult-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @tap="goBack">
        <uni-icons type="arrowleft" size="40rpx" color="#333333"></uni-icons>
      </view>
      <text class="nav-title">性格测试结果</text>
      <view class="nav-right" />
    </view>

    <view v-if="loading" class="loading-box">
      <text class="loading-text">加载中…</text>
    </view>

    <view v-else-if="!result" class="empty-box">
      <text class="empty-text">还没有测试结果</text>
      <view class="btn-go-test" @tap="goTest">立即测试</view>
    </view>

    <scroll-view v-else class="page-scroll" scroll-y>
      <!-- 类型头部 -->
      <view class="type-header">
        <text class="type-code">{{ result.typeCode }}</text>
        <text class="type-name">{{ displayTypeName }}</text>
        <text v-if="result.nickname" class="type-nick">「{{ result.nickname }}」</text>
        <text v-if="result.summary" class="type-summary">{{ result.summary }}</text>
      </view>

      <!-- 雷达图 -->
      <view class="radar-card">
        <text class="section-title">四维度性格画像</text>
        <view class="radar-wrap">
          <canvas canvas-id="radarCanvas" id="radarCanvas" class="radar-canvas" />
          <view v-if="isGuest" class="radar-lock-hint">
            <text class="lock-emoji">🔒</text>
            <text class="lock-text">登录后解锁完整四维画像</text>
          </view>
        </view>
        <view class="dim-list">
          <view
            v-for="(d, idx) in dimensions"
            :key="d.code"
            class="dim-row"
            :class="{ 'dim-locked': isGuest && idx >= unlockedDims }"
          >
            <text class="dim-name">{{ d.name }}</text>
            <view class="dim-bar">
              <view
                class="dim-fill"
                :style="{ width: (isGuest && idx >= unlockedDims ? 50 : d.radar) + '%' }"
              />
            </view>
            <text v-if="isGuest && idx >= unlockedDims" class="dim-label locked">🔒 登录解锁</text>
            <text v-else class="dim-label">{{ d.chosenLabel }}</text>
          </view>
        </view>
      </view>

      <!-- ========== 游客简化版：登录 CTA ========== -->
      <view v-if="isGuest" class="guest-cta-card">
        <view class="btn-login-cta" @tap="onLoginCta">
          <text>{{ loginCtaText }}</text>
        </view>
        <view class="btn-retest-plain" @tap="retest">重新测试</view>
      </view>

      <!-- ========== 登录完整版 ========== -->
      <block v-else>
        <!-- AI 深度解读（折叠卡片） -->
        <view class="ai-card">
          <view class="ai-head" @tap="toggleAi">
            <view class="ai-head-left">
              <text class="ai-star">✦</text>
              <text class="ai-title">AI 深度解读</text>
            </view>
            <uni-icons :type="aiExpanded ? 'up' : 'down'" size="32rpx" color="#ff6b9d" />
          </view>
          <view v-if="aiExpanded" class="ai-body">
            <view v-if="aiLoading" class="ai-loading">
              <text class="ai-loading-text">AI 正在分析你的性格…</text>
            </view>
            <block v-else-if="interpretation">
              <view class="ai-section">
                <text class="ai-section-title">恋爱优势</text>
                <text class="ai-section-text">{{ interpretation.loveStrengths }}</text>
              </view>
              <view class="ai-section">
                <text class="ai-section-title">需要注意的相处模式</text>
                <text class="ai-section-text">{{ interpretation.cautions }}</text>
              </view>
              <view class="ai-section">
                <text class="ai-section-title">适合什么样的伴侣</text>
                <text class="ai-section-text">{{ interpretation.idealPartner }}</text>
              </view>
              <view class="ai-section">
                <text class="ai-section-title">约会场景建议</text>
                <text class="ai-section-text">{{ interpretation.dateScenes }}</text>
              </view>
              <text class="ai-disclaimer">{{ interpretation.disclaimer }}</text>
            </block>
            <view v-else class="ai-loading">
              <text class="ai-loading-text">解读暂不可用，请稍后重试</text>
            </view>
          </view>
        </view>

        <!-- 与你最匹配的类型 -->
        <view v-if="matchTypeDetails.length" class="match-card">
          <text class="section-title">与你最匹配的类型</text>
          <scroll-view class="match-scroll" scroll-x :show-scrollbar="false">
            <view class="match-scroll-inner">
              <view v-for="m in matchTypeDetails" :key="m.code" class="match-type-card">
                <text class="mt-name">{{ m.name || m.code }}</text>
                <text v-if="m.nickname" class="mt-nick">{{ m.nickname }}</text>
                <text class="mt-tip">性格互补度较高</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 分享文案 -->
        <view class="share-card">
          <text class="section-title">AI 生成分享文案</text>
          <view class="style-tabs">
            <view
              v-for="s in styleOptions"
              :key="s.key"
              class="style-tab"
              :class="{ 'style-active': shareStyle === s.key }"
              @tap="switchStyle(s.key)"
            >
              {{ s.label }}
            </view>
          </view>
          <view v-if="shareLoading" class="share-loading">
            <text class="ai-loading-text">文案生成中…</text>
          </view>
          <block v-else>
            <view
              v-for="(c, i) in shareCopies"
              :key="i"
              class="copy-item"
              :class="{ 'copy-active': selectedCopy === c }"
              @tap="selectCopy(c)"
            >
              <text class="copy-text">{{ c }}</text>
              <uni-icons v-if="selectedCopy === c" type="checkmarkempty" size="32rpx" color="#ff6b9d" />
            </view>
            <text v-if="shareCopies.length" class="ai-disclaimer">内容由 AI 生成，仅供参考</text>
          </block>
        </view>

        <!-- 主操作按钮 -->
        <view class="full-btns">
          <view class="btn-share" @tap="goPoster">分享我的性格</view>
          <view class="btn-match" @tap="goMatchList">去看看匹配的人</view>
        </view>
        <view class="btn-retest-plain" @tap="retest">重新测试</view>
      </block>

      <!-- 免责声明 -->
      <text class="disclaimer-fixed">本测试仅供娱乐和交友参考，结果不代表专业心理测评</text>
      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from 'vue'
import { onLoad, onReady, onShow } from '@dcloudio/uni-app'
import { get, post } from '@/utils/request'
import { logger } from '@/utils/logger'
import { useUserStore } from '@/store/user'
import {
  getGuestToken,
  clearGuestToken,
  resolveAndExposeCopy,
  reportCopyClick,
  reportPendingConversion,
} from '@/utils/personality'

interface DimResult { code: string; name: string; chosenLabel: string; radar: number }
interface MatchTypeDetail { code: string; name: string | null; nickname: string | null }
interface ResultView {
  typeCode: string
  typeName: string | null
  nickname: string | null
  summary: string | null
  description: string | null
  radar: Record<string, number>
  dimensions: DimResult[]
  matchTypes: string[]
  matchTypeDetails?: MatchTypeDetail[]
  testedAt: string
  isGuest: boolean
}
interface Interpretation {
  loveStrengths: string
  cautions: string
  idealPartner: string
  dateScenes: string
  fallback: boolean
  disclaimer: string
}

const RESULT_CTA_SLOT = 'result_login_cta'
const DEFAULT_TYPE_NAME = '神秘探索者'

const userStore = useUserStore()
const instance = getCurrentInstance()
const statusBarHeight = ref(20)
const loading = ref(true)
const result = ref<ResultView | null>(null)
const canvasReady = ref(false)

const isLoggedIn = computed(() => userStore.isLoggedIn)
// 游客视图：未登录，或后端标记为游客结果
const isGuest = computed(() => !isLoggedIn.value || !!result.value?.isGuest)
const unlockedDims = 2
const dimensions = computed(() => result.value?.dimensions || [])
const matchTypeDetails = computed<MatchTypeDetail[]>(() => result.value?.matchTypeDetails || [])
// 类型名兜底：后端类型数据异常时展示默认类型「神秘探索者」
const displayTypeName = computed(() => result.value?.typeName || DEFAULT_TYPE_NAME)

// 登录 CTA 文案（后台文案位配置，默认兜底）
const loginCtaText = ref('登录查看完整解析')
const ctaItemId = ref<number | undefined>(undefined)

const aiExpanded = ref(false)
const aiLoading = ref(false)
const interpretation = ref<Interpretation | null>(null)

const shareStyle = ref('humor')
const shareLoading = ref(false)
const shareCopies = ref<string[]>([])
const selectedCopy = ref('')
const styleOptions = [
  { key: 'humor', label: '幽默风趣' },
  { key: 'literary', label: '文艺清新' },
  { key: 'sincere', label: '直接真诚' },
]

onLoad(() => {
  const sys = uni.getWindowInfo() as any
  statusBarHeight.value = sys.statusBarHeight || 20
})

onReady(() => {
  canvasReady.value = true
  drawRadar()
})

// onShow：登录态变化后自动刷新（游客登录 → 完整版）
onShow(() => {
  loadResult()
})

async function loadResult() {
  loading.value = true
  try {
    if (isLoggedIn.value) {
      // 游客登录后：迁移 Redis 结果到账号，并回传转化
      const gt = getGuestToken()
      if (gt) {
        try { await post('/personality/migrate', { guestToken: gt }) } catch { /* 无游客结果时忽略 */ }
        clearGuestToken()
      }
      reportPendingConversion()
      result.value = (await get('/personality/my-result')) as any
    } else {
      const gt = getGuestToken()
      result.value = gt ? ((await get('/personality/my-result', { guestToken: gt })) as any) : null
      // 游客版曝光登录 CTA 文案位
      if (result.value) {
        const copy = await resolveAndExposeCopy(RESULT_CTA_SLOT)
        if (copy?.mainText) loginCtaText.value = copy.mainText
        ctaItemId.value = copy?.itemId
      }
    }
    // 后端类型数据异常（有 typeCode 但类型未定义）：兜底展示默认类型并上报错误日志
    if (result.value && result.value.typeCode && !result.value.typeName) {
      logger.error('[personality] 类型数据异常，已兜底为默认类型', {
        typeCode: result.value.typeCode,
        userId: userStore.userInfo?.id,
      })
    }
    if (result.value) setTimeout(drawRadar, 50)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function drawRadar() {
  if (!canvasReady.value || !result.value) return
  const dims = result.value.dimensions || []
  if (dims.length === 0) return

  const ctx = uni.createCanvasContext('radarCanvas', instance?.proxy)
  const size = 240
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 40
  const n = dims.length
  const angleStep = (Math.PI * 2) / n
  const start = -Math.PI / 2
  // 游客仅绘制前 unlockedDims 个维度的真实值，其余维度置 0（不泄露锁定数据）
  const guest = isGuest.value

  ctx.clearRect(0, 0, size, size)

  ctx.setStrokeStyle('#ffd6e4')
  ctx.setLineWidth(1)
  for (let layer = 1; layer <= 3; layer++) {
    const r = (radius * layer) / 3
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const ang = start + angleStep * i
      const x = cx + r * Math.cos(ang)
      const y = cy + r * Math.sin(ang)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }

  for (let i = 0; i < n; i++) {
    const ang = start + angleStep * i
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + radius * Math.cos(ang), cy + radius * Math.sin(ang))
    ctx.stroke()
  }

  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const ang = start + angleStep * i
    const locked = guest && i >= unlockedDims
    const raw = locked ? 0 : Math.max(0, Math.min(100, dims[i].radar || 0))
    const r = radius * (raw / 100)
    const x = cx + r * Math.cos(ang)
    const y = cy + r * Math.sin(ang)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.setFillStyle('rgba(255,107,157,0.35)')
  ctx.fill()
  ctx.setStrokeStyle('#ff6b9d')
  ctx.setLineWidth(2)
  ctx.stroke()

  ctx.setFillStyle('#666666')
  ctx.setFontSize(11)
  for (let i = 0; i < n; i++) {
    const ang = start + angleStep * i
    const x = cx + (radius + 16) * Math.cos(ang)
    const y = cy + (radius + 16) * Math.sin(ang)
    ctx.setTextAlign(Math.abs(Math.cos(ang)) < 0.3 ? 'center' : x < cx ? 'right' : 'left')
    ctx.fillText(dims[i].name || '', x, y + 4)
  }

  ctx.draw()
}

async function toggleAi() {
  aiExpanded.value = !aiExpanded.value
  if (aiExpanded.value && isLoggedIn.value && !interpretation.value && !aiLoading.value) {
    await loadInterpretation()
  }
}

async function loadInterpretation() {
  aiLoading.value = true
  try {
    interpretation.value = (await get('/ai/personality/interpretation')) as any
  } catch (e: any) {
    uni.showToast({ title: e?.message || 'AI 解读暂不可用', icon: 'none' })
  } finally {
    aiLoading.value = false
  }
}

async function switchStyle(key: string) {
  if (shareStyle.value === key && shareCopies.value.length) return
  shareStyle.value = key
  await loadShareCopies()
}

async function loadShareCopies() {
  shareLoading.value = true
  selectedCopy.value = ''
  try {
    const res: any = await post('/ai/personality/share-copy', { style: shareStyle.value })
    shareCopies.value = res?.copies || []
  } catch (e: any) {
    uni.showToast({ title: e?.message || '文案生成失败', icon: 'none' })
    shareCopies.value = []
  } finally {
    shareLoading.value = false
  }
}

function selectCopy(c: string) {
  selectedCopy.value = c
}

// 游客登录 CTA：上报点击 → 跳登录（返回后 onShow 自动刷新完整版）
function onLoginCta() {
  reportCopyClick(RESULT_CTA_SLOT, ctaItemId.value)
  uni.navigateTo({ url: '/pages/login/index' })
}

function retest() {
  uni.redirectTo({ url: '/pages/personality/test?retest=1' })
}

function goTest() {
  uni.redirectTo({ url: '/pages/personality/test' })
}

function goPoster() {
  const q = selectedCopy.value ? `?shareText=${encodeURIComponent(selectedCopy.value)}` : ''
  uni.navigateTo({ url: `/pages/personality/poster${q}` })
}

function goMatchList() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.presult-page { min-height: 100vh; background: #fff5f7; }
.nav-bar {
  height: 88rpx; display: flex; align-items: center; justify-content: space-between;
  padding: 0 24rpx; background: #ffffff;
}
.nav-left, .nav-right { width: 80rpx; height: 88rpx; display: flex; align-items: center; }
.nav-title { font-size: 32rpx; color: #333; font-weight: 500; }

.loading-box, .empty-box { height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; }
.loading-text, .empty-text { color: #999; font-size: 28rpx; }
.btn-go-test { padding: 20rpx 60rpx; border-radius: 44rpx; background: #ff6b9d; color: #fff; font-size: 30rpx; }

.page-scroll { height: calc(100vh - 88rpx); }

.type-header {
  margin: 24rpx 32rpx; padding: 48rpx 32rpx; border-radius: 24rpx;
  background: linear-gradient(135deg, #ff9dc0, #ff6b9d);
  display: flex; flex-direction: column; align-items: center;
}
.type-code { font-size: 30rpx; color: #fff; letter-spacing: 4rpx; opacity: 0.9; }
.type-name { margin-top: 12rpx; font-size: 44rpx; font-weight: bold; color: #fff; }
.type-nick { margin-top: 8rpx; font-size: 28rpx; color: #fff; opacity: 0.95; }
.type-summary { margin-top: 20rpx; font-size: 26rpx; color: #fff; line-height: 1.6; text-align: center; }

.section-title { display: block; font-size: 32rpx; font-weight: 600; color: #333; margin-bottom: 24rpx; }

.radar-card, .ai-card, .share-card, .match-card, .guest-cta-card {
  margin: 0 32rpx 24rpx; padding: 32rpx; background: #fff; border-radius: 24rpx;
}
.radar-wrap { position: relative; width: 240px; margin: 0 auto; }
.radar-canvas { width: 240px; height: 240px; display: block; }
.radar-lock-hint {
  position: absolute; left: 0; right: 0; bottom: 0;
  display: flex; flex-direction: column; align-items: center; gap: 6rpx;
  padding: 12rpx 0; background: rgba(255, 245, 247, 0.82);
}
.lock-emoji { font-size: 30rpx; }
.lock-text { font-size: 22rpx; color: #ff6b9d; }

.dim-list { margin-top: 24rpx; }
.dim-row { display: flex; align-items: center; margin-bottom: 20rpx; }
.dim-name { width: 140rpx; font-size: 26rpx; color: #333; }
.dim-bar { flex: 1; height: 14rpx; border-radius: 7rpx; background: #ffe0ea; overflow: hidden; margin: 0 16rpx; }
.dim-fill { height: 100%; border-radius: 7rpx; background: #ff6b9d; }
.dim-label { width: 140rpx; text-align: right; font-size: 24rpx; color: #ff6b9d; }
.dim-label.locked { color: #bbb; }
.dim-locked .dim-fill { background: #e0e0e0; }
.dim-locked .dim-name { color: #bbb; }

.guest-cta-card { display: flex; flex-direction: column; gap: 20rpx; }
.btn-login-cta {
  height: 92rpx; border-radius: 46rpx; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #ff9dc0, #ff6b9d); color: #fff; font-size: 32rpx; font-weight: 600;
}
.btn-retest-plain {
  margin: 0 32rpx 24rpx; height: 84rpx; border-radius: 42rpx;
  display: flex; align-items: center; justify-content: center;
  background: #fff; border: 1rpx solid #ff6b9d; color: #ff6b9d; font-size: 28rpx;
}
.guest-cta-card .btn-retest-plain { margin: 0; }

.ai-head { display: flex; align-items: center; justify-content: space-between; }
.ai-head-left { display: flex; align-items: center; }
.ai-star { color: #ff6b9d; font-size: 32rpx; margin-right: 12rpx; }
.ai-title { font-size: 32rpx; font-weight: 600; color: #333; }
.ai-body { margin-top: 24rpx; }
.ai-loading { padding: 40rpx 0; display: flex; justify-content: center; }
.ai-loading-text { color: #999; font-size: 28rpx; }
.ai-section { margin-bottom: 24rpx; }
.ai-section-title { display: block; font-size: 28rpx; font-weight: 600; color: #ff6b9d; margin-bottom: 8rpx; }
.ai-section-text { font-size: 28rpx; color: #555; line-height: 1.7; }
.ai-disclaimer { display: block; margin-top: 16rpx; font-size: 22rpx; color: #bbb; }

.match-scroll { width: 100%; white-space: nowrap; }
.match-scroll-inner { display: inline-flex; gap: 20rpx; }
.match-type-card {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  width: 200rpx; padding: 28rpx 16rpx; border-radius: 20rpx; background: #fff0f3;
}
.mt-name { font-size: 28rpx; font-weight: 600; color: #333; }
.mt-nick { margin-top: 8rpx; font-size: 22rpx; color: #ff6b9d; }
.mt-tip { margin-top: 12rpx; font-size: 20rpx; color: #999; }

.style-tabs { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.style-tab { flex: 1; text-align: center; padding: 16rpx 0; border-radius: 40rpx; background: #f7f7f9; color: #666; font-size: 26rpx; }
.style-active { background: #fff0f3; color: #ff6b9d; }
.share-loading { padding: 40rpx 0; display: flex; justify-content: center; }
.copy-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24rpx; margin-bottom: 16rpx; border-radius: 16rpx;
  background: #f7f7f9; border: 2rpx solid transparent;
}
.copy-active { background: #fff0f3; border-color: #ff6b9d; }
.copy-text { flex: 1; font-size: 28rpx; color: #333; line-height: 1.5; }

.full-btns { display: flex; gap: 24rpx; margin: 0 32rpx 24rpx; }
.btn-share {
  flex: 1; height: 88rpx; border-radius: 44rpx; display: flex; align-items: center; justify-content: center;
  background: #fff; border: 1rpx solid #ff6b9d; color: #ff6b9d; font-size: 30rpx;
}
.btn-match {
  flex: 1; height: 88rpx; border-radius: 44rpx; display: flex; align-items: center; justify-content: center;
  background: #ff6b9d; color: #fff; font-size: 30rpx;
}

.disclaimer-fixed {
  display: block; text-align: center; padding: 24rpx 40rpx;
  font-size: 22rpx; color: #bbb; line-height: 1.6;
}
.bottom-safe { height: env(safe-area-inset-bottom); }
</style>
