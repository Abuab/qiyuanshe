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

    <!-- 离屏画布（微信新版 Canvas 2D 接口，比老 canvas-id 方式更稳） -->
    <canvas
      type="2d"
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
    // Canvas 2D 模式：通过 SelectorQuery 获取 canvas 节点
    const node = await new Promise<any>((resolve, reject) => {
      const q = uni.createSelectorQuery()
      // @ts-ignore uni-app NodesRef.fields 类型声明与实际用法不一致
      q.select('#pposter-canvas').fields({ node: true, size: true }).exec((res: any) => {
        const n = res?.[0]?.node
        n ? resolve(n) : reject(new Error('获取画布节点失败'))
      })
    })
    await drawPoster(result, node)
    // 2D Canvas 不需要 ctx.draw()，直接导出
    await new Promise<void>((resolve) => {
      // @ts-ignore uni-app 2D canvas 导出传 canvas 属性（非 canvasId）
      uni.canvasToTempFilePath({
        canvas: node,
        quality: 0.92,
        success: (res: any) => {
          persistTempFile(res.tempFilePath).then((saved) => {
            imagePath.value = saved
            generating.value = false
            savePoster(saved)
            resolve()
          })
        },
        fail: () => {
          errorText.value = '海报导出失败，请重试'
          generating.value = false
          resolve()
        },
      })
    })
  } catch (e: any) {
    errorText.value = e?.message || '海报生成失败'
    generating.value = false
  } finally {
    if (watchdog) { clearTimeout(watchdog); watchdog = null }
  }
}

async function drawPoster(result: any, canvasNode: any) {
  const ctx = canvasNode.getContext('2d')
  const dpr = canvasNode._devicePixelRatio || 1
  // 2D 模式下 CSS 尺寸 ≠ 像素尺寸，需要设置实际像素
  canvasNode.width = canvasW * dpr
  canvasNode.height = canvasH * dpr
  ctx.scale(dpr, dpr)

  const uid = userStore.userInfo?.id || 0

  // 预下载头像和二维码到本地临时文件，再用 canvas.createImage 加载
  const avatarUrl = getFullImageUrl(userStore.userInfo?.avatar || '')
  const qrUrl = `${getBaseUrl()}/personality/share-qr?userId=${uid}`

  const loadCanvasImage = (src: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (!src) return resolve(null)
      // 线上图片必须先 downloadFile 拿到本地路径，再 createImage
      uni.downloadFile({
        url: src,
        timeout: 6000,
        success: (res) => {
          if (res.statusCode !== 200) return resolve(null)
          const img = (canvasNode as any).createImage()
          img.onload = () => resolve(img)
          img.onerror = () => resolve(null)
          img.src = res.tempFilePath
        },
        fail: () => resolve(null),
      })
    })
  }

  const [avatarImg, qrImg] = await Promise.all([
    loadCanvasImage(avatarUrl),
    loadCanvasImage(qrUrl),
  ])

  // 背景暖色渐变
  const grad = ctx.createLinearGradient(0, 0, 0, canvasH)
  grad.addColorStop(0, '#ff9dc0')
  grad.addColorStop(1, '#ff6b9d')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvasW, canvasH)

  // 品牌名
  ctx.fillStyle = '#ffffff'
  ctx.font = '26px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(systemStore.appName || '栖缘社', canvasW / 2, 60)
  ctx.font = '16px sans-serif'
  ctx.fillText('性格交友 · 遇见更契合的TA', canvasW / 2, 90)

  // 白色圆角卡片
  const cardX = 40
  const cardY = 130
  const cardW = canvasW - 80
  const cardH = 600
  roundRect(ctx, cardX, cardY, cardW, cardH, 24)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  // 圆形头像
  const cx = canvasW / 2
  const avatarR = 60
  const avatarCy = cardY + 20 + avatarR
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, avatarCy, avatarR, 0, 2 * Math.PI)
  ctx.fillStyle = '#ffe0ea'
  ctx.fill()
  ctx.clip()
  if (avatarImg) {
    ctx.drawImage(avatarImg, cx - avatarR, avatarCy - avatarR, avatarR * 2, avatarR * 2)
  }
  ctx.restore()

  // 昵称
  ctx.fillStyle = '#333333'
  ctx.font = '20px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(userStore.userInfo?.nickname || '我', cx, avatarCy + avatarR + 30)

  // 人格类型大字 + 花名
  ctx.fillStyle = '#ff6b9d'
  ctx.font = 'bold 40px sans-serif'
  ctx.fillText(result.typeName || result.typeCode || '神秘探索者', cx, avatarCy + avatarR + 90)
  if (result.nickname) {
    ctx.fillStyle = '#ff8fab'
    ctx.font = '22px sans-serif'
    ctx.fillText(`「${result.nickname}」`, cx, avatarCy + avatarR + 128)
  }

  // 一句话描述（自动换行，最多2行）
  ctx.fillStyle = '#666666'
  ctx.font = '16px sans-serif'
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
  ctx.fillStyle = '#ff6b9d'
  ctx.font = '16px sans-serif'
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
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12)
  ctx.fill()
  if (qrImg) {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
  }
  ctx.fillStyle = '#ffffff'
  ctx.font = '15px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('长按识别 · 测测你的性格', cx, qrY + qrSize + 36)

  // 免责声明
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '12px sans-serif'
  ctx.fillText('本测试仅供娱乐和交友参考，不代表专业心理测评', cx, canvasH - 34)
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
  ctx.strokeStyle = '#ffd6e4'
  ctx.lineWidth = 1
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
  ctx.fillStyle = 'rgba(255,107,157,0.35)'
  ctx.fill()
  ctx.strokeStyle = '#ff6b9d'
  ctx.lineWidth = 2
  ctx.stroke()
  // 已解锁维度名
  ctx.fillStyle = '#999999'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
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

// 将 canvas 临时文件持久化到本地存储，避免微信清理临时文件后
// saveImageToPhotosAlbum 报 "no such file or directory"
function persistTempFile(tempFilePath: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const fs = uni.getFileSystemManager()
      fs.saveFile({
        tempFilePath,
        success: (r: any) => resolve(r.savedFilePath || tempFilePath),
        fail: () => resolve(tempFilePath),
      })
    } catch {
      resolve(tempFilePath)
    }
  })
}

let saving = false
/**
 * 保存海报到相册
 * @param freshPath 生成后自动保存时传入的持久化路径；手动点击时不传，使用 imagePath
 */
async function savePoster(freshPath?: string) {
  if (saving) return
  // freshPath 只接受字符串，防止模板 @tap 把事件对象传进来
  const path = typeof freshPath === 'string' && freshPath ? freshPath : imagePath.value
  if (!path) return
  saving = true

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

.offscreen-canvas { position: fixed; left: -9999px; }
</style>
