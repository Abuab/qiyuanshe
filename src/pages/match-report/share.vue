<template>
  <view class="match-share-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-left" @tap="goBack">
          <text class="back-icon iconfont icon-back"></text>
        </view>
        <text class="nav-title">分享我的报告</text>
        <view class="nav-right"></view>
      </view>
    </view>

    <view class="page-body" :style="{ paddingTop: navTotalHeight + 'px' }">
      <view v-if="generating" class="state-box">
        <view class="spinner"></view>
        <text class="state-text">海报生成中...</text>
      </view>

      <block v-else-if="imagePath">
        <image class="poster-preview" :src="imagePath" mode="widthFix" />
        <view class="actions">
          <view class="btn-save" @tap="savePoster()">保存到相册</view>
        </view>
      </block>

      <view v-else class="state-box">
        <text class="state-text">{{ errorText || '海报生成失败' }}</text>
        <view class="btn-retry" @tap="generate">重新生成</view>
      </view>
    </view>

    <!-- 离屏画布（旧版 canvas 接口，与项目现有海报页保持一致） -->
    <canvas
      canvas-id="match-share-canvas"
      id="match-share-canvas"
      class="offscreen-canvas"
      :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onReady } from '@dcloudio/uni-app'
import { get } from '@/utils/request'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { logger } from '@/utils/logger'

interface MatchReport {
  id: number
  quotaNo: number
  shareText: string
  qrCode: string
  healthScore: number
  healthLevel: string
  tags: string[]
}

const userStore = useUserStore()
const systemStore = useSystemStore()

const canvasW = 600
const canvasH = 1000

const statusBarHeight = ref(20)
const generating = ref(false)
const imagePath = ref('')
const errorText = ref('')

const navTotalHeight = computed(() => {
  const info = uni.getWindowInfo()
  const windowWidth = info.windowWidth || info.screenWidth || 375
  return statusBarHeight.value + 44 * (windowWidth / 375)
})

onLoad(() => {
  const info = uni.getWindowInfo()
  statusBarHeight.value = info.statusBarHeight || 20
})

onReady(() => {
  generate()
})

let watchdog: ReturnType<typeof setTimeout> | null = null

async function generate() {
  generating.value = true
  errorText.value = ''
  imagePath.value = ''
  if (watchdog) clearTimeout(watchdog)
  watchdog = setTimeout(() => {
    if (generating.value) {
      generating.value = false
      if (!imagePath.value) errorText.value = '生成超时，请点击重新生成'
    }
  }, 12000)

  try {
    if (!userStore.isLoggedIn) {
      errorText.value = '请先登录后再生成海报'
      generating.value = false
      return
    }
    const report = await get<MatchReport | null>('/match-report')
    if (!report) {
      errorText.value = '暂无可分享的报告，请先生成匹配报告'
      generating.value = false
      return
    }

    const ctx: any = uni.createCanvasContext('match-share-canvas')
    drawPoster(report, ctx)

    await new Promise<void>((resolve) => {
      ctx.draw(false, () => {
        setTimeout(() => {
          uni.canvasToTempFilePath({
            canvasId: 'match-share-canvas',
            quality: 0.92,
            success: (res: any) => {
              imagePath.value = res.tempFilePath
              generating.value = false
              resolve()
            },
            fail: () => {
              errorText.value = '海报导出失败，请重试'
              generating.value = false
              resolve()
            },
          })
        }, 500)
      })
    })
  } catch (e: any) {
    errorText.value = e?.message || '海报生成失败'
    generating.value = false
  } finally {
    if (watchdog) { clearTimeout(watchdog); watchdog = null }
  }
}

function drawPoster(report: MatchReport, ctx: any) {
  // 背景暖色渐变
  const grad = ctx.createLinearGradient(0, 0, 0, canvasH)
  grad.addColorStop(0, '#ff9dc0')
  grad.addColorStop(1, '#ff6b9d')
  ctx.setFillStyle(grad)
  ctx.fillRect(0, 0, canvasW, canvasH)

  // 品牌名
  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(26)
  ctx.setTextAlign('center')
  ctx.fillText(systemStore.appName || '栖缘社', canvasW / 2, 60)
  ctx.setFontSize(16)
  ctx.fillText('我的专属匹配分析报告', canvasW / 2, 90)

  // 白色圆角卡片
  const cardX = 40
  const cardY = 130
  const cardW = canvasW - 80
  const cardH = 620
  roundRect(ctx, cardX, cardY, cardW, cardH, 24)
  ctx.setFillStyle('#ffffff')
  ctx.fill()

  // 健康度大字
  const cx = canvasW / 2
  ctx.setFillStyle('#ff6b9d')
  ctx.setFontSize(120)
  ctx.fillText(String(report.healthScore), cx, cardY + 180)

  ctx.setFillStyle('#999999')
  ctx.setFontSize(22)
  ctx.fillText(`择偶标准健康度 · ${report.healthLevel}`, cx, cardY + 225)

  // 画像标签（最多 5 个，两行）
  const tags = (report.tags || []).slice(0, 5)
  ctx.setFillStyle('#ff6b9d')
  ctx.setFontSize(20)
  const line1 = tags.slice(0, 3).join(' · ')
  const line2 = tags.slice(3, 5).join(' · ')
  if (line1) ctx.fillText(line1, cx, cardY + 280)
  if (line2) ctx.fillText(line2, cx, cardY + 315)

  // 分享文案
  const copy = report.shareText || '我的匹配分析报告已生成，快来看看你的缘分指数'
  ctx.setFillStyle('#666666')
  ctx.setFontSize(16)
  const copyLines = wrapText(ctx, copy, cardW - 80, 3)
  let sy = cardY + 380
  for (const line of copyLines) {
    ctx.fillText(line, cx, sy)
    sy += 26
  }

  // 底部二维码
  if (report.qrCode) {
    const qrSize = 150
    const qrX = cx - qrSize / 2
    const qrY = cardY + cardH + 30
    ctx.setFillStyle('#ffffff')
    roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12)
    ctx.fill()
    try {
      ctx.drawImage(report.qrCode, qrX, qrY, qrSize, qrSize)
    } catch (e: any) {
      logger.warn(`[MatchReport] 绘制二维码失败: ${e?.message}`)
    }
    ctx.setFillStyle('#ffffff')
    ctx.setFontSize(15)
    ctx.fillText('长按识别 · 查看我的报告', cx, qrY + qrSize + 36)
  }

  // 底部说明
  ctx.setFillStyle('rgba(255,255,255,0.75)')
  ctx.setFontSize(12)
  ctx.fillText('遇见更契合的TA', cx, canvasH - 34)
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
  ctx.arc(x + r, y + r, r, Math.PI, (Math.PI * 3) / 2)
  ctx.closePath()
}

function wrapText(ctx: any, text: string, maxWidth: number, maxLines: number): string[] {
  const chars = (text || '').split('')
  const lines: string[] = []
  let cur = ''
  for (const ch of chars) {
    const test = cur + ch
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur)
      cur = ch
      if (lines.length >= maxLines) break
    } else {
      cur = test
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur)
  if (lines.length >= maxLines && cur && lines[lines.length - 1] !== cur) {
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + '…'
  }
  return lines
}

// ==================== 保存 ====================

let saving = false

async function savePoster() {
  // #ifdef H5
  // H5 无系统相册保存能力，降级为长按保存
  uni.showToast({ title: '请长按海报保存', icon: 'none' })
  return
  // #endif

  if (saving) return
  if (!imagePath.value) return
  saving = true

  const doSave = async () => {
    let filePath = imagePath.value
    try {
      filePath = await exportCanvasFresh()
      imagePath.value = filePath
    } catch {
      // 重新导出失败则退回预览时的路径
    }
    uni.saveImageToPhotosAlbum({
      filePath,
      success: () => {
        saving = false
        uni.showToast({ title: '已保存，快去朋友圈分享吧', icon: 'none' })
      },
      fail: (err: any) => {
        const msg = err?.errMsg || ''
        if (msg.includes('cancel')) {
          saving = false
          return
        }
        saving = false
        uni.showToast({ title: '保存失败，请长按海报保存', icon: 'none' })
      },
    })
  }
  await doSave()
}

function exportCanvasFresh(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId: 'match-share-canvas',
      quality: 0.92,
      success: (res: any) => resolve(res.tempFilePath),
      fail: (e: any) => reject(e),
    })
  })
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.redirectTo({ url: '/pages/match-report/index' })
  }
}
</script>

<style scoped lang="scss">
.match-share-page {
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
  display: flex;
  flex-direction: column;
  align-items: center;
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

  .state-text {
    color: #999;
    font-size: 14px;
    margin-bottom: 24px;
  }

  .btn-retry {
    padding: 10px 32px;
    background: linear-gradient(135deg, #ff9dc0, #ff6b9d);
    color: #fff;
    border-radius: 20px;
    font-size: 14px;
  }
}

@keyframes rotate {
  to { transform: rotate(360deg); }
}

.poster-preview {
  width: 320px;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(255, 107, 157, 0.2);
}

.actions {
  margin-top: 20px;

  .btn-save {
    padding: 12px 48px;
    background: linear-gradient(135deg, #ff9dc0, #ff6b9d);
    color: #fff;
    border-radius: 24px;
    font-size: 16px;
    font-weight: 600;
  }
}

.offscreen-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
}
</style>
