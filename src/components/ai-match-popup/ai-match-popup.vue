<template>
  <view v-if="visible" class="ai-match-overlay" @tap="close">
    <view class="ai-match-panel" :class="{ slideUp: animating }" @tap.stop>
      <!-- 顶部操作栏 -->
      <view class="panel-header">
        <text class="panel-title">AI 缘分分析</text>
        <view class="close-btn" @tap="close">
          <text>✕</text>
        </view>
      </view>

      <!-- 加载态 -->
      <view v-if="status === 'loading'" class="loading-block">
        <view class="pulse-ring" />
        <text class="loading-text">AI 正在分析缘分...</text>
        <text class="loading-sub">正在对比你们的三观·生活方式·未来规划</text>
      </view>

      <!-- 无资格 -->
      <view v-else-if="status === 'ineligible'" class="ineligible-block">
        <text class="large-emoji">🔒</text>
        <text class="block-title">{{ ineligibleTitle }}</text>
        <view v-if="errorReasons.length" class="reasons-list">
          <view v-for="(r, i) in errorReasons" :key="i" class="reason-item">
            <text class="reason-dot">•</text>
            <text class="reason-text">{{ r }}</text>
          </view>
        </view>
        <text v-if="hasMyIssue" class="block-desc">{{ selfDescText }}</text>
        <text v-if="hasTaIssue" class="block-desc">提醒对方完善资料，一起解锁缘分分析</text>
        <view v-if="hasMyIssue" class="block-btn" @tap="goImproveProfile">
          <text>去完善资料</text>
        </view>
        <view v-if="hasTaIssue" class="block-btn remind-btn" @tap="remindTarget">
          <text>{{ remindSent ? '已发送提醒' : '一键提醒对方完善资料' }}</text>
        </view>
      </view>

      <!-- 错误 -->
      <view v-else-if="status === 'error'" class="error-block">
        <text class="large-emoji">😵</text>
        <text class="block-title">{{ errorMsg }}</text>
        <view class="block-btn" @tap="retry">
          <text>重试</text>
        </view>
      </view>

      <!-- 结果 -->
      <view v-else-if="status === 'done' && report" class="result-block">
        <view class="result-scroll">
          <view class="result-inner">
            <!-- 总分 -->
            <view class="score-section">
              <view class="score-circle">
                <text class="score-num">{{ report.overallScore }}</text>
                <text class="score-unit">分</text>
              </view>
              <text class="score-label">缘分契合度</text>
            </view>

            <!-- 三维度 -->
            <view class="dimensions">
              <view class="dim-item">
                <view class="dim-bar-wrap">
                  <text class="dim-label">价值观</text>
                  <view class="dim-track">
                    <view class="dim-fill dim-fill-values" :style="{ width: (report.valuesScore || 0) + '%' }" />
                  </view>
                  <text class="dim-val">{{ report.valuesScore }}分</text>
                </view>
              </view>
              <view class="dim-item">
                <view class="dim-bar-wrap">
                  <text class="dim-label">生活方式</text>
                  <view class="dim-track">
                    <view class="dim-fill dim-fill-lifestyle" :style="{ width: (report.lifestyleScore || 0) + '%' }" />
                  </view>
                  <text class="dim-val">{{ report.lifestyleScore }}分</text>
                </view>
              </view>
              <view class="dim-item">
                <view class="dim-bar-wrap">
                  <text class="dim-label">未来规划</text>
                  <view class="dim-track">
                    <view class="dim-fill dim-fill-future" :style="{ width: (report.futurePlanScore || 0) + '%' }" />
                  </view>
                  <text class="dim-val">{{ report.futurePlanScore }}分</text>
                </view>
              </view>
            </view>

            <!-- AI 分析文字 -->
            <view v-if="report.analysis" class="analysis-block">
              <text class="analysis-label">✨ AI 分析</text>
              <text class="analysis-text">{{ report.analysis }}</text>
            </view>

            <!-- 建议 -->
            <view v-if="report.advice?.length" class="advice-block">
              <text class="advice-label">💡 相处建议</text>
              <view v-for="(adv, i) in report.advice" :key="i" class="advice-item">
                <text class="advice-num">{{ i + 1 }}</text>
                <text class="advice-text">{{ adv }}</text>
              </view>
            </view>

            <!-- 内容审核中 -->
            <view v-if="report.reviewStatus === 'pending'" class="review-notice">
              <text>⏳ 内容审核中，审核通过后展示</text>
            </view>
          </view>
        </view>

        <view class="panel-footer">
          <view class="footer-btn chat-btn" @tap="goToUserDetail">
            <text>查看详情 👤</text>
          </view>
          <view class="footer-btn close-footer" @tap="close">
            <text>收起</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'

interface AiMatchReport {
  overallScore: number
  valuesScore: number
  lifestyleScore: number
  futurePlanScore: number
  analysis: string
  advice: string[]
  reviewStatus: string
  errorCode?: string
}

const props = defineProps<{
  show: boolean
  targetUserId: number
  targetNickname: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const userStore = useUserStore()
const visible = ref(false)
const animating = ref(false)
const status = ref<'idle' | 'loading' | 'done' | 'ineligible' | 'error'>('idle')
const report = ref<AiMatchReport | null>(null)
const errorMsg = ref('')
const errorReasons = ref<string[]>([])
const remindSent = ref(false)
const selfCompleteness = ref(0)
const targetCompleteness = ref(0)
const insufficientSide = ref<'self' | 'target' | 'both' | null>(null)

/** 判断是否自己的资料有问题 */
const hasMyIssue = computed(() => insufficientSide.value === 'self' || insufficientSide.value === 'both')
/** 判断是否对方的资料有问题 */
const hasTaIssue = computed(() => insufficientSide.value === 'target' || insufficientSide.value === 'both')

const completenessPercent = computed(() => {
  if (insufficientSide.value === 'self') return selfCompleteness.value
  if (insufficientSide.value === 'target') return targetCompleteness.value
  return 0
})

const selfDescText = computed(() => {
  if (hasTaIssue.value) {
    return '您和对方的资料都需要完善，完成后即可解锁AI缘分分析'
  }
  return `您的资料完善度为 ${selfCompleteness.value}%，需要达到 60% 以上才能使用AI缘分分析。完善资料包括：上传头像、填写基础信息、选择个性标签、回答问答话题。`
})

/** 根据 incomplete 情况生成标题 */
const ineligibleTitle = computed(() => {
  const pct = completenessPercent.value
  if (insufficientSide.value === 'both') return `双方资料完善度均不足 60%`
  if (insufficientSide.value === 'target') return `对方资料完善度 ${pct}%`
  if (insufficientSide.value === 'self') return `您的资料完善度 ${pct}%`
  return '资料完整度不足'
})

watch(() => props.show, async (val) => {
  if (val) {
    visible.value = true
    await nextTick()
    animating.value = true
    loadReport()
  } else {
    animating.value = false
    setTimeout(() => { visible.value = false }, 300)
  }
})

const close = () => emit('update:show', false)

const loadReport = async () => {
  status.value = 'loading'
  try {
    // 先查已有的报告
    const existing = await request({ url: `/ai/match/report/${props.targetUserId}`, method: 'GET' })
    if (existing && (existing as any).overallScore !== undefined) {
      report.value = existing as AiMatchReport
      status.value = 'done'
      return
    }
    // 生成
    const res = await request({ url: `/ai/match/analyze/${props.targetUserId}`, method: 'POST' })
    if (res && (res as any).overallScore !== undefined) {
      report.value = res as AiMatchReport
      status.value = 'done'
    } else {
      errorMsg.value = '分析失败，请稍后重试'
      status.value = 'error'
    }
  } catch (e: any) {
    const msg = e?.message || e?.data?.message || ''
    const errData = e?.data || {}
    const reasons: string[] = errData?.reasons || []

    if (msg.includes('次数') || msg.includes('用完') || msg.includes('限流') || msg.includes('ULIMITED') || msg.includes('LIMITED')) {
      errorMsg.value = '今日分析次数已用完'
      status.value = 'ineligible'
    } else if (msg.includes('资料') || msg.includes('标签') || msg.includes('问答') || msg.includes('资格') || msg.includes('无权') || reasons.length > 0 || errData?.insufficientSide) {
      errorMsg.value = '资料完整度不足'
      errorReasons.value = reasons.length > 0 ? reasons : ['请完善个人资料']
      selfCompleteness.value = errData?.selfCompleteness || 0
      targetCompleteness.value = errData?.targetCompleteness || 0
      insufficientSide.value = errData?.insufficientSide || null
      remindSent.value = errData?.hasReminded || false
      status.value = 'ineligible'
    } else {
      errorMsg.value = msg || '网络异常，请重试'
      status.value = 'error'
    }
  }
}

const retry = () => loadReport()

const goImproveProfile = () => {
  close()
  setTimeout(() => {
    uni.navigateTo({ url: '/pages/edit-profile/index' })
  }, 300)
}

const remindTarget = async () => {
  if (remindSent.value) return
  try {
    const res: any = await request({
      url: `/ai/match/remind/${props.targetUserId}`,
      method: 'POST',
    })
    if (res?.sent) {
      remindSent.value = true
      uni.showToast({ title: '已提醒对方完善资料', icon: 'success' })
    } else {
      uni.showToast({ title: '24小时内已提醒过，请稍后再试', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}

const goToUserDetail = () => {
  close()
  setTimeout(() => {
    uni.navigateTo({
      url: `/pages/user-detail/index?id=${props.targetUserId}`,
    })
  }, 300)
}

function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 30))
}

onMounted(() => {
  if (props.show) {
    visible.value = true
    nextTick().then(() => {
      animating.value = true
      loadReport()
    })
  }
})
</script>

<style lang="scss" scoped>
$pink: #FF6B8A;
$pink-light: #FF8FA8;
$pink-lighter: #FFB6C1;
$pink-bg: #FFF5F7;
$pink-border: #FFE4E9;

.ai-match-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: flex-end;
}

.ai-match-panel {
  width: 100%; max-height: 85vh;
  background: linear-gradient(180deg, #FFF0F5 0%, #FFF8FA 100%);
  border-radius: 32rpx 32rpx 0 0;
  display: flex; flex-direction: column;
  box-sizing: border-box;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  &.slideUp { transform: translateY(0); }
}

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 32rpx 32rpx 20rpx;
  flex-shrink: 0;
  box-sizing: border-box;
}
.panel-title { font-size: 34rpx; font-weight: bold; color: #1A1A1A; }
.close-btn {
  width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F5F5;
  display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #999;
}

// ===== 加载 =====
.loading-block {
  display: flex; flex-direction: column; align-items: center;
  padding: 80rpx 32rpx 100rpx;
}
.pulse-ring {
  width: 100rpx; height: 100rpx; border-radius: 50%;
  border: 4rpx solid $pink; border-top-color: transparent;
  animation: spin 1s linear infinite; margin-bottom: 32rpx;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 30rpx; color: #1A1A1A; font-weight: bold; margin-bottom: 12rpx; }
.loading-sub { font-size: 24rpx; color: #999; }

// ===== 无资格/错误 =====
.ineligible-block, .error-block {
  display: flex; flex-direction: column; align-items: center;
  padding: 80rpx 48rpx 100rpx; text-align: center;
}
.large-emoji { font-size: 72rpx; margin-bottom: 24rpx; }
.block-title { font-size: 30rpx; color: #1A1A1A; font-weight: bold; margin-bottom: 12rpx; line-height: 1.5; }
.block-desc { font-size: 26rpx; color: #999; margin-bottom: 40rpx; max-width: 100%; word-break: break-word; }
.block-btn {
  padding: 20rpx 60rpx; border-radius: 40rpx;
  background: linear-gradient(135deg, $pink, $pink-light);
  font-size: 28rpx; color: #fff;
  margin-bottom: 16rpx;
}
.remind-btn {
  background: linear-gradient(135deg, #4A90E2, #7C3AED);
}

.reasons-list {
  width: 100%; padding: 16rpx 24rpx; margin-bottom: 16rpx;
  background: #FFF8F0; border-radius: 12rpx; text-align: left;
  box-sizing: border-box;
}
.reason-item { display: flex; gap: 8rpx; margin-bottom: 8rpx; }
.reason-dot { font-size: 26rpx; color: #FF9500; line-height: 1.6; flex-shrink: 0; }
.reason-text { font-size: 26rpx; color: #666; line-height: 1.6; flex: 1; word-break: break-word; }

// ===== 结果 =====
.result-block {
  flex: 1; min-height: 0;
  display: flex; flex-direction: column;
  box-sizing: border-box;
}
.result-scroll {
  flex: 1; min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}
.result-inner {
  padding: 0 32rpx 16rpx;
  box-sizing: border-box;
}

// 总分区域
.score-section {
  display: flex; flex-direction: column; align-items: center;
  padding: 24rpx 0 32rpx;
  box-sizing: border-box;
}
.score-circle {
  width: 160rpx; height: 160rpx; border-radius: 50%;
  border: 6rpx solid transparent;
  background-image: linear-gradient(#FFF0F5, #FFF0F5),
    linear-gradient(135deg, $pink, $pink-light);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  margin-bottom: 16rpx;
}
.score-num { font-size: 56rpx; font-weight: bold; color: $pink; }
.score-unit { font-size: 24rpx; color: #999; }
.score-label { font-size: 26rpx; color: #666; }

// 维度进度条
.dimensions {
  padding: 0 0 24rpx;
  box-sizing: border-box;
  max-width: 100%;
}
.dim-item {
  margin-bottom: 20rpx;
  max-width: 100%;
}
.dim-bar-wrap {
  display: flex; align-items: center; gap: 12rpx;
  margin-bottom: 6rpx;
  max-width: 100%;
}
.dim-label {
  font-size: 26rpx; color: #333; flex-shrink: 0; width: 75rpx;
}
.dim-track {
  flex: 1; height: 12rpx; background: $pink-border;
  border-radius: 6rpx; overflow: hidden;
  max-width: 100%;
}
.dim-fill {
  height: 100%; border-radius: 6rpx; transition: width 0.6s ease;
}
.dim-fill-values { background: $pink; }
.dim-fill-lifestyle { background: $pink-light; }
.dim-fill-future { background: $pink-lighter; }
.dim-val {
  font-size: 24rpx; color: #999; flex-shrink: 0; width: 55rpx; text-align: right;
}

// AI 分析卡片
.analysis-block {
  margin-bottom: 20rpx;
  background: #fff;
  border: 1rpx solid $pink-border;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(255, 107, 138, 0.1);
  box-sizing: border-box;
  max-width: 100%;
}
.analysis-label {
  font-size: 26rpx; font-weight: bold; color: #333;
  margin-bottom: 12rpx; display: block;
}
.analysis-text {
  font-size: 26rpx; color: #666; line-height: 1.7;
  word-break: break-word; overflow-wrap: break-word;
  max-width: 100%;
}

// 相处建议卡片
.advice-block {
  margin-bottom: 20rpx;
  background: #fff;
  border: 1rpx solid $pink-border;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(255, 107, 138, 0.1);
  box-sizing: border-box;
  max-width: 100%;
}
.advice-label {
  font-size: 26rpx; font-weight: bold; color: #333;
  margin-bottom: 14rpx; display: block;
}
.advice-item {
  display: flex; gap: 12rpx; margin-bottom: 12rpx;
  max-width: 100%;
  &:last-child { margin-bottom: 0; }
}
.advice-num {
  width: 36rpx; height: 36rpx; border-radius: 50%;
  background: linear-gradient(135deg, $pink, $pink-light);
  color: #fff; font-size: 22rpx;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 4rpx;
}
.advice-text {
  font-size: 26rpx; color: #666; line-height: 1.6;
  flex: 1; word-break: break-word; overflow-wrap: break-word;
  max-width: 100%;
}

.review-notice {
  padding: 20rpx; background: #FFF8E1; border-radius: 12rpx;
  font-size: 24rpx; color: #F57F17; text-align: center; margin: 16rpx 0;
  box-sizing: border-box;
}

// 底部按钮
.panel-footer {
  display: flex; gap: 20rpx;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid $pink-border;
  background: #fff;
  flex-shrink: 0;
  box-sizing: border-box;
}
.footer-btn {
  flex: 1; height: 88rpx; border-radius: 44rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 30rpx; font-weight: bold;
}
.chat-btn {
  background: linear-gradient(135deg, $pink, $pink-light); color: #fff;
}
.close-footer {
  background: #F5F5F5; color: #666;
  border: 1rpx solid #EEE;
}
</style>
