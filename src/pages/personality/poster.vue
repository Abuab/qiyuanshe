<template>
  <view class="pposter-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-left" @tap="goBack"><text class="back-icon">←</text></view>
        <text class="nav-title">分享我的性格</text>
        <view class="nav-right" />
      </view>
    </view>

    <view class="page-body" :style="{ paddingTop: navTotalHeight + 'px' }">
      <view v-if="generating" class="state-box">
        <view class="spinner" />
        <text class="state-text">海报生成中…</text>
      </view>

      <block v-else-if="imagePath">
        <image class="poster-preview" :src="imagePath" mode="widthFix" />
        <view class="disclaimer">本测试仅供娱乐和交友参考，结果不代表专业心理测评</view>
        <view class="actions">
          <view class="btn-save" @tap="savePoster()">保存到相册</view>
        </view>
      </block>

      <view v-else class="state-box">
        <text class="state-text">{{ errorText || '海报生成失败' }}</text>
        <view class="btn-retry" @tap="generate">重新生成</view>
      </view>
    </view>

    <!-- 离屏画布 -->
    <canvas
      canvas-id="pposter-canvas"
      id="pposter-canvas"
      class="offscreen-canvas"
      :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onReady } from '@dcloudio/uni-app'
import { get, getBaseUrl } from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { sanitizeShareText } from '@/utils/personality'

const userStore = useUserStore()
const systemStore = useSystemStore()

const canvasId = 'pposter-canvas'
const canvasW = 600
const canvasH = 1000

const statusBarHeight = ref(20)
const generating = ref(false)
const imagePath = ref('')
const errorText = ref('')
const shareText = ref('')

const navTotalHeight = computed(() => {
  const info = uni.getWindowInfo() as any
  const screenWidth = info.screenWidth || 375
  return statusBarHeight.value + 44 * (screenWidth / 375)
})

onLoad((opts: any) => {
  const info = uni.getWindowInfo() as any
  statusBarHeight.value = info.statusBarHeight || 20
  shareText.value = sanitizeShareText(opts?.shareText ? decodeURIComponent(opts.shareText) : '')
})

onReady(() => {
  // 必须等页面渲染完成、离屏 canvas 节点就绪后再生成；
  // 若在 onLoad 阶段调用，canvas 尚未挂载会导致 canvasToTempFilePath 不回调而卡死
  generate()
})

let watchdog: ReturnType<typeof setTimeout> | null = null
async function generate() {
  generating.value = true
  errorText.value = ''
  imagePath.value = ''
  // 兜底看门狗：任何环节卡住超过 12s 都结束转圈并提示重试，避免无限 loading
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
    const result: any = await get('/personality/my-result')
    if (!result || !result.typeCode) {
      errorText.value = '暂无测试结果，请先完成测试'
      generating.value = false
      return
    }
    await drawPoster(result)
  } catch (e: any) {
    errorText.value = e?.message || '海报生成失败'
    generating.value = false
  } finally {
    if (watchdog) { clearTimeout(watchdog); watchdog = null }
  }
}

async function drawPoster(result: any) {
  const ctx: any = uni.createCanvasContext(canvasId)
  const uid = userStore.userInfo?.id || 0

  // 预下载头像 + 二维码（并行，均带超时兜底，任一失败/超时都不阻塞海报生成）
  const avatarUrl = getFullImageUrl(userStore.userInfo?.avatar || '')
  // 注意：二维码是 API 接口，必须带 /api 前缀（getBaseUrl 已含 /api），否则会命中 nginx SPA 回退返回 HTML
  const qrUrl = `${getBaseUrl()}/personality/share-qr?userId=${uid}`
  const [avatarPath, qrPath] = await Promise.all([
    downloadImage(avatarUrl).catch(() => ''),
    downloadImage(qrUrl).catch(() => ''),
  ])

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
  ctx.fillText('性格交友 · 遇见更契合的TA', canvasW / 2, 90)

  // 白色圆角卡片
  const cardX = 40
  const cardY = 130
  const cardW = canvasW - 80
  const cardH = 600
  roundRect(ctx, cardX, cardY, cardW, cardH, 24)
  ctx.setFillStyle('#ffffff')
  ctx.fill()

  // 圆形头像
  const cx = canvasW / 2
  const avatarR = 60
  const avatarCy = cardY + 20 + avatarR
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, avatarCy, avatarR, 0, 2 * Math.PI)
  ctx.setFillStyle('#ffe0ea')
  ctx.fill()
  ctx.clip()
  if (avatarPath) {
    ctx.drawImage(avatarPath, cx - avatarR, avatarCy - avatarR, avatarR * 2, avatarR * 2)
  }
  ctx.restore()

  // 昵称
  ctx.setFillStyle('#333333')
  ctx.setFontSize(20)
  ctx.setTextAlign('center')
  ctx.fillText(userStore.userInfo?.nickname || '我', cx, avatarCy + avatarR + 30)

  // 人格类型大字 + 花名
  ctx.setFillStyle('#ff6b9d')
  ctx.setFontSize(40)
  ctx.fillText(result.typeName || result.typeCode || '神秘探索者', cx, avatarCy + avatarR + 90)
  if (result.nickname) {
    ctx.setFillStyle('#ff8fab')
    ctx.setFontSize(22)
    ctx.fillText(`「${result.nickname}」`, cx, avatarCy + avatarR + 128)
  }

  // 一句话描述（自动换行，最多2行）
  ctx.setFillStyle('#666666')
  ctx.setFontSize(16)
  const summary = result.summary || '独一无二的性格画像'
  const sumLines = wrapText(ctx, summary, cardW - 80, 2)
  let sy = avatarCy + avatarR + 165
  for (const line of sumLines) {
    ctx.fillText(line, cx, sy)
    sy += 26
  }

  // 简化雷达图（2个维度真实值，其余置0）
  const dims: any[] = Array.isArray(result.dimensions) ? result.dimensions : []
  drawMiniRadar(ctx, cx, sy + 110, 90, dims, 2)

  // 分享文案
  const copy = shareText.value || defaultCopy(result)
  ctx.setFillStyle('#ff6b9d')
  ctx.setFontSize(16)
  const copyLines = wrapText(ctx, copy, cardW - 80, 3)
  let cy2 = cardY + cardH - 30 - (copyLines.length - 1) * 24
  for (const line of copyLines) {
    ctx.fillText(line, cx, cy2)
    cy2 += 24
  }

  // 底部二维码
  const qrSize = 120
  const qrX = cx - qrSize / 2
  const qrY = cardY + cardH + 30
  ctx.setFillStyle('#ffffff')
  roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12)
  ctx.fill()
  if (qrPath) {
    ctx.drawImage(qrPath, qrX, qrY, qrSize, qrSize)
  }
  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(15)
  ctx.setTextAlign('center')
  ctx.fillText('长按识别 · 测测你的性格', cx, qrY + qrSize + 36)

  // 免责声明（与上方二维码文案拉开间距，避免重叠）
  ctx.setFillStyle('rgba(255,255,255,0.75)')
  ctx.setFontSize(12)
  ctx.fillText('本测试仅供娱乐和交友参考，不代表专业心理测评', cx, canvasH - 34)

  // 输出：真机上 ctx.draw(reserve, callback) 的回调常不触发导致卡死，
  // 改为无回调 draw + 延时导出（与项目现有海报页一致，稳定可靠）
  ctx.draw()
  await new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    setTimeout(() => {
      uni.canvasToTempFilePath({
        canvasId,
        quality: 0.92,
        success: (res) => {
          imagePath.value = res.tempFilePath
          generating.value = false
          // 生成完成后自动尝试保存到相册（使用刚导出的新鲜路径）
          savePoster(res.tempFilePath)
          finish()
        },
        fail: () => {
          errorText.value = '海报导出失败，请重试'
          generating.value = false
          finish()
        },
      })
      // 导出兜底：canvasToTempFilePath 若 6s 未回调，直接报错，避免吊到全局看门狗
      setTimeout(() => {
        if (settled || imagePath.value) return
        errorText.value = '海报导出超时，请重试'
        generating.value = false
        finish()
      }, 6000)
    }, 500)
  })
}

// ==================== 绘制辅助 ====================

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
  ctx.arc(x + r, y + r, r, Math.PI, (Math.PI * 3) / 2)
  ctx.closePath()
}

function drawMiniRadar(ctx: any, cx: number, cy: number, radius: number, dims: any[], unlocked: number) {
  const n = Math.max(dims.length, 3)
  const step = (Math.PI * 2) / n
  const start = -Math.PI / 2
  ctx.setStrokeStyle('#ffd6e4')
  ctx.setLineWidth(1)
  for (let layer = 1; layer <= 2; layer++) {
    const r = (radius * layer) / 2
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const a = start + step * i
      const x = cx + r * Math.cos(a)
      const y = cy + r * Math.sin(a)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const a = start + step * i
    const locked = i >= unlocked
    const v = locked || !dims[i] ? 0 : Math.max(0, Math.min(100, dims[i].radar || 0)) / 100
    const r = radius * v
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.setFillStyle('rgba(255,107,157,0.35)')
  ctx.fill()
  ctx.setStrokeStyle('#ff6b9d')
  ctx.setLineWidth(2)
  ctx.stroke()
  // 已解锁维度名
  ctx.setFillStyle('#999999')
  ctx.setFontSize(12)
  ctx.setTextAlign('center')
  for (let i = 0; i < Math.min(unlocked, dims.length); i++) {
    const a = start + step * i
    const x = cx + (radius + 14) * Math.cos(a)
    const y = cy + (radius + 14) * Math.sin(a)
    ctx.fillText(dims[i]?.name || '', x, y + 4)
  }
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

function defaultCopy(result: any): string {
  return `我是「${result.nickname || result.typeName || '神秘探索者'}」，快来测测我们的性格契合度~`
}

// ==================== 图片下载 & 保存 ====================

function downloadImage(url: string, timeoutMs = 4000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('no url'))
    let done = false
    // uni.downloadFile 本身无超时保护，这里加超时兜底，避免图片挂起拖死整个海报生成
    const timer = setTimeout(() => {
      if (done) return
      done = true
      reject(new Error('download timeout'))
    }, timeoutMs)
    uni.downloadFile({
      url,
      success: (res) => {
        if (done) return
        done = true
        clearTimeout(timer)
        res.statusCode === 200 ? resolve(res.tempFilePath) : reject(new Error('dl fail'))
      },
      fail: (e) => {
        if (done) return
        done = true
        clearTimeout(timer)
        reject(e)
      },
    })
  })
}

// 从已绘制的离屏 canvas 导出一份新鲜的临时文件
function exportCanvas(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId,
      quality: 0.92,
      success: (res: any) => resolve(res.tempFilePath),
      fail: reject,
    })
  })
}

let saving = false
/**
 * 保存海报到相册
 * @param freshPath 生成后自动保存时传入的新鲜临时路径；手动点击时不传，会重新导出，
 *   避免旧临时文件被系统清理导致 saveImageToPhotosAlbum 报 "no such file or directory"
 */
async function savePoster(freshPath?: string) {
  if (saving) return
  saving = true

  // 手动保存：重新从 canvas 导出，拿到当前有效的临时文件
  // 注意 freshPath 只接受字符串，防止模板 @tap 把事件对象传进来
  let path = typeof freshPath === 'string' ? freshPath : ''
  if (!path) {
    try {
      path = await exportCanvas()
      imagePath.value = path
    } catch {
      saving = false
      uni.showToast({ title: '图片已失效，请点重新生成', icon: 'none' })
      return
    }
  }
  if (!path) {
    saving = false
    return
  }

  let retriedNoFile = false
  const doSave = () => {
    uni.saveImageToPhotosAlbum({
      filePath: path,
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
        // 权限被拒 / 隐私未授权 → 引导去设置
        if (/auth|deny|privacy|authorize|permission/i.test(msg)) {
          saving = false
          guideToSetting()
          return
        }
        // 临时文件失效 → 重新导出后重试一次
        if (!retriedNoFile && /no such file|not exist|cannot find|无效|不存在/i.test(msg)) {
          retriedNoFile = true
          exportCanvas()
            .then((p) => {
              path = p
              imagePath.value = p
              doSave()
            })
            .catch(() => {
              saving = false
              uni.showToast({ title: '图片已失效，请点重新生成', icon: 'none' })
            })
          return
        }
        // 其余错误：暴露真实原因，便于定位（如隐私协议未声明、机型不支持等）
        saving = false
        // eslint-disable-next-line no-console
        console.error('[poster] saveImageToPhotosAlbum fail:', msg)
        const brief = msg.replace('saveImageToPhotosAlbum:fail', '').trim() || '未知错误'
        uni.showToast({ title: '保存失败：' + brief, icon: 'none', duration: 3000 })
      },
    })
  }

  const guideToSetting = () => {
    // 未授权：友好引导去设置页开启，不强制阻断
    uni.showModal({
      title: '需要相册权限',
      content: '保存海报需要授权「保存到相册」，是否前往设置开启？',
      confirmText: '去设置',
      success: (r) => {
        if (!r.confirm) return
        uni.openSetting({
          success: (s) => {
            if (s.authSetting['scope.writePhotosAlbum']) {
              saving = true
              doSave()
            }
          },
        })
      },
    })
  }

  // 先查询授权状态，避免非用户手势自动保存时直接失败
  uni.getSetting({
    success: (res) => {
      const auth = res.authSetting['scope.writePhotosAlbum']
      if (auth === true) {
        doSave()
      } else if (auth === false) {
        saving = false
        guideToSetting()
      } else {
        // 从未询问过 → 主动申请授权（会弹出系统授权弹窗）
        uni.authorize({
          scope: 'scope.writePhotosAlbum',
          success: () => doSave(),
          fail: () => {
            saving = false
            guideToSetting()
          },
        })
      }
    },
    fail: () => doSave(),
  })
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.pposter-page { min-height: 100vh; background: #fff5f7; }
.nav-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: #fff;
}
.nav-inner {
  display: flex; align-items: center; justify-content: space-between;
  height: 88rpx; padding: 0 24rpx;
}
.nav-left, .nav-right { width: 80rpx; height: 88rpx; display: flex; align-items: center; flex-shrink: 0; }
.nav-left { justify-content: flex-start; }
.nav-right { justify-content: flex-end; }
.back-icon { font-size: 40rpx; color: #333; font-weight: bold; line-height: 1; }
.nav-title { flex: 1; text-align: center; font-size: 32rpx; font-weight: 600; color: #333; }

.page-body { padding: 32rpx; }
.state-box { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; gap: 28rpx; }
.state-text { color: #999; font-size: 28rpx; }
.spinner {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  border: 6rpx solid #ffd6e4; border-top-color: #ff6b9d; animation: spin 800ms linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.poster-preview { width: 100%; border-radius: 20rpx; box-shadow: 0 8rpx 32rpx rgba(255,107,157,0.25); }
.disclaimer { text-align: center; font-size: 22rpx; color: #bbb; margin: 20rpx 0; }
.actions { display: flex; justify-content: center; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); }
.btn-save {
  width: 80%; height: 92rpx; border-radius: 46rpx; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #ff9dc0, #ff6b9d); color: #fff; font-size: 32rpx; font-weight: 600;
}
.btn-retry {
  padding: 20rpx 60rpx; border-radius: 44rpx; background: #ff6b9d; color: #fff; font-size: 30rpx;
}

.offscreen-canvas { position: fixed; left: -9999px; top: 0; }
</style>
