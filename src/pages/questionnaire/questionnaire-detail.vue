<template>
  <view class="questionnaire-detail-page">
    <!-- 顶部进度条 -->
    <view class="progress-bar">
      <view class="progress-fill" :style="{ width: progressPercent + '%' }" />
    </view>

    <view class="page-body">
      <!-- 题号 -->
      <text class="q-num">Q{{ currentIndex + 1 }}/{{ total }}</text>

      <!-- 题目 -->
      <text class="q-title">{{ currentQuestion?.title }}</text>

      <!-- 选项区 -->
      <view class="options-area" v-if="currentQuestion">
        <view
          v-for="(opt, optIndex) in currentQuestion.options"
          :key="optIndex"
          class="option-item"
          :class="{ selected: selectedOption === optIndex }"
          @tap="selectOption(optIndex)"
        >
          <view class="option-radio" :class="{ checked: selectedOption === optIndex }">
            <view v-if="selectedOption === optIndex" class="radio-check" />
          </view>
          <text class="option-text">{{ opt }}</text>
        </view>
      </view>
    </view>

    <!-- 底部悬浮按钮 -->
    <view class="bottom-bar">
      <view class="safe-bottom" />
      <view
        class="btn-next"
        :class="{ active: selectedOption !== null }"
        @tap="onNext"
      >
        <text>{{ isLast ? '查看匹配结果' : selectedOption === null ? '请选择' : '下一题' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import request from '@/utils/request'

interface Question {
  title: string
  options: string[]
}

const questionnaireId = ref(0)
const targetUserId = ref(0)
const questions = ref<Question[]>([])
const currentIndex = ref(0)
const selectedOption = ref<number | null>(null)
const answers = ref<number[]>([])

const total = computed(() => questions.value.length)
const isLast = computed(() => currentIndex.value >= total.value - 1)
const currentQuestion = computed(() => questions.value[currentIndex.value] || null)
const progressPercent = computed(() => {
  if (total.value === 0) return 0
  return ((currentIndex.value) / total.value) * 100
})

function selectOption(index: number) {
  selectedOption.value = index
}

function onNext() {
  if (selectedOption.value === null) return

  answers.value.push(selectedOption.value)

  if (isLast.value) {
    submitAnswers()
  } else {
    currentIndex.value++
    selectedOption.value = null
  }
}

async function submitAnswers() {
  uni.showLoading({ title: '提交中...', mask: true })
  try {
    const body: any = {
      questionnaireId: questionnaireId.value,
      answers: answers.value,
    }
    if (targetUserId.value) {
      body.targetUserId = targetUserId.value
    }
    const res: any = await request({
      url: '/api/questionnaire/submit',
      method: 'POST',
      data: body,
    })
    if (res.code === 0 && res.data) {
      const resultId = res.data.resultId || res.data.id
      let url = `/pages/questionnaire/questionnaire-result?id=${resultId}`
      if (targetUserId.value) {
        url += `&targetUserId=${targetUserId.value}`
      }
      uni.redirectTo({ url })
    } else {
      uni.showToast({ title: res.message || '提交失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '提交失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  const opts = (pages[pages.length - 1] as any)?.options || {}
  if (opts.id) questionnaireId.value = parseInt(opts.id)
  if (opts.targetUserId) targetUserId.value = parseInt(opts.targetUserId)

  // 加载问卷题目
  fetchQuestions()
})

async function fetchQuestions() {
  try {
    const res: any = await request({
      url: `/api/questionnaire/${questionnaireId.value}`,
      method: 'GET',
    })
    if (res.code === 0 && res.data) {
      questions.value = res.data.questions || []
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.questionnaire-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 160rpx;
}

/* ===== 进度条 ===== */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 8rpx;
  background: #eeeeee;
  z-index: 100;
}

.progress-fill {
  height: 100%;
  background: #ff6b6b;
  border-radius: 4rpx;
  transition: width 300ms ease;
}

/* ===== 页面主体 ===== */
.page-body {
  padding-top: 48rpx;
}

.q-num {
  margin-top: 48rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #999999;
}

.q-title {
  margin-top: 48rpx;
  padding: 0 24rpx;
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
  line-height: 1.6;
}

.options-area {
  margin-top: 48rpx;
  padding: 0 24rpx;
}

.option-item {
  margin-bottom: 24rpx;
  padding: 0 24rpx;
  height: 120rpx;
  border-radius: 16rpx;
  border: 2rpx solid #eeeeee;
  background: #ffffff;
  display: flex;
  align-items: center;

  &.selected {
    border-color: #ff6b6b;
    background: #fff0f3;
  }
}

.option-radio {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #999999;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.checked {
    border-color: #ff6b6b;
    background: #ff6b6b;
  }
}

.radio-check {
  width: 12rpx;
  height: 8rpx;
  border-left: 2rpx solid #ffffff;
  border-bottom: 2rpx solid #ffffff;
  transform: rotate(-45deg);
  margin-top: -2rpx;
}

.option-text {
  margin-left: 24rpx;
  font-size: 30rpx;
  color: #333333;
}

/* ===== 底部悬浮按钮 ===== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: #ffffff;
  padding: 0 24rpx 24rpx;
}

.safe-bottom {
  height: 24rpx;
}

.btn-next {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  background: #cccccc;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 32rpx;
  color: #ffffff;

  &.active {
    background: #ff6b6b;
  }
}
</style>
