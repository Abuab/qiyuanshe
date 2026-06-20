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
        <text class="block-title">{{ errorMsg }}</text>
        <view v-if="errorReasons.length" class="reasons-list">
          <view v-for="(r, i) in errorReasons" :key="i" class="reason-item">
            <text class="reason-dot">•</text>
            <text class="reason-text">{{ r }}</text>
          </view>
        </view>
        <text class="block-desc">完善资料后即可解锁AI缘分分析</text>
        <view class="block-btn" @tap="goImproveProfile">
          <text>去完善资料</text>
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
        <scroll-view class="result-scroll" scroll-y :enhanced="true" :show-scrollbar="false">
          <!-- 总分 -->
          <view class="score-section">
            <view class="score-circle" :style="{ borderColor: getScoreColor(report.overallScore) }">
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
                <text class="dim-val">{{ report.valuesScore }}分</text>
              </view>
              <view class="dim-track">
                <view class="dim-fill" :style="{ width: (report.valuesScore || 0) + '%', background: '#FF6B8A' }" />
              </view>
            </view>
            <view class="dim-item">
              <view class="dim-bar-wrap">
                <text class="dim-label">生活方式</text>
                <text class="dim-val">{{ report.lifestyleScore }}分</text>
              </view>
              <view class="dim-track">
                <view class="dim-fill" :style="{ width: (report.lifestyleScore || 0) + '%', background: '#4A90E2' }" />
              </view>
            </view>
            <view class="dim-item">
              <view class="dim-bar-wrap">
                <text class="dim-label">未来规划</text>
                <text class="dim-val">{{ report.futurePlanScore }}分</text>
              </view>
              <view class="dim-track">
                <view class="dim-fill" :style="{ width: (report.futurePlanScore || 0) + '%', background: '#7C3AED' }" />
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
        </scroll-view>

        <view class="panel-footer">
          <view class="footer-btn chat-btn" @tap="goChat">
            <text>去聊聊 💬</text>
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
import { ref, watch, onMounted } from 'vue'
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
    const reasons: string[] = e?.data?.reasons || []

    if (msg.includes('次数') || msg.includes('用完') || msg.includes('限流') || msg.includes('ULIMITED') || msg.includes('LIMITED')) {
      errorMsg.value = '今日分析次数已用完'
      status.value = 'ineligible'
    } else if (msg.includes('资料') || msg.includes('标签') || msg.includes('问答') || msg.includes('资格') || msg.includes('无权') || reasons.length > 0) {
      errorMsg.value = '资料完整度不足'
      errorReasons.value = reasons.length > 0 ? reasons : ['请完善个人资料并完成至少3个标签选择和3条问答']
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
    uni.navigateTo({ url: '/pages/my/profile/index' })
  }, 300)
}

const goChat = () => {
  close()
  setTimeout(() => {
    if (!userStore.isVip) {
      uni.switchTab({ url: '/pages/vip/index' })
      return
    }
    uni.navigateTo({
      url: `/pages/chat/index?userId=${props.targetUserId}&nickname=${encodeURIComponent(props.targetNickname)}`,
    })
  }, 300)
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#FF6B8A'
  if (score >= 60) return '#FF9500'
  return '#4A90E2'
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

.ai-match-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: flex-end;
}

.ai-match-panel {
  width: 100%; max-height: 85vh;
  background: #fff; border-radius: 32rpx 32rpx 0 0;
  display: flex; flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  &.slideUp { transform: translateY(0); }
}

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 32rpx 32rpx 20rpx;
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
.block-desc { font-size: 26rpx; color: #999; margin-bottom: 40rpx; }
.block-btn {
  padding: 20rpx 60rpx; border-radius: 40rpx;
  background: linear-gradient(135deg, $pink, $pink-light);
  font-size: 28rpx; color: #fff;
}

.reasons-list {
  width: 100%; padding: 16rpx 24rpx; margin-bottom: 16rpx;
  background: #FFF8F0; border-radius: 12rpx; text-align: left;
}
.reason-item { display: flex; gap: 8rpx; margin-bottom: 8rpx; }
.reason-dot { font-size: 26rpx; color: #FF9500; line-height: 1.6; }
.reason-text { font-size: 26rpx; color: #666; line-height: 1.6; }

// ===== 结果 =====
.result-block { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.result-scroll { flex: 1; padding: 0 32rpx; }

.score-section {
  display: flex; flex-direction: column; align-items: center; padding: 20rpx 0 32rpx;
}
.score-circle {
  width: 160rpx; height: 160rpx; border-radius: 50%;
  border: 6rpx solid; display: flex; flex-direction: column;
  align-items: center; justify-content: center; margin-bottom: 16rpx;
}
.score-num { font-size: 56rpx; font-weight: bold; color: #1A1A1A; }
.score-unit { font-size: 24rpx; color: #999; }
.score-label { font-size: 26rpx; color: #666; }

.dimensions { padding: 0 0 24rpx; }
.dim-item { margin-bottom: 20rpx; }
.dim-bar-wrap { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.dim-label { font-size: 26rpx; color: #333; }
.dim-val { font-size: 24rpx; color: #999; }
.dim-track {
  height: 10rpx; background: #F0F0F0; border-radius: 5rpx; overflow: hidden;
}
.dim-fill { height: 100%; border-radius: 5rpx; transition: width 0.6s ease; }

.analysis-block, .advice-block {
  padding: 24rpx 0; border-top: 1rpx solid #F0F0F0;
}
.analysis-label, .advice-label {
  font-size: 26rpx; font-weight: bold; color: #333; margin-bottom: 14rpx; display: block;
}
.analysis-text {
  font-size: 26rpx; color: #666; line-height: 1.7;
}
.advice-item { display: flex; gap: 12rpx; margin-bottom: 12rpx; }
.advice-num {
  width: 36rpx; height: 36rpx; border-radius: 50%;
  background: linear-gradient(135deg, $pink, $pink-light);
  color: #fff; font-size: 22rpx; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 4rpx;
}
.advice-text { font-size: 26rpx; color: #666; line-height: 1.6; flex: 1; }

.review-notice {
  padding: 20rpx; background: #FFF8E1; border-radius: 12rpx;
  font-size: 24rpx; color: #F57F17; text-align: center; margin: 16rpx 0;
}

.panel-footer {
  display: flex; gap: 20rpx; padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #F0F0F0;
}
.footer-btn {
  flex: 1; height: 88rpx; border-radius: 44rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 30rpx; font-weight: bold;
}
.chat-btn { background: linear-gradient(135deg, $pink, $pink-light); color: #fff; }
.close-footer { background: #F5F5F5; color: #666; }
</style>
