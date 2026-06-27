<template>
  <view class="poster-page">
    <!-- ===== 导航栏（适配安全区） ===== -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">←</text>
        </view>
        <text class="nav-title">{{ appName }}</text>
        <view class="nav-right" @tap="toggleTemplateView">
          <text class="nav-more-icon">{{ showTemplateGrid ? '⋯' : '👁' }}</text>
        </view>
      </view>
    </view>

    <view class="page-body" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <!-- ===== 模板选择区 ===== -->
      <view v-if="showTemplateGrid">
        <view class="section-hint">点击模板生成推广卡</view>
        <view class="template-grid">
          <view
            v-for="template in filteredTemplates"
            :key="template.id"
            class="template-card"
            @tap="selectTemplate(template)"
          >
            <view class="card-preview" :style="{ background: template.bgGradient }">
              <!-- 模板缩略图内照片 -->
              <view class="card-photo-area">
                <image
                  class="card-photo"
                  :src="userPhotoUrl || '/static/default-avatar.png'"
                  mode="aspectFill"
                />
                <!-- 信息浮层 -->
                <view class="card-photo-info">
                  <text class="card-info-text">ID:{{ userId || '---' }}</text>
                  <text class="card-info-text">{{ userAge || '--' }}岁 · {{ userHeight || '--' }}cm · {{ userEducation || '--' }}</text>
                </view>
                <!-- 彩色标签（右上角） -->
                <view class="card-tag" :style="{ background: template.tagColor }">
                  <text>{{ template.tagLabel }}</text>
                </view>
              </view>
              <!-- 不同模板的底部信息排版 -->
              <view v-if="template.layout === 'info-card'" class="card-bottom-info">
                <text class="card-bottom-name">{{ userNickname || '用户' }}</text>
                <text class="card-bottom-detail">{{ userOccupation || '' }}</text>
              </view>
              <view v-else-if="template.layout === 'side-info'" class="card-side-info">
                <view class="card-side-avatar">
                  <image class="card-side-avatar-img" :src="userPhotoUrl || '/static/default-avatar.png'" mode="aspectFill" />
                </view>
                <view class="card-side-text">
                  <text class="card-side-name">{{ userNickname || '用户' }}</text>
                  <text class="card-side-detail">ID:{{ userId || '---' }}</text>
                </view>
              </view>
              <view v-else class="card-simple-footer">
                <text class="card-footer-text">{{ userNickname || '用户' }}</text>
              </view>
            </view>
            <text class="card-name">{{ template.name }}</text>
          </view>
        </view>
      </view>

      <!-- ===== 预览区：已选模板的放大效果 ===== -->
      <view v-if="!showTemplateGrid && selectedTemplate" class="preview-section">
        <view class="preview-header">
          <view class="preview-back-btn" @tap="toggleTemplateView">
            <text class="back-icon">←</text>
          </view>
          <text class="preview-title">{{ appName }}</text>
          <view class="preview-placeholder" />
        </view>
        <view class="preview-hint">点击按钮保存图片，分享到群或朋友圈</view>

        <!-- 海报预览卡片 -->
        <view class="poster-preview-card">
          <!-- 照片区 -->
          <view class="poster-photo-section">
            <image
              class="poster-photo"
              :src="userPhotoUrl || '/static/default-avatar.png'"
              mode="aspectFill"
            />
            <!-- 实名认证徽章 -->
            <view v-if="userRealNameVerified" class="auth-badge">
              <text class="auth-badge-text">✓ 实名认证</text>
            </view>
            <!-- 标签 -->
            <view class="poster-tag" :style="{ background: selectedTemplate.tagColor }">
              <text>{{ selectedTemplate.tagLabel }}</text>
            </view>
          </view>
          <!-- 信息区：两列 -->
          <view class="poster-info-section">
            <view class="poster-info-row">
              <view class="poster-info-col">
                <text class="info-label">ID</text>
                <text class="info-value">:{{ userId || '---' }}</text>
              </view>
              <view class="poster-info-col">
                <text class="info-label">婚况</text>
                <text class="info-value">:{{ userMaritalStatus || '---' }}</text>
              </view>
            </view>
            <view class="poster-info-row">
              <view class="poster-info-col">
                <text class="info-label">年龄</text>
                <text class="info-value">:{{ userAge ? userAge + '岁' : '---' }}</text>
              </view>
              <view class="poster-info-col">
                <text class="info-label">身高</text>
                <text class="info-value">:{{ userHeight ? userHeight + 'cm' : '---' }}</text>
              </view>
            </view>
            <view class="poster-info-row">
              <view class="poster-info-col">
                <text class="info-label">学历</text>
                <text class="info-value">:{{ userEducation || '---' }}</text>
              </view>
              <view class="poster-info-col">
                <text class="info-label">月薪</text>
                <text class="info-value">:{{ userIncome || '---' }}</text>
              </view>
            </view>
            <view class="poster-info-row">
              <view class="poster-info-col">
                <text class="info-label">职业</text>
                <text class="info-value">:{{ userOccupation || '---' }}</text>
              </view>
              <view class="poster-info-col">
                <text class="info-label">籍贯</text>
                <text class="info-value">:{{ userHometown || '---' }}</text>
              </view>
            </view>
          </view>
          <!-- 择偶要求 -->
          <view v-if="partnerRequirements" class="poster-partner-section">
            <text class="partner-section-title">择偶要求</text>
            <text class="partner-section-text">{{ partnerRequirements }}</text>
          </view>
          <!-- 底部分隔 -->
          <view class="poster-divider" />
          <!-- 二维码 + 品牌 -->
          <view class="poster-footer">
            <view class="poster-brand">
              <text class="brand-name">{{ appName }}</text>
              <text class="brand-desc">值得信赖的相亲平台</text>
            </view>
            <view class="poster-qr">
              <image class="qr-img" src="/static/qr-placeholder.png" mode="aspectFit" />
              <text class="qr-tip">长按识别认识TA</text>
            </view>
          </view>
        </view>

        <!-- 底部操作按钮 -->
        <view class="preview-actions">
          <view class="preview-action-btn cancel-btn" @tap="cancelGenerate">
            <text>取消</text>
          </view>
          <view class="preview-action-btn save-btn" @tap="savePosterAction">
            <text>保存</text>
          </view>
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

    <!-- 生成成功后预览弹窗（展示 Canvas 生成的图片） -->
    <view v-if="showPreview" class="preview-popup">
      <view class="preview-popup-mask" @tap="closePreview"></view>
      <view class="preview-popup-card">
        <text class="popup-hint">点击按钮保存图片，分享到群或朋友圈</text>
        <image class="popup-image" :src="generatedImagePath" mode="widthFix" />
        <view class="popup-actions">
          <view class="popup-btn cancel-btn" @tap="closePreview">
            <text>取消</text>
          </view>
          <view class="popup-btn save-btn" @tap="savePoster">
            <text>保存</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import request, { getServerBaseUrl } from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { safeNavigateBack } from '@/utils/navigate'

interface PosterTemplate {
  id: number
  name: string
  tagColor: string
  tagLabel: string
  bgGradient: string
  gender: 'male' | 'female' | 'all'
  layout: 'photo-only' | 'info-card' | 'side-info'
}

const TEMPLATES: PosterTemplate[] = [
  {
    id: 1,
    name: '推荐女嘉宾',
    tagColor: '#FF6B9D',
    tagLabel: '推荐女嘉宾',
    bgGradient: 'linear-gradient(135deg, #FFE4EC 0%, #FFF0F5 100%)',
    gender: 'female',
    layout: 'info-card',
  },
  {
    id: 2,
    name: '推荐男嘉宾',
    tagColor: '#4A90E2',
    tagLabel: '推荐男嘉宾',
    bgGradient: 'linear-gradient(135deg, #E3F0FF 0%, #EDF6FF 100%)',
    gender: 'male',
    layout: 'info-card',
  },
  {
    id: 3,
    name: '甜蜜约会',
    tagColor: '#FF8C42',
    tagLabel: '甜蜜约会',
    bgGradient: 'linear-gradient(135deg, #FFF5EC 0%, #FFF0E0 100%)',
    gender: 'all',
    layout: 'side-info',
  },
  {
    id: 4,
    name: '缘定今生',
    tagColor: '#7C3AED',
    tagLabel: '缘定今生',
    bgGradient: 'linear-gradient(135deg, #F3EDFF 0%, #EDE0FF 100%)',
    gender: 'all',
    layout: 'photo-only',
  },
  {
    id: 5,
    name: '基本资料',
    tagColor: '#555555',
    tagLabel: '基本资料',
    bgGradient: 'linear-gradient(135deg, #F5F5F5 0%, #EEEEEE 100%)',
    gender: 'all',
    layout: 'info-card',
  },
]

const userStore = useUserStore()
const systemStore = useSystemStore()

const userId = ref<number>(0)
const showLoading = ref(false)
const showPreview = ref(false)
const showTemplateGrid = ref(true)
const generatedImagePath = ref('')
const selectedTemplate = ref<PosterTemplate | null>(null)

// 用户展示数据
const userPhotoUrl = ref('')
const userNickname = ref('')
const userAge = ref<string | number>('')
const userHeight = ref<string | number>('')
const userEducation = ref('')
const userOccupation = ref('')
const userIncome = ref('')
const userMaritalStatus = ref('')
const userHometown = ref('')
const userGender = ref<string>('')
const userRealNameVerified = ref(false)
const partnerRequirements = ref('')

const appName = computed(() => systemStore.appName || '灵通相亲')

const canvasWidth = 750
const canvasHeight = 1200

// 安全区高度
const statusBarHeight = ref(44)
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 44
} catch { /* keep default */ }

// 性别过滤模板
const filteredTemplates = computed(() => {
  return TEMPLATES.filter((t) => {
    if (t.gender === 'all') return true
    if (userGender.value === 'male') return t.gender !== 'female'
    if (userGender.value === 'female') return t.gender !== 'male'
    return true // 未知性别显示全部
  })
})

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as Record<string, any>
  const options = currentPage?.options || {}

  if (options.userId) {
    userId.value = parseInt(String(options.userId))
  } else {
    userId.value = userStore.userInfo?.id || 0
  }

  if (userId.value) {
    await fetchUserData()
  }
})

const handleBack = () => {
  safeNavigateBack()
}

const toggleTemplateView = () => {
  showTemplateGrid.value = !showTemplateGrid.value
}

const fetchUserData = async () => {
  try {
    const res = await request({ url: `/users/${userId.value}`, method: 'GET' })
    const data = (res as Record<string, any>).user || res || {}

    userNickname.value = data.nickname || ''
    userAge.value = data.age || (data.birthYear ? new Date().getFullYear() - data.birthYear : '')
    userHeight.value = data.height || ''
    userEducation.value = data.education || ''
    userOccupation.value = data.occupation || ''
    userIncome.value = data.incomeRange || data.income || ''
    userMaritalStatus.value = data.maritalStatus || ''
    userHometown.value = (data.hometown || '').replace(/\//g, ',')
    userGender.value = data.gender || ''
    userRealNameVerified.value = !!(data.realNameVerified || data.isRealNameVerified)

    // 照片：优先取相册第一张，其次头像
    const photos = data.photos || []
    if (photos.length > 0 && photos[0].url) {
      userPhotoUrl.value = getFullImageUrl(photos[0].url) || ''
    } else if (data.avatar) {
      userPhotoUrl.value = getFullImageUrl(data.avatar) || ''
    }

    // 择偶要求
    const partnerTags = data.partnerTags || data.hopeTa?.partnerTags || []
    if (partnerTags.length) {
      partnerRequirements.value = partnerTags
        .map((t: any) => `${t.label || ''}${t.value || ''}`)
        .filter(Boolean)
        .join('，')
    } else if (data.hopeTa?.hopeText) {
      partnerRequirements.value = data.hopeTa.hopeText
    }
  } catch (e) {
    console.error('fetch user data error', e)
  }
}

const selectTemplate = async (template: PosterTemplate) => {
  selectedTemplate.value = template
  showTemplateGrid.value = false
  // 切换到预览视图，不立即生成 Canvas
}

const cancelGenerate = () => {
  showTemplateGrid.value = true
  selectedTemplate.value = null
}

const savePosterAction = async () => {
  if (!selectedTemplate.value) return
  await generatePoster(selectedTemplate.value)
}

// ==================== Canvas 海报生成 ====================

const generatePoster = async (template: PosterTemplate) => {
  try {
    showLoading.value = true
    showPreview.value = false

    const ctx = uni.createCanvasContext('poster-canvas') as any

    // 1. 白色背景
    ctx.setFillStyle('#FFFFFF')
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // 2. 顶部照片区域（750 x 560）
    const photoH = 560
    await drawPhoto(ctx, photoH)

    // 3. 照片底部渐变遮罩
    const gradientY = photoH - 100
    ctx.save()
    const grad = ctx.createLinearGradient(0, gradientY, 0, photoH)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.3)')
    ctx.setFillStyle(grad)
    ctx.fillRect(0, gradientY, canvasWidth, 100)
    ctx.restore()

    // 4. 实名认证徽章（照片左上角）
    if (userRealNameVerified.value) {
      ctx.setFillStyle('rgba(212, 175, 55, 0.9)')
      ctx.save()
      ctx.beginPath()
      ctx.arc(60, 50, 28, 0, 2 * Math.PI)  // dummy
      ctx.restore()
      ctx.setFillStyle('#D4AF37')
      ctx.setFontSize(22)
      ctx.fillText('✓ 实名认证', 36, 56)
    }

    // 5. 标签（照片右上角）
    ctx.setFillStyle(template.tagColor)
    const tagText = template.tagLabel
    ctx.setFontSize(26)
    const tagW = ctx.measureText(tagText).width + 40
    ctx.save()
    ctx.beginPath()
    // 使用简单矩形代替圆角（微信 canvas 可能不支持 roundRect）
    ctx.setFillStyle(template.tagColor)
    ctx.fillRect(canvasWidth - 40 - tagW, 36, tagW, 48)
    ctx.setFillStyle('#FFFFFF')
    ctx.fillText(tagText, canvasWidth - 40 - tagW + 20, 68)
    ctx.restore()

    // 6. 照片下方信息区
    const infoStartY = photoH + 40
    const leftX = 50
    const rightX = 400

    // 信息标题行
    ctx.setFillStyle('#333333')
    ctx.setFontSize(34)
    ctx.fillText(userNickname.value || '用户', leftX, infoStartY)

    // 基本信息行
    const basicParts: string[] = []
    if (userAge.value) basicParts.push(`${userAge.value}岁`)
    if (userHeight.value) basicParts.push(`${userHeight.value}cm`)
    if (userEducation.value) basicParts.push(userEducation.value)
    const basicText = basicParts.join(' · ')
    ctx.setFillStyle('#999999')
    ctx.setFontSize(24)
    ctx.fillText(basicText, leftX, infoStartY + 40)

    // 分隔线
    const divider1Y = infoStartY + 70
    ctx.setStrokeStyle('#F0F0F0')
    ctx.setLineWidth(2)
    ctx.beginPath()
    ctx.moveTo(leftX, divider1Y)
    ctx.lineTo(canvasWidth - 50, divider1Y)
    ctx.stroke()

    // 两列信息
    const infoItems = [
      { label: 'ID', value: `:${userId.value || '---'}` },
      { label: '婚况', value: `:${userMaritalStatus.value || '---'}` },
      { label: '年龄', value: `:${userAge.value ? userAge.value + '岁' : '---'}` },
      { label: '身高', value: `:${userHeight.value ? userHeight.value + 'cm' : '---'}` },
      { label: '学历', value: `:${userEducation.value || '---'}` },
      { label: '月薪', value: `:${userIncome.value || '---'}` },
      { label: '职业', value: `:${userOccupation.value || '---'}` },
      { label: '籍贯', value: `:${userHometown.value || '---'}` },
    ]

    const rowH = 46
    const col1X = leftX
    const col2X = rightX

    infoItems.forEach((item, i) => {
      const col = i % 2 === 0 ? col1X : col2X
      const row = Math.floor(i / 2)
      const y = divider1Y + 30 + row * rowH

      ctx.setFillStyle('#999999')
      ctx.setFontSize(22)
      ctx.fillText(item.label, col, y)

      ctx.setFillStyle('#333333')
      ctx.setFontSize(24)
      ctx.fillText(item.value, col + 90, y)
    })

    const infoEndY = divider1Y + 30 + 4 * rowH + 20

    // 分割线
    ctx.setStrokeStyle('#F0F0F0')
    ctx.setLineWidth(2)
    ctx.beginPath()
    ctx.moveTo(leftX, infoEndY)
    ctx.lineTo(canvasWidth - 50, infoEndY)
    ctx.stroke()

    // 择偶要求
    if (partnerRequirements.value) {
      const partnerY = infoEndY + 30
      ctx.setFillStyle('#FF6B9D')
      ctx.setFontSize(22)
      ctx.fillText('择偶要求', leftX, partnerY)

      // 换行绘制择偶要求
      const maxWidth = canvasWidth - 100
      ctx.setFillStyle('#333333')
      ctx.setFontSize(24)
      const reqLines = wrapText(ctx, partnerRequirements.value, maxWidth, 4)
      reqLines.forEach((line, i) => {
        ctx.fillText(line, leftX, partnerY + 36 + i * 36)
      })
    }

    // 底部：二维码 + 品牌
    const footerY = canvasHeight - 220
    ctx.setStrokeStyle('#F0F0F0')
    ctx.setLineWidth(2)
    ctx.beginPath()
    ctx.moveTo(leftX, footerY)
    ctx.lineTo(canvasWidth - 50, footerY)
    ctx.stroke()

    // 左侧品牌
    ctx.setFillStyle('#FF6B9D')
    ctx.setFontSize(30)
    ctx.fillText(appName.value, leftX, footerY + 50)

    ctx.setFillStyle('#CCCCCC')
    ctx.setFontSize(20)
    ctx.fillText('值得信赖的相亲平台', leftX, footerY + 80)

    // 右侧二维码
    const qrSize = 160
    const qrX = canvasWidth - 50 - qrSize
    const qrY = footerY + 16

    ctx.setFillStyle('#FFFFFF')
    ctx.setStrokeStyle('#F0F0F0')
    ctx.setLineWidth(2)
    ctx.fillRect(qrX, qrY, qrSize, qrSize)
    ctx.strokeRect(qrX, qrY, qrSize, qrSize)

    // 尝试加载二维码图片
    try {
      const qrUrl = `${getServerBaseUrl()}/qr/4.png`
      const qrTempPath = await downloadImage(qrUrl)
      ctx.drawImage(qrTempPath, qrX + 8, qrY + 8, qrSize - 16, qrSize - 16)
    } catch {
      ctx.setFillStyle('#F5F5F5')
      ctx.fillRect(qrX + 8, qrY + 8, qrSize - 16, qrSize - 16)
      ctx.setFillStyle('#CCCCCC')
      ctx.setFontSize(18)
      ctx.fillText('小程序码', qrX + qrSize / 2 - 36, qrY + qrSize / 2 + 6)
    }

    // 二维码下方文字
    ctx.setFillStyle('#666666')
    ctx.setFontSize(18)
    const qrTip = '长按识别认识TA'
    const qrTipW = ctx.measureText(qrTip).width
    ctx.fillText(qrTip, qrX + qrSize / 2 - qrTipW / 2, qrY + qrSize + 24)

    ctx.setFillStyle('#CCCCCC')
    ctx.setFontSize(16)
    const fromText = `来自${appName.value}`
    const fromW = ctx.measureText(fromText).width
    ctx.fillText(fromText, qrX + qrSize / 2 - fromW / 2, qrY + qrSize + 48)

    ctx.draw()

    await new Promise<void>((resolve) => {
      setTimeout(async () => {
        try {
          const res = await new Promise<{ tempFilePath: string }>((resolve, reject) => {
            uni.canvasToTempFilePath({
              canvasId: 'poster-canvas',
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
        resolve()
      }, 500)
    })
  } catch (e) {
    console.error('generate poster error', e)
    showLoading.value = false
    uni.showToast({ title: '生成失败', icon: 'none' })
  }
}

const drawPhoto = async (ctx: any, photoH: number) => {
  if (userPhotoUrl.value) {
    try {
      const tempPath = await downloadImage(userPhotoUrl.value)
      ctx.drawImage(tempPath, 0, 0, canvasWidth, photoH)
      return
    } catch { /* fallback */ }
  }
  // 占位渐变
  const grad = ctx.createLinearGradient(0, 0, canvasWidth, photoH)
  grad.addColorStop(0, '#FFE4EC')
  grad.addColorStop(1, '#FFF0F5')
  ctx.setFillStyle(grad)
  ctx.fillRect(0, 0, canvasWidth, photoH)
}

const wrapText = (ctx: any, text: string, maxWidth: number, maxLines: number): string[] => {
  const chars = text.split('')
  const lines: string[] = []
  let currentLine = ''
  for (const char of chars) {
    const testLine = currentLine + char
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = char
      if (lines.length >= maxLines) break
    } else {
      currentLine = testLine
    }
  }
  if (lines.length < maxLines && currentLine) lines.push(currentLine)
  if (lines.length >= maxLines && currentLine.length > lines[lines.length - 1]?.length + 2) {
    lines[lines.length - 1] = lines[lines.length - 1].substring(0, lines[lines.length - 1].length - 1) + '…'
  }
  return lines
}

const downloadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!url) { reject(new Error('No URL')); return }
    const fullUrl = url.startsWith('http') ? url : getFullImageUrl(url)
    uni.downloadFile({
      url: fullUrl,
      success: (res) => {
        if (res.statusCode === 200) resolve(res.tempFilePath)
        else reject(new Error('Download failed'))
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
      data: { userId: userId.value, templateId },
    })
  } catch { /* ignore */ }
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
          uni.showToast({ title: '已保存到相册', icon: 'success' })
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
  background-color: #FAFAFA;
}

.poster-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
}

// ===== 导航栏（适配安全区） =====
.nav-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 200;
  background: linear-gradient(180deg, #FFE4EC 0%, #FFE4EC 60%, #FFF0F5 100%);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}

.nav-left {
  width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
}

.back-icon {
  font-size: 40rpx; color: #333; font-weight: 500;
}

.nav-title {
  font-size: 32rpx; font-weight: bold; color: #333;
}

.nav-right {
  width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
}

.nav-more-icon {
  font-size: 38rpx; color: #333;
}

// ===== 页面主体 =====
.page-body {
  min-height: 100vh;
}

// ===== 模板选择区 =====
.section-hint {
  text-align: center;
  font-size: 26rpx;
  color: #999;
  padding: 24rpx 0 20rpx;
}

.template-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 24rpx;
  gap: 16rpx;
}

.template-card {
  width: calc(50% - 8rpx);
  background: #fff;
  border-radius: 18rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.card-preview {
  width: 100%;
  height: 360rpx;
  position: relative;
  overflow: hidden;
}

.card-photo-area {
  position: relative;
  width: 100%;
  height: 100%;
}

.card-photo {
  width: 100%;
  height: 100%;
}

.card-photo-info {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 20rpx 16rpx 14rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.card-info-text {
  font-size: 20rpx;
  color: #fff;
  line-height: 1.3;
}

.card-tag {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  padding: 6rpx 14rpx;
  border-radius: 20rpx;
  font-size: 20rpx;
  color: #fff;
}

.card-bottom-info {
  position: absolute;
  bottom: 60rpx;
  left: 16rpx;
  display: flex;
  flex-direction: column;
}

.card-bottom-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
}

.card-bottom-detail {
  font-size: 20rpx;
  color: #666;
  margin-top: 4rpx;
}

.card-side-info {
  position: absolute;
  bottom: 50rpx;
  left: 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.card-side-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 2rpx solid #fff;
}

.card-side-avatar-img {
  width: 100%;
  height: 100%;
}

.card-side-text {
  display: flex;
  flex-direction: column;
}

.card-side-name {
  font-size: 24rpx;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
}

.card-side-detail {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.85);
}

.card-simple-footer {
  position: absolute;
  bottom: 40rpx;
  left: 50%;
  transform: translateX(-50%);
}

.card-footer-text {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
}

.card-name {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #333;
  padding: 14rpx 0;
}

// ===== 预览区 =====
.preview-section {
  padding: 0 24rpx 40rpx;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80rpx;
}

.preview-back-btn {
  width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
}

.preview-title {
  font-size: 30rpx; font-weight: bold; color: #333;
}

.preview-placeholder {
  width: 56rpx;
}

.preview-hint {
  text-align: center;
  font-size: 24rpx;
  color: #999;
  padding: 8rpx 0 24rpx;
}

// ===== 海报预览卡片 =====
.poster-preview-card {
  background: #fff;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.12);
  margin-bottom: 32rpx;
}

.poster-photo-section {
  position: relative;
  width: 100%;
  height: 500rpx;
  overflow: hidden;
}

.poster-photo {
  width: 100%;
  height: 100%;
}

.auth-badge {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  padding: 8rpx 16rpx;
  background: linear-gradient(135deg, #D4AF37, #F0D060);
  border-radius: 20rpx;
}

.auth-badge-text {
  font-size: 20rpx;
  color: #fff;
  font-weight: 500;
}

.poster-tag {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  padding: 10rpx 22rpx;
  border-radius: 24rpx;
  font-size: 22rpx;
  color: #fff;
}

.poster-info-section {
  padding: 28rpx 28rpx 0;
}

.poster-info-row {
  display: flex;
  margin-bottom: 18rpx;
}

.poster-info-col {
  flex: 1;
  display: flex;
  align-items: baseline;
}

.info-label {
  font-size: 24rpx;
  color: #999;
  min-width: 60rpx;
}

.info-value {
  font-size: 26rpx;
  color: #333;
  margin-left: 8rpx;
}

.poster-partner-section {
  padding: 0 28rpx 0;
  margin-top: 8rpx;
}

.partner-section-title {
  font-size: 22rpx;
  color: #FF6B9D;
  font-weight: 500;
  display: block;
  margin-bottom: 8rpx;
}

.partner-section-text {
  font-size: 24rpx;
  color: #333;
  line-height: 1.6;
}

.poster-divider {
  height: 1rpx;
  background: #F0F0F0;
  margin: 24rpx 28rpx;
}

.poster-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28rpx 28rpx;
}

.poster-brand {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 28rpx;
  color: #FF6B9D;
  font-weight: 600;
}

.brand-desc {
  font-size: 20rpx;
  color: #CCC;
  margin-top: 4rpx;
}

.poster-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-img {
  width: 120rpx;
  height: 120rpx;
  border: 2rpx solid #F0F0F0;
  border-radius: 8rpx;
}

.qr-tip {
  font-size: 18rpx;
  color: #666;
  margin-top: 4rpx;
}

// ===== 预览区底部操作 =====
.preview-actions {
  display: flex;
  justify-content: center;
  gap: 32rpx;
  padding: 0 24rpx;
}

.preview-action-btn {
  flex: 1;
  max-width: 280rpx;
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.cancel-btn {
  background: #F5F5F5;
  color: #666;
}

.save-btn {
  background: linear-gradient(135deg, #FF6B9D, #FF8FAB);
  color: #fff;
}

// ===== 加载遮罩 =====
.loading-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.75);
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
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #fff;
}

// ===== 预览弹窗（Canvas 生成的图片） =====
.preview-popup {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-popup-mask {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
}

.preview-popup-card {
  position: relative;
  z-index: 1;
  width: 88%;
  max-width: 660rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 28rpx;
}

.popup-hint {
  text-align: center;
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}

.popup-image {
  width: 100%;
  border-radius: 12rpx;
  display: block;
}

.popup-actions {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  margin-top: 24rpx;
}

.popup-btn {
  flex: 1;
  max-width: 240rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 500;
}
</style>
