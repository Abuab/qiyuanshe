<template>
  <view class="match-report-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon iconfont icon-back"></text>
        </view>
        <text class="nav-title">我的匹配报告</text>
        <view class="nav-right"></view>
      </view>
    </view>

    <view class="page-body" :style="{ paddingTop: navTotalHeight + 'px' }">
      <!-- 加载中 -->
      <view v-if="loading" class="state-box">
        <view class="spinner"></view>
        <text class="state-text">报告加载中...</text>
      </view>

      <!-- 未生成 -->
      <view v-else-if="!report" class="state-box">
        <view class="empty-icon">📊</view>
        <text class="state-text">{{ emptyText }}</text>
        <view
          class="btn-generate"
          :class="{ disabled: !canGenerate }"
          @tap="handleGenerate"
        >
          {{ generating ? '生成中...' : generateBtnText }}
        </view>
      </view>

      <!-- 报告内容 -->
      <view v-else class="report-content">
        <!-- 健康度评分 -->
        <view class="card score-card">
          <text class="score-label">择偶标准健康度</text>
          <view class="score-row">
            <text class="score-num">{{ report.healthScore }}</text>
            <text class="score-unit">分</text>
          </view>
          <view class="score-level" :class="levelClass">{{ report.healthLevel }}</view>
          <view v-for="(advice, i) in report.healthAdvice" :key="i" class="advice-item">
            <text class="advice-dot">·</text>
            <text class="advice-text">{{ advice }}</text>
          </view>
        </view>

        <!-- 个人画像标签 -->
        <view class="card">
          <text class="card-title">个人画像</text>
          <view class="tag-list">
            <text v-for="(tag, i) in report.tags" :key="i" class="tag-chip">{{ tag }}</text>
          </view>
        </view>

        <!-- 匹配池实况 -->
        <view class="card">
          <text class="card-title">平台匹配池实况</text>
          <text class="pool-text">{{ report.matchingPool.text }}</text>
        </view>

        <!-- TOP3 推荐 -->
        <view class="card">
          <text class="card-title">为你精选 TOP3</text>
          <view v-if="report.top3.length === 0" class="top3-empty">暂无可展示的推荐</view>
          <view v-else class="top3-list">
            <view v-for="(item, i) in report.top3" :key="i" class="top3-item">
              <view class="top3-avatar-wrap">
                <image
                  v-if="item.avatar"
                  class="top3-avatar blur"
                  :src="getFullImageUrl(item.avatar)"
                  mode="aspectFill"
                />
                <view v-else class="top3-avatar placeholder blur">
                  <text class="placeholder-text">?</text>
                </view>
              </view>
              <text class="top3-name">{{ item.nickname }}</text>
              <view class="top3-tags">
                <text v-for="(t, ti) in item.tags" :key="ti" class="top3-tag">{{ t }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 综合匹配指数雷达图 -->
        <view class="card">
          <text class="card-title">综合匹配指数</text>
          <view class="radar-wrap">
            <RadarChart
              canvas-id="report-radar"
              :values="radarValues"
              :labels="radarLabels"
              :size="280"
            />
          </view>
        </view>

        <!-- 个人提升建议 -->
        <view class="card">
          <text class="card-title">个人提升建议</text>
          <view v-for="(s, i) in report.suggestions" :key="i" class="suggestion-item">
            <text class="suggestion-index">{{ i + 1 }}</text>
            <text class="suggestion-text">{{ s }}</text>
          </view>
        </view>

        <!-- 生成分享卡片 -->
        <view class="btn-share" @tap="goShare">
          <text>生成分享卡片</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { get, post } from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { safeNavigateBack } from '@/utils/navigate'
import { useUserStore } from '@/store/user'
import RadarChart from '@/components/radar-chart/radar-chart.vue'

interface Top3Item {
  nickname: string
  avatar: string
  tags: string[]
}

interface MatchReport {
  id: number
  quotaNo: number
  createdAt: string
  shareText: string
  qrCode: string
  tags: string[]
  healthScore: number
  healthLevel: string
  healthAdvice: string[]
  matchingPool: { mode: 'real' | 'fixed'; count: number; text: string }
  top3: Top3Item[]
  suggestions: string[]
  radar: {
    profileCompleteness: number
    attractiveness: number
    matchRange: number
    activity: number
    sincerity: number
  }
}

interface ReportStatus {
  enabled: boolean
  quotaTotal: number
  quotaUsed: number
  hasReport: boolean
}

const userStore = useUserStore()

const statusBarHeight = ref(20)
const loading = ref(true)
const generating = ref(false)
const report = ref<MatchReport | null>(null)
const status = ref<ReportStatus>({ enabled: true, quotaTotal: 100, quotaUsed: 0, hasReport: false })

const navTotalHeight = computed(() => {
  const info = uni.getWindowInfo()
  const windowWidth = info.windowWidth || info.screenWidth || 375
  return statusBarHeight.value + 44 * (windowWidth / 375)
})

const radarValues = computed(() => {
  const r = report.value?.radar
  return r
    ? [r.profileCompleteness, r.attractiveness, r.matchRange, r.activity, r.sincerity]
    : [0, 0, 0, 0, 0]
})
const radarLabels = ['资料完整度', '吸引力', '匹配范围', '活跃度', '真诚度']

const quotaFull = computed(() => status.value.quotaUsed >= status.value.quotaTotal)
const canGenerate = computed(() => status.value.enabled && !quotaFull.value && !generating.value)

const generateBtnText = computed(() => {
  if (!status.value.enabled) return '功能已关闭'
  if (quotaFull.value) return '名额已满'
  return '生成我的匹配报告'
})

const emptyText = computed(() => {
  if (!status.value.enabled) return '匹配分析报告功能暂未开放'
  if (quotaFull.value) return '免费名额已满，感谢关注'
  return '完成基本资料与择偶要求后，即可生成专属匹配报告'
})

const levelClass = computed(() => {
  const lv = report.value?.healthLevel
  if (lv === '偏严') return 'level-strict'
  if (lv === '偏宽') return 'level-wide'
  return 'level-good'
})

onLoad(() => {
  const info = uni.getWindowInfo()
  statusBarHeight.value = info.statusBarHeight || 20
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    if (!userStore.isLoggedIn) {
      report.value = null
      loading.value = false
      return
    }
    const data = await get<MatchReport | null>('/match-report')
    if (data) {
      report.value = data
    } else {
      report.value = null
      try {
        status.value = await get<ReportStatus>('/match-report/status')
      } catch {
        // 状态获取失败保持默认
      }
    }
  } catch {
    report.value = null
  } finally {
    loading.value = false
  }
}

async function handleGenerate() {
  if (!canGenerate.value) return
  generating.value = true
  try {
    const data = await post<MatchReport>('/match-report/generate')
    report.value = data
    status.value = { ...status.value, hasReport: true }
  } catch {
    // 错误提示由 request 统一弹出
  } finally {
    generating.value = false
  }
}

function handleBack() {
  safeNavigateBack()
}

function goShare() {
  uni.navigateTo({ url: '/pages/match-report/share' })
}
</script>

<style scoped lang="scss">
.match-report-page {
  min-height: 100vh;
  background: #fff5f7;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff5f7;

  .nav-inner {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;

    .nav-left, .nav-right {
      width: 60px;
      display: flex;
      align-items: center;
    }

    .back-icon {
      font-size: 22px;
      color: #333;
    }

    .nav-title {
      font-size: 17px;
      font-weight: 600;
      color: #333;
    }
  }
}

.page-body {
  padding: 12px 12px 40px;
}

.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #ffd6e4;
    border-top-color: #ff6b9d;
    border-radius: 50%;
    animation: rotate 0.8s linear infinite;
  }

  .empty-icon {
    font-size: 56px;
    margin-bottom: 16px;
  }

  .state-text {
    color: #999;
    font-size: 14px;
    margin-bottom: 24px;
    text-align: center;
    padding: 0 24px;
  }

  .btn-generate {
    padding: 12px 40px;
    background: linear-gradient(135deg, #ff9dc0, #ff6b9d);
    color: #fff;
    border-radius: 24px;
    font-size: 15px;
    font-weight: 600;

    &.disabled {
      background: #d9d9d9;
    }
  }
}

@keyframes rotate {
  to { transform: rotate(360deg); }
}

.report-content {
  .card {
    background: #fff;
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    display: block;
    margin-bottom: 12px;
  }
}

.score-card {
  text-align: center;

  .score-label {
    font-size: 14px;
    color: #666;
  }

  .score-row {
    display: flex;
    align-items: baseline;
    justify-content: center;
    margin: 8px 0 4px;

    .score-num {
      font-size: 56px;
      font-weight: 700;
      color: #ff6b9d;
      line-height: 1;
    }

    .score-unit {
      font-size: 16px;
      color: #999;
      margin-left: 4px;
    }
  }

  .score-level {
    display: inline-block;
    padding: 3px 14px;
    border-radius: 12px;
    font-size: 13px;
    margin-bottom: 12px;

    &.level-strict { background: #ffecec; color: #f56c6c; }
    &.level-wide { background: #fff7e6; color: #e6a23c; }
    &.level-good { background: #e8f7ee; color: #67c23a; }
  }

  .advice-item {
    display: flex;
    align-items: flex-start;
    text-align: left;
    margin-top: 6px;

    .advice-dot {
      color: #ff6b9d;
      margin-right: 6px;
    }

    .advice-text {
      flex: 1;
      font-size: 13px;
      color: #666;
      line-height: 1.5;
    }
  }
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .tag-chip {
    padding: 6px 14px;
    background: #fff0f5;
    color: #ff6b9d;
    border-radius: 16px;
    font-size: 13px;
  }
}

.pool-text {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}

.top3-empty {
  color: #bbb;
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}

.top3-list {
  display: flex;
  justify-content: space-between;

  .top3-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    .top3-avatar-wrap {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      overflow: hidden;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .top3-avatar {
      width: 72px;
      height: 72px;

      &.blur {
        filter: blur(6px);
      }
    }

    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;

      .placeholder-text {
        font-size: 28px;
        color: #ccc;
      }
    }

    .top3-name {
      margin-top: 8px;
      font-size: 14px;
      color: #333;
      font-weight: 600;
    }

    .top3-tags {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 4px;
      margin-top: 6px;

      .top3-tag {
        font-size: 11px;
        color: #999;
        background: #f7f7f7;
        padding: 2px 8px;
        border-radius: 10px;
      }
    }
  }
}

.radar-wrap {
  display: flex;
  justify-content: center;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;

  .suggestion-index {
    width: 20px;
    height: 20px;
    background: #ff6b9d;
    color: #fff;
    border-radius: 50%;
    font-size: 12px;
    text-align: center;
    line-height: 20px;
    margin-right: 8px;
    flex-shrink: 0;
  }

  .suggestion-text {
    flex: 1;
    font-size: 14px;
    color: #333;
    line-height: 1.5;
  }
}

.btn-share {
  margin-top: 4px;
  padding: 14px;
  background: linear-gradient(135deg, #ff9dc0, #ff6b9d);
  color: #fff;
  border-radius: 24px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
}
</style>
