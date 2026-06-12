<template>
  <view class="poster-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">生成海报</view>
      <view class="nav-right"></view>
    </view>

    <view class="page-content">
      <view class="tip-text">点击模板生成推广卡</view>

      <view class="template-grid">
        <view
          v-for="template in templateList"
          :key="template.id"
          class="template-item"
          @tap="selectTemplate(template)"
        >
          <view class="template-preview" :style="{ background: template.bgColor }">
            <image class="preview-photo" :src="template.previewPhoto" mode="aspectFill" />
            <view class="preview-overlay">
              <view class="preview-info">
                <text class="preview-id">ID: 10001</text>
                <text class="preview-basic">26岁 · 168cm · 本科</text>
              </view>
            </view>
            <view class="preview-tag" :style="{ background: template.tagColor }">
              <text>{{ template.name }}</text>
            </view>
          </view>
          <view class="template-name">{{ template.name }}</view>
        </view>
      </view>
    </view>

    <!-- Canvas 离屏渲染 -->
    <canvas
      canvas-id="poster-canvas"
      id="poster-canvas"
      class="poster-canvas"
      :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
    ></canvas>

    <!-- 加载遮罩 -->
    <view v-if="showLoading" class="loading-overlay">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-text">绘制海报中...</text>
      </view>
    </view>

    <!-- 预览弹窗 -->
    <view v-if="showPreview" class="preview-popup">
      <view class="preview-overlay" @tap="closePreview"></view>
      <view class="preview-card">
        <view class="preview-tip">点击按钮保存图片，分享到群或朋友圈</view>
        <image class="preview-image" :src="generatedImagePath" mode="widthFix" />
        <view class="preview-actions">
          <view class="action-btn cancel-btn" @tap="closePreview">
            <text>取消</text>
          </view>
          <view class="action-btn save-btn" @tap="savePoster">
            <text>保存</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request, { getServerBaseUrl } from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { safeNavigateBack } from '@/utils/navigate'

interface PosterTemplate {
  id: number
  name: string
  bgColor: string
  tagColor: string
  previewPhoto: string
}

const templateList: PosterTemplate[] = [
  {
    id: 1,
    name: '推荐女嘉宾',
    bgColor: 'linear-gradient(135deg, #FFB6C1, #FFC0CB)',
    tagColor: '#FF6B9D',
    previewPhoto: 'https://img.yzcdn.cn/vant/cat.jpeg',
  },
  {
    id: 2,
    name: '推荐男嘉宾',
    bgColor: 'linear-gradient(135deg, #87CEEB, #ADD8E6)',
    tagColor: '#4A90E2',
    previewPhoto: 'https://img.yzcdn.cn/vant/cat.jpeg',
  },
  {
    id: 3,
    name: '甜蜜约会',
    bgColor: 'linear-gradient(135deg, #FFFACD, #FFF8DC)',
    tagColor: '#FFB347',
    previewPhoto: 'https://img.yzcdn.cn/vant/cat.jpeg',
  },
  {
    id: 4,
    name: '缘定今生',
    bgColor: 'linear-gradient(135deg, #DDA0DD, #EE82EE)',
    tagColor: '#722ED1',
    previewPhoto: 'https://img.yzcdn.cn/vant/cat.jpeg',
  },
]

const userStore = useUserStore()
const systemStore = useSystemStore()
const userId = ref<number>(0)
const showLoading = ref(false)
const showPreview = ref(false)
const generatedImagePath = ref('')
const selectedTemplate = ref<PosterTemplate | null>(null)

const canvasId = 'poster-canvas'
const canvasWidth = 750
const canvasHeight = 1200

// ============ 布局常量 ============
const PADDING = 50
const AVATAR_SIZE = 240 // 圆形头像直径
const AVATAR_Y = 60 // 头像区域顶部
const NICKNAME_Y = AVATAR_Y + AVATAR_SIZE + 40
const INFO_Y = NICKNAME_Y + 50 // 两列信息起始 Y
const ROW_HEIGHT = 52
const DIVIDER_Y = INFO_Y + ROW_HEIGHT * 4 + 16
const INTRO_Y = DIVIDER_Y + 40
const INTRO_MAX_LINES = 6
const INTRO_LINE_HEIGHT = 38
const FOOTER_Y = canvasHeight - 300 // 底部区域

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as Record<string, unknown>)?.options || {}

  if (options.userId) {
    userId.value = parseInt(String(options.userId))
  } else {
    userId.value = userStore.userInfo?.id || 0
  }
})

const handleBack = () => {
  safeNavigateBack()
}

const selectTemplate = async (template: PosterTemplate) => {
  selectedTemplate.value = template
  await generatePoster(template)
}

// ==================== 海报生成主流程 ====================

const generatePoster = async (template: PosterTemplate) => {
  try {
    showLoading.value = true

    const userData = await fetchUserData()

    const ctx = uni.createCanvasContext(canvasId) as CanvasRenderingContext2D & {
      setFillStyle: (c: string) => void
      setStrokeStyle: (c: string) => void
      setFontSize: (n: number) => void
      fillText: (t: string, x: number, y: number) => void
      strokeRect: (x: number, y: number, w: number, h: number) => void
      fillRect: (x: number, y: number, w: number, h: number) => void
      save: () => void
      restore: () => void
      beginPath: () => void
      moveTo: (x: number, y: number) => void
      lineTo: (x: number, y: number) => void
      stroke: () => void
      clip: () => void
      arc: (x: number, y: number, r: number, s: number, e: number, ccw?: boolean) => void
      drawImage: (src: string, x: number, y: number, w: number, h: number) => void
      measureText: (t: string) => { width: number }
      closePath: () => void
      setLineWidth: (n: number) => void
      draw: (reserve?: boolean, cb?: () => void) => void
    }

    // 1. 白色背景
    ctx.setFillStyle('#FFFFFF')
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // 2. 顶部粉色渐变装饰条
    ctx.setFillStyle('#FF6B9D')
    ctx.fillRect(0, 0, canvasWidth, 8)

    // 3. 圆形头像
    await drawAvatar(ctx, userData.avatar)

    // 4. 昵称
    drawNickname(ctx, userData.nickname, template)

    // 5. 分隔线（昵称下方）
    ctx.beginPath()
    ctx.setStrokeStyle('#F0F0F0')
    ctx.setLineWidth(2)
    ctx.moveTo(PADDING + 120, NICKNAME_Y + 12)
    ctx.lineTo(canvasWidth - PADDING - 120, NICKNAME_Y + 12)
    ctx.stroke()

    // 6. 两列信息
    drawUserInfo(ctx, userData, template)

    // 7. 信息区底部分隔线
    ctx.beginPath()
    ctx.setStrokeStyle('#F0F0F0')
    ctx.setLineWidth(2)
    ctx.moveTo(PADDING, DIVIDER_Y)
    ctx.lineTo(canvasWidth - PADDING, DIVIDER_Y)
    ctx.stroke()

    // 8. 自我介绍
    drawSelfIntro(ctx, userData.selfIntro)

    // 9. 底部分隔线
    const afterIntroY = INTRO_Y + INTRO_MAX_LINES * INTRO_LINE_HEIGHT + 30
    ctx.beginPath()
    ctx.setStrokeStyle('#F0F0F0')
    ctx.setLineWidth(2)
    ctx.moveTo(PADDING, afterIntroY)
    ctx.lineTo(canvasWidth - PADDING, afterIntroY)
    ctx.stroke()

    // 10. 小程序码（从完整 URL 下载真实图片）
    await drawQRCode(ctx, template)

    // 11. 底部 footer
    drawFooter(ctx)

    ctx.draw()

    await new Promise<void>((resolve) => {
      setTimeout(async () => {
        try {
          const res = await new Promise<{ tempFilePath: string }>((resolve, reject) => {
            uni.canvasToTempFilePath({
              canvasId,
              quality: 0.9,
              success: (res) => resolve(res as { tempFilePath: string }),
              fail: reject,
            })
          })

          generatedImagePath.value = res.tempFilePath
          showLoading.value = false
          showPreview.value = true

          await trackShareEvent(template.id)
        } catch (e) {
          console.error('canvas to temp file error', e)
          showLoading.value = false
          uni.showToast({ title: '生成失败', icon: 'none' })
        }
      }, 500)
    })
  } catch (e) {
    console.error('generate poster error', e)
    showLoading.value = false
    uni.showToast({ title: '生成失败', icon: 'none' })
  }
}

// ==================== Canvas 绘制函数 ====================

/** 绘制圆形头像 */
const drawAvatar = async (ctx: any, avatarUrl: string) => {
  const cx = canvasWidth / 2
  const cy = AVATAR_Y + AVATAR_SIZE / 2
  const r = AVATAR_SIZE / 2

  // 绘制底部粉色光环
  ctx.beginPath()
  ctx.arc(cx, cy, r + 8, 0, 2 * Math.PI)
  ctx.setFillStyle('#FFF0F3')
  ctx.fill()

  try {
    const fullUrl = getFullImageUrl(avatarUrl) || avatarUrl
    const tempFilePath = await downloadImage(fullUrl)

    // 圆形裁剪
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, 2 * Math.PI)
    ctx.clip()

    // 绘制头像图片，居中填充
    ctx.drawImage(tempFilePath, cx - r, cy - r, AVATAR_SIZE, AVATAR_SIZE)
    ctx.restore()
  } catch (_) {
    // 加载失败：显示默认占位圆
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, 2 * Math.PI)
    ctx.setFillStyle('#FFE0E8')
    ctx.fill()
    ctx.setFillStyle('#FF6B9D')
    ctx.setFontSize(48)
    ctx.fillText('?', cx - 14, cy + 16)
  }
}

/** 绘制昵称 */
const drawNickname = (ctx: any, nickname: string, template: PosterTemplate) => {
  const name = nickname || `${systemStore.appName}用户`
  ctx.setFillStyle('#333333')
  ctx.setFontSize(36)
  const nameWidth = ctx.measureText(name).width
  const nameX = (canvasWidth - nameWidth) / 2
  ctx.fillText(name, nameX, NICKNAME_Y)
}

/** 两列信息 */
const drawUserInfo = (ctx: any, userData: Record<string, unknown>, template: PosterTemplate) => {
  type InfoRow = { label: string; value: string }

  // 左列
  const leftItems: InfoRow[] = [
    { label: 'ID', value: `:${userData.id || '---'}` },
    { label: '婚况', value: `:${userData.maritalStatus as string || '---'}` },
    { label: '年龄', value: `:${userData.age ? (userData.age as number) + '岁' : '---'}` },
    { label: '职业', value: `:${(userData.occupation as string) || '---'}` },
  ]

  // 右列
  const rightItems: InfoRow[] = [
    { label: '身高', value: `:${userData.height ? (userData.height as number) + 'cm' : '---'}` },
    { label: '学历', value: `:${(userData.education as string) || '---'}` },
    { label: '月薪', value: `:${(userData.incomeRange as string) || '---'}` },
    { label: '籍贯', value: `:${(userData.hometown as string) || '---'}` },
  ]

  const colGap = 60 // 两列间距
  const colWidth = (canvasWidth - PADDING * 2 - colGap) / 2

  // 标签列固定宽度，值列自适应
  const labelWidth = 80

  const drawInfoRow = (
    items: InfoRow[],
    xBase: number,
  ) => {
    items.forEach((item, index) => {
      const y = INFO_Y + index * ROW_HEIGHT

      // 标签：灰色、右对齐
      ctx.setFillStyle('#999999')
      ctx.setFontSize(22)
      const labelW = ctx.measureText(item.label).width
      ctx.fillText(item.label, xBase + labelWidth - labelW, y)

      // 值：深色、左对齐
      ctx.setFillStyle('#333333')
      ctx.setFontSize(24)
      ctx.fillText(item.value, xBase + labelWidth + 12, y)
    })
  }

  const leftX = PADDING
  const rightX = leftX + colWidth + colGap

  drawInfoRow(leftItems, leftX)
  drawInfoRow(rightItems, rightX)
}

/** 自我介绍 */
const drawSelfIntro = (ctx: any, selfIntro: string) => {
  const maxWidth = canvasWidth - PADDING * 2
  const introText = selfIntro || '这个人很懒，什么都没有留下~'

  ctx.setFillStyle('#666666')
  ctx.setFontSize(22)

  const lines = wrapText(ctx, introText, maxWidth, INTRO_MAX_LINES)

  lines.forEach((line: string, index: number) => {
    ctx.fillText(line, PADDING, INTRO_Y + index * INTRO_LINE_HEIGHT)
  })
}

/** 文字自动换行 */
const wrapText = (ctx: any, text: string, maxWidth: number, maxLines: number): string[] => {
  const chars = text.split('')
  const lines: string[] = []
  let currentLine = ''

  for (const char of chars) {
    const testLine = currentLine + char
    const testWidth = ctx.measureText(testLine).width

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = char

      if (lines.length >= maxLines) {
        break
      }
    } else {
      currentLine = testLine
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine)
  }

  if (lines.length >= maxLines) {
    const lastLine = lines[lines.length - 1]
    if (lastLine.length + 2 < currentLine.length) {
      lines[lines.length - 1] = lastLine.substring(0, lastLine.length - 1) + '…'
    }
  }

  return lines
}

/** 底部小程序码 */
const drawQRCode = async (ctx: any, template: PosterTemplate) => {
  const qrSize = 180
  const qrX = canvasWidth - PADDING - qrSize
  const qrY = canvasHeight - qrSize - 100

  // 小程序码白色背景 + 边框
  ctx.setFillStyle('#FFFFFF')
  ctx.setStrokeStyle(template.tagColor)
  ctx.setLineWidth(3)
  ctx.beginPath()
  ctx.roundRect?.(qrX, qrY, qrSize, qrSize, 12)
  ctx.fill()
  ctx.stroke()

  // 尝试加载真实小程序码图片（后台返回完整 URL）
  const qrCodeUrl = `${getServerBaseUrl()}/qr/4.png`

  try {
    const tempFilePath = await downloadImage(qrCodeUrl)
    ctx.save()
    ctx.beginPath()
    ctx.roundRect?.(qrX, qrY, qrSize, qrSize, 12)
    ctx.clip()
    ctx.drawImage(tempFilePath, qrX, qrY, qrSize, qrSize)
    ctx.restore()
  } catch (_) {
    // 加载失败：显示灰色占位
    ctx.setFillStyle('#F5F5F5')
    ctx.beginPath()
    ctx.roundRect?.(qrX, qrY, qrSize, qrSize, 12)
    ctx.fill()
    ctx.setFillStyle('#CCCCCC')
    ctx.setFontSize(16)
    ctx.fillText('小程序码', qrX + qrSize / 2 - 32, qrY + qrSize / 2 + 6)
  }
}

/** 底部文字 */
const drawFooter = (ctx: any) => {
  const qrSize = 180
  const qrBottom = canvasHeight - 100 // QR 图底部 Y
  const textY1 = qrBottom + 24
  const textY2 = textY1 + 22
  const textY3 = textY2 + 22

  // 左侧：品牌名
  ctx.setFillStyle('#FF6B9D')
  ctx.setFontSize(28)
  ctx.fillText(systemStore.appName, PADDING, qrBottom - qrSize / 2 + 40)

  ctx.setFillStyle('#CCCCCC')
  ctx.setFontSize(18)
  ctx.fillText('值得信赖的相亲平台', PADDING, qrBottom - qrSize / 2 + 68)

  // 右侧：二维码下方说明（居中对齐于 QR 码）
  const qrCenterX = canvasWidth - PADDING - qrSize / 2

  ctx.setFillStyle('#666666')
  ctx.setFontSize(18)
  const line1 = '长按识别认识TA'
  const line1W = ctx.measureText(line1).width
  ctx.fillText(line1, qrCenterX - line1W / 2, textY1)

  ctx.setFillStyle('#CCCCCC')
  ctx.setFontSize(16)
  const line2 = `来自${systemStore.appName}`
  const line2W = ctx.measureText(line2).width
  ctx.fillText(line2, qrCenterX - line2W / 2, textY2)

  const line3 = '值得您信赖的相亲平台'
  const line3W = ctx.measureText(line3).width
  ctx.fillText(line3, qrCenterX - line3W / 2, textY3)
}

// ==================== 数据与工具函数 ====================

const fetchUserData = async () => {
  try {
    const res = await request({
      url: `/users/${userId.value}`,
      method: 'GET',
    })

    const userData = (res as Record<string, unknown>).user || res

    if (userData && (userData as Record<string, unknown>).birthYear && !(userData as Record<string, unknown>).age) {
      (userData as Record<string, unknown>).age =
        new Date().getFullYear() - ((userData as Record<string, unknown>).birthYear as number)
    }

    // 处理图片 URL
    if (userData && (userData as Record<string, unknown>).avatar) {
      (userData as Record<string, unknown>).avatar = getFullImageUrl(
        (userData as Record<string, unknown>).avatar as string,
      )
    }

    return userData as Record<string, unknown>
  } catch (e) {
    console.error('fetch user data error', e)
    return {
      id: userId.value,
      nickname: '用户',
      avatar: '',
      age: 26,
      height: 168,
      education: '本科',
      incomeRange: '8千-1.2万',
      maritalStatus: '未婚',
      selfIntro: '这个人很懒，什么都没有留下~',
    }
  }
}

const downloadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL'))
      return
    }

    // 确保使用完整 URL
    const fullUrl = url.startsWith('http') ? url : getFullImageUrl(url)

    uni.downloadFile({
      url: fullUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath)
        } else {
          reject(new Error('Download failed with status ' + res.statusCode))
        }
      },
      fail: reject,
    })
  })
}

const trackShareEvent = async (templateId: number) => {
  try {
    await request({
      url: '/poster/track',
      method: 'POST',
      data: {
        userId: userId.value,
        templateId,
      },
    })
  } catch (e) {
    console.error('track share event error', e)
  }
}

const closePreview = () => {
  showPreview.value = false
}

const savePoster = async () => {
  try {
    uni.showLoading({ title: '保存中...' })

    await new Promise<void>((resolve, reject) => {
      uni.saveImageToPhotosAlbum({
        filePath: generatedImagePath.value,
        success: () => {
          uni.hideLoading()
          uni.showToast({
            title: '已保存到相册',
            icon: 'success',
          })
          resolve()
        },
        fail: (err) => {
          uni.hideLoading()

          if (err.errMsg.includes('auth deny')) {
            uni.authorize({
              scope: 'scope.writePhotosAlbum',
              success: () => {
                uni.saveImageToPhotosAlbum({
                  filePath: generatedImagePath.value,
                  success: () => {
                    uni.showToast({ title: '已保存到相册', icon: 'success' })
                    resolve()
                  },
                  fail: reject,
                })
              },
              fail: () => {
                uni.showToast({ title: '请授权保存图片', icon: 'none' })
                reject(new Error('authorize failed'))
              },
            })
          } else {
            reject(err)
          }
        },
      })
    })
  } catch (e) {
    console.error('save poster error', e)
  }
}
</script>

<style lang="scss" scoped>
.poster-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.poster-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background-color: #fff;
  z-index: 100;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.nav-left,
.nav-right {
  width: 100rpx;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.page-content {
  padding-top: 108rpx;
  padding: 108rpx 32rpx 32rpx;
}

.tip-text {
  text-align: center;
  font-size: 28rpx;
  color: #999;
  margin-bottom: 32rpx;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.template-item {
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.template-preview {
  position: relative;
  height: 400rpx;
  overflow: hidden;
}

.preview-photo {
  width: 100%;
  height: 100%;
}

.preview-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.preview-id {
  font-size: 22rpx;
  color: #fff;
}

.preview-basic {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
}

.preview-tag {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #fff;
}

.template-name {
  padding: 16rpx;
  font-size: 26rpx;
  color: #333;
  text-align: center;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 28rpx;
  color: #fff;
}

.preview-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
}

.preview-card {
  position: relative;
  width: 90%;
  max-width: 600rpx;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  z-index: 1;
}

.preview-tip {
  text-align: center;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 20rpx;
}

.preview-image {
  width: 100%;
  border-radius: 12rpx;
}

.preview-actions {
  display: flex;
  justify-content: space-around;
  margin-top: 32rpx;
  gap: 24rpx;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 40rpx;
  font-size: 30rpx;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
}

.save-btn {
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  color: #fff;
}
</style>
