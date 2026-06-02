<template>
  <view class="poster-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">栖缘社</view>
      <view class="nav-right"></view>
    </view>

    <view class="page-content">
      <view class="tip-text">点击模板生成推广卡</view>

      <view class="template-grid">
        <view
          v-for="template in templateList"
          :key="template.id"
          class="template-item"
          :class="`template-${template.id}`"
          @tap="selectTemplate(template)"
        >
          <view class="template-preview" :style="{ background: template.bgColor }">
            <image class="preview-photo" :src="template.previewPhoto" mode="aspectFill" />
            <view class="preview-overlay">
              <view class="preview-info">
                <text class="preview-id">ID: 10001</text>
                <text class="preview-basic">26岁·168cm·本科</text>
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

    <canvas
      canvas-id="poster-canvas"
      id="poster-canvas"
      class="poster-canvas"
      :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
    ></canvas>

    <view v-if="showLoading" class="loading-overlay">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-text">绘制海报中...</text>
      </view>
    </view>

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
import request from '@/utils/request'
import { useUserStore } from '@/store/user'

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
const userId = ref<number>(0)
const showLoading = ref(false)
const showPreview = ref(false)
const generatedImagePath = ref('')
const selectedTemplate = ref<PosterTemplate | null>(null)

const canvasId = 'poster-canvas'
const canvasWidth = 750
const canvasHeight = 1200

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any)?.options || {}

  if (options.userId) {
    userId.value = parseInt(options.userId)
  } else {
    userId.value = userStore.userInfo?.id || 0
  }
})

const handleBack = () => {
  uni.navigateBack()
}

const selectTemplate = async (template: PosterTemplate) => {
  selectedTemplate.value = template
  await generatePoster(template)
}

const generatePoster = async (template: PosterTemplate) => {
  try {
    showLoading.value = true

    const userData = await fetchUserData()

    const ctx = uni.createCanvasContext(canvasId) as any
    ctx.width = canvasWidth
    ctx.height = canvasHeight

    drawPosterBackground(ctx, template)
    await drawUserPhoto(ctx, userData.avatar || userData.photos?.[0]?.url)
    drawUserInfo(ctx, userData, template)
    drawSelfIntro(ctx, userData.selfIntro)
    drawQRCode(ctx, template)
    drawFooter(ctx)

    ctx.draw()

    await new Promise<void>((resolve) => {
      setTimeout(async () => {
        try {
          const res = await new Promise<any>((resolve, reject) => {
            uni.canvasToTempFilePath({
              canvasId,
              quality: 0.9,
              success: (res) => resolve(res),
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

const drawPosterBackground = (ctx: any, template: PosterTemplate) => {
  ctx.setFillStyle('#FFFFFF')
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
}

const drawUserPhoto = async (ctx: any, photoUrl: string) => {
  const photoWidth = canvasWidth
  const photoHeight = 520
  const y = 0

  try {
    const tempFilePath = await downloadImage(photoUrl)

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, y, photoWidth, photoHeight)
    ctx.clip()

    ctx.drawImage(tempFilePath, 0, y, photoWidth, photoHeight)
    ctx.restore()
  } catch (e) {
    ctx.setFillStyle('#f0f0f0')
    ctx.fillRect(0, y, photoWidth, photoHeight)
  }
}

const drawUserInfo = (ctx: any, userData: any, template: PosterTemplate) => {
  const startY = 540
  const leftX = 60
  const rightX = 400
  const rowHeight = 48
  const labelFontSize = 24
  const valueFontSize = 26

  ctx.setFillStyle('#999999')
  ctx.setFontSize(labelFontSize)
  ctx.fillText('ID', leftX, startY + rowHeight * 0)
  ctx.fillText('婚况', leftX, startY + rowHeight * 1)
  ctx.fillText('年龄', leftX, startY + rowHeight * 2)
  ctx.fillText('身高', rightX, startY + rowHeight * 0)
  ctx.fillText('学历', rightX, startY + rowHeight * 1)
  ctx.fillText('月薪', rightX, startY + rowHeight * 2)

  ctx.setFillStyle('#333333')
  ctx.setFontSize(valueFontSize)
  ctx.fillText(`:${userData.id || '10001'}`, leftX + 60, startY + rowHeight * 0)
  ctx.fillText(`:${userData.maritalStatus || '未婚'}`, leftX + 90, startY + rowHeight * 1)
  ctx.fillText(`:${userData.age || '26'}岁`, leftX + 60, startY + rowHeight * 2)
  ctx.fillText(`:${userData.height || '168'}cm`, rightX + 70, startY + rowHeight * 0)
  ctx.fillText(`:${userData.education || '本科'}`, rightX + 70, startY + rowHeight * 1)
  ctx.fillText(`:${userData.incomeRange || '8千-1.2万'}`, rightX + 70, startY + rowHeight * 2)

  ctx.setStrokeStyle('#EEEEEE')
  ctx.setLineWidth(1)
  ctx.beginPath()
  ctx.moveTo(leftX, startY + rowHeight * 3 - 10)
  ctx.lineTo(canvasWidth - leftX, startY + rowHeight * 3 - 10)
  ctx.stroke()
}

const drawSelfIntro = (ctx: any, selfIntro: string) => {
  const startY = 720
  const maxWidth = canvasWidth - 120
  const lineHeight = 36
  const maxLines = 8
  const fontSize = 24

  ctx.setFillStyle('#666666')
  ctx.setFontSize(fontSize)

  const introText = selfIntro || '这个人很懒，什么都没有留下~'
  const lines = wrapText(ctx, introText, maxWidth, maxLines)

  lines.forEach((line: string, index: number) => {
    ctx.fillText(line, 60, startY + index * lineHeight)
  })
}

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

  if (lines.length >= maxLines && lines[lines.length - 1].length < text.length) {
    lines[lines.length - 1] = lines[lines.length - 1].substring(0, lines[lines.length - 1].length - 2) + '...'
  }

  return lines
}

const drawQRCode = (ctx: any, template: PosterTemplate) => {
  const qrSize = 200
  const qrX = canvasWidth - qrSize - 60
  const qrY = canvasHeight - qrSize - 120

  ctx.setFillStyle('#FFFFFF')
  ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 60)
  ctx.setStrokeStyle('#EEEEEE')
  ctx.setLineWidth(1)
  ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 60)

  ctx.setFillStyle('#f5f5f5')
  ctx.fillRect(qrX, qrY, qrSize, qrSize)

  ctx.setFillStyle('#999999')
  ctx.setFontSize(18)
  ctx.fillText('小程序码', qrX + qrSize / 2 - 35, qrY + qrSize / 2 + 6)

  ctx.setFillStyle(template.tagColor)
  ctx.setFontSize(20)
  ctx.fillText('长按识别认识TA', qrX - 10, qrY + qrSize + 35)

  ctx.setFontSize(18)
  ctx.fillText('来自栖缘社，值得您信赖的相亲平台', qrX - 10, qrY + qrSize + 55)
}

const drawFooter = (ctx: any) => {
  const y = canvasHeight - 60

  ctx.setFillStyle('#FF6B9D')
  ctx.setFontSize(22)
  ctx.fillText('栖缘社', canvasWidth / 2 - 30, y)
}

const fetchUserData = async () => {
  try {
    const res = await request({
      url: `/users/${userId.value}`,
      method: 'GET',
    })

    const userData = res.user || res

    if (userData.birthYear && !userData.age) {
      userData.age = new Date().getFullYear() - userData.birthYear
    }

    return userData
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

    uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath)
        } else {
          reject(new Error('Download failed'))
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
  font-size: 28rpx;
  color: #999;
  margin-bottom: 24rpx;
}

.preview-image {
  width: 100%;
  border-radius: 16rpx;
}

.preview-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
}

.action-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 44rpx;
  font-size: 30rpx;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
}

.save-btn {
  background-color: #FF6B9D;
  color: #fff;
}

canvas {
  position: fixed;
  top: -9999px;
  left: -9999px;
  width: 750px;
  height: 1200px;
}
</style>

<canvas canvas-id="poster-canvas" id="poster-canvas" style="position:fixed;top:-9999px;left:-9999px;width:750px;height:1200px;"></canvas>
