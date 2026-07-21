<template>
  <view class="ptest-page">
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-level1">
        <view class="nav-left" @tap="goBack">
          <text class="back-icon">←</text>
        </view>
        <text class="nav-title">人格测试</text>
        <view class="nav-right" />
      </view>
    </view>

    <view v-if="loading" class="loading-box">
      <text class="loading-text">题目加载中…</text>
    </view>

    <block v-else-if="questions.length > 0">
      <!-- 进度 -->
      <view class="progress-head">
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }" />
        </view>
        <text class="progress-text">{{ currentIndex + 1 }} / {{ questions.length }}</text>
      </view>

      <view
        class="q-swipe"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
      >
        <view :key="currentIndex" class="q-card card-anim">
          <text class="q-dim">{{ currentQuestion.dimensionName }}</text>
          <text class="q-content">{{ currentQuestion.content }}</text>

          <view class="opt-list">
            <view
              v-for="opt in currentQuestion.options"
              :key="opt.optionId"
              class="opt-item"
              :class="{ 'opt-active': answers[currentQuestion.questionId] === opt.optionId }"
              @tap="choose(opt.optionId)"
            >
              <text class="opt-text">{{ opt.content }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="foot-bar">
        <view v-if="currentIndex > 0" class="btn-prev" @tap="prev">上一题</view>
        <text v-else class="foot-tip">选择答案后自动进入下一题</text>
      </view>
    </block>

    <view v-else class="empty-box">
      <text class="empty-text">题库暂未配置，请稍后再试</text>
    </view>

    <!-- 分析中遮罩 -->
    <view v-if="analyzing" class="analyzing-mask">
      <view class="analyzing-spinner" />
      <text class="analyzing-text">正在分析性格…</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import request, { get, post } from '@/utils/request'
import { useUserStore } from '@/store/user'
import {
  ensureGuestToken,
  getGuestToken,
  saveLocalProgress,
  loadLocalProgress,
  clearLocalProgress,
  cacheQuestions,
  loadCachedQuestions,
  clearQuestionsCache,
} from '@/utils/personality'

interface QOption { optionId: number; content: string }
interface Question {
  questionId: number
  dimensionCode: string
  dimensionName: string
  content: string
  options: QOption[]
}

const userStore = useUserStore()
const isLoggedIn = computed(() => userStore.isLoggedIn)

const statusBarHeight = ref(20)
const loading = ref(true)
const analyzing = ref(false)
const submitting = ref(false)
const questions = ref<Question[]>([])
const sessionId = ref('')
const minDurationSeconds = ref(0)
const currentIndex = ref(0)
const answers = ref<Record<number, number>>({})
const answeredAt = ref<Record<number, number>>({})
const startedAt = ref(0)
let isRetest = false
let advanceTimer: ReturnType<typeof setTimeout> | null = null

const currentQuestion = computed(() => questions.value[currentIndex.value] || ({} as Question))
const isLast = computed(() => currentIndex.value === questions.value.length - 1)
const progressPercent = computed(() =>
  questions.value.length ? Math.round(((currentIndex.value + 1) / questions.value.length) * 100) : 0,
)

onLoad((opts: any) => {
  const sys = uni.getWindowInfo() as any
  statusBarHeight.value = sys.statusBarHeight || 20
  isRetest = opts?.retest === '1'
  // 重测不恢复缓存；否则若存在未完成进度，询问「继续答题 / 重新开始」
  if (!isRetest) {
    const saved = loadLocalProgress()
    if (saved && Array.isArray(saved.questions) && saved.questions.length > 0) {
      loading.value = false
      uni.showModal({
        title: '继续上次测试？',
        content: '检测到你有未完成的测试进度，是否继续作答？',
        confirmText: '继续答题',
        cancelText: '重新开始',
        success: (r) => {
          if (r.confirm) {
            restoreSaved(saved)
          } else {
            clearLocalProgress()
            loadQuestions()
          }
        },
        fail: () => restoreSaved(saved),
      })
      return
    }
  }
  loadQuestions()
})

function restoreSaved(saved: ReturnType<typeof loadLocalProgress>) {
  if (!saved) { loadQuestions(); return }
  questions.value = saved.questions
  sessionId.value = saved.sessionId
  answers.value = saved.answers || {}
  answeredAt.value = saved.answeredAt || {}
  currentIndex.value = Math.min(saved.currentIndex || 0, saved.questions.length - 1)
  startedAt.value = saved.startedAt || Date.now()
  minDurationSeconds.value = saved.minDurationSeconds || 0
  loading.value = false
}

async function loadQuestions() {
  loading.value = true
  try {
    // 游客：先确保 token
    let guestToken = ''
    if (!isLoggedIn.value) {
      guestToken = await ensureGuestToken()
    }
    let res: any
    if (isRetest) {
      // 重测：始终拉取新题并清理旧缓存
      clearQuestionsCache()
      res = await post('/personality/retest', guestToken ? { guestToken } : {})
    } else {
      // 首次进入：优先使用本地题库缓存，避免重复请求
      const cached = loadCachedQuestions(isLoggedIn.value)
      res = cached || (await get('/personality/questions', guestToken ? { guestToken } : undefined))
    }
    questions.value = res?.questions || []
    sessionId.value = res?.sessionId || ''
    minDurationSeconds.value = res?.minDurationSeconds || 0
    currentIndex.value = 0
    answers.value = {}
    answeredAt.value = {}
    startedAt.value = Date.now()
    // 缓存题库（供下次首次进入复用）
    if ((res?.questions || []).length > 0) cacheQuestions(res, isLoggedIn.value)
    if (isRetest) clearLocalProgress()
    persist()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function persist() {
  if (questions.value.length === 0) return
  saveLocalProgress({
    sessionId: sessionId.value,
    questions: questions.value,
    answers: answers.value,
    answeredAt: answeredAt.value,
    currentIndex: currentIndex.value,
    startedAt: startedAt.value,
    minDurationSeconds: minDurationSeconds.value,
    updatedAt: Date.now(),
  })
  // 弱网优化：本地已保存，另尝试静默同步到后端（失败忽略，不阻塞）
  const answerList = questions.value
    .filter((q) => answers.value[q.questionId])
    .map((q) => ({
      questionId: q.questionId,
      optionId: answers.value[q.questionId],
      answeredAt: answeredAt.value[q.questionId] || Date.now(),
    }))
  if (answerList.length > 0) {
    const payload: any = { sessionId: sessionId.value, answers: answerList }
    if (!isLoggedIn.value) payload.guestToken = getGuestToken()
    request({ url: '/personality/progress', method: 'POST', data: payload, skipToast: true }).catch(() => {})
  }
}

function choose(optionId: number) {
  const qid = currentQuestion.value.questionId
  answers.value[qid] = optionId
  answeredAt.value[qid] = Date.now()
  persist()
  // 防抖：260ms 内多次点击（改选答案）只保留最后一次跳转，避免跳过题目
  if (advanceTimer) clearTimeout(advanceTimer)
  advanceTimer = setTimeout(() => {
    advanceTimer = null
    if (isLast.value) {
      submit()
    } else {
      currentIndex.value++
      persist()
    }
  }, 260)
}

function prev() {
  if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null }
  if (currentIndex.value > 0) {
    currentIndex.value--
    persist()
  }
}

// ===== 滑动手势：右滑返回上一题（返回修改） =====
let touchStartX = 0
let touchStartY = 0
function onTouchStart(e: any) {
  const t = e.touches?.[0] || e.changedTouches?.[0]
  touchStartX = t?.clientX || 0
  touchStartY = t?.clientY || 0
}
function onTouchEnd(e: any) {
  const t = e.changedTouches?.[0]
  if (!t) return
  const dx = (t.clientX || 0) - touchStartX
  const dy = (t.clientY || 0) - touchStartY
  if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) prev() // 右滑 → 上一题
  }
}

async function submit() {
  if (submitting.value) return
  // 最短作答时长（反作弊）：未达标时不弹提示、不卡在最后一题，
  // 直接进入分析态，等剩余时间到后自动提交（服务端最终裁定）
  const elapsed = (Date.now() - startedAt.value) / 1000
  if (minDurationSeconds.value && elapsed < minDurationSeconds.value) {
    submitting.value = true
    analyzing.value = true
    const remainMs = Math.ceil((minDurationSeconds.value - elapsed) * 1000)
    setTimeout(() => {
      submitting.value = false
      submit()
    }, remainMs)
    return
  }
  submitting.value = true
  analyzing.value = true
  const analyzeStart = Date.now()
  try {
    const guestToken = isLoggedIn.value ? '' : getGuestToken()
    const payload: any = {
      sessionId: sessionId.value,
      startedAt: startedAt.value,
      answers: questions.value.map((q) => ({
        questionId: q.questionId,
        optionId: answers.value[q.questionId],
        answeredAt: answeredAt.value[q.questionId] || Date.now(),
      })),
    }
    if (guestToken) payload.guestToken = guestToken
    await request({ url: '/personality/submit', method: 'POST', data: payload })
    clearLocalProgress()
    // 分析动画至少持续 1.5s
    const wait = Math.max(0, 1500 - (Date.now() - analyzeStart))
    setTimeout(() => {
      analyzing.value = false
      uni.redirectTo({ url: '/subpkg-pages/personality/result' })
    }, wait)
  } catch (e: any) {
    analyzing.value = false
    submitting.value = false
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  }
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.ptest-page {
  min-height: 100vh;
  background: #fff5f7;
  display: flex;
  flex-direction: column;
}
.nav-wrap {
  background: #ffffff;
}
.nav-level1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.nav-left, .nav-right { width: 80rpx; height: 88rpx; display: flex; align-items: center; flex-shrink: 0; }
.nav-left { justify-content: flex-start; }
.nav-right { justify-content: flex-end; }
.back-icon { font-size: 40rpx; color: #333; font-weight: bold; line-height: 1; }
.nav-title { flex: 1; text-align: center; font-size: 32rpx; color: #333; font-weight: 600; }

.loading-box, .empty-box { flex: 1; display: flex; align-items: center; justify-content: center; }
.loading-text, .empty-text { color: #999; font-size: 28rpx; }

.progress-head { padding: 24rpx 40rpx 8rpx; }
.progress-bar { height: 12rpx; border-radius: 6rpx; background: #ffe0ea; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 6rpx; background: #ff6b9d; transition: width 300ms ease; }
.progress-text { display: block; margin-top: 12rpx; text-align: right; font-size: 24rpx; color: #999; }

.q-swipe { flex: 1; }
.q-card { margin: 24rpx 40rpx; padding: 48rpx 32rpx; background: #fff; border-radius: 24rpx; }
.card-anim { animation: cardIn 280ms ease; }
@keyframes cardIn {
  from { opacity: 0; transform: translateX(40rpx); }
  to { opacity: 1; transform: translateX(0); }
}
.q-dim { display: inline-block; padding: 6rpx 18rpx; border-radius: 20rpx; background: #fff0f3; color: #ff6b9d; font-size: 22rpx; }
.q-content { display: block; margin-top: 28rpx; font-size: 36rpx; color: #333; font-weight: 600; line-height: 1.5; text-align: center; }

.opt-list { margin-top: 56rpx; }
.opt-item {
  padding: 36rpx 28rpx;
  margin-bottom: 28rpx;
  border-radius: 20rpx;
  background: #f7f7f9;
  border: 2rpx solid transparent;
  transition: all 160ms ease;
}
.opt-active { background: #fff0f3; border-color: #ff6b9d; }
.opt-text { font-size: 30rpx; color: #333; }

.foot-bar { display: flex; align-items: center; justify-content: center; padding: 24rpx 40rpx calc(24rpx + env(safe-area-inset-bottom)); }
.foot-tip { font-size: 24rpx; color: #bbb; }
.btn-prev {
  width: 100%; height: 88rpx; border-radius: 44rpx; display: flex; align-items: center; justify-content: center;
  background: #fff; border: 1rpx solid #ff6b9d; color: #ff6b9d; font-size: 30rpx;
}

/* 分析中遮罩 */
.analyzing-mask {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(255, 245, 247, 0.96);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.analyzing-spinner {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  border: 6rpx solid #ffd6e4; border-top-color: #ff6b9d;
  animation: spin 800ms linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.analyzing-text { margin-top: 28rpx; font-size: 30rpx; color: #ff6b9d; }
</style>
