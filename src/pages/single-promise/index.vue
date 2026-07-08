<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack">
          <text class="back-icon">{{ '<' }}</text>
        </view>
        <text class="nav-title">单身承诺</text>
        <view class="nav-right" />
      </view>
    </view>

    <view
      class="content"
      :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }"
    >
      <!-- ========== 粉色渐变背景区域 ========== -->
      <view class="hero-section">
        <text class="hero-title">为什么要签署</text>
        <view class="hero-tags">
          <text class="hero-tag">更真实</text>
          <text class="hero-tag">更匹配</text>
          <text class="hero-tag">更高效</text>
        </view>
        <text class="hero-desc">平台会优先推荐信息更为全面真实的用户</text>
      </view>

      <!-- ========== 白色承诺书卡片 ========== -->
      <view class="promise-card">
        <text class="promise-decor">· 单身承诺书 ·</text>

        <!-- 用户姓名区域 -->
        <view class="promise-signer">
          <input
            v-if="isNamePlaceholder"
            class="signer-name-input"
            :value="realName === '用户' ? '' : realName"
            @input="onNameInput"
            @focus="onNameFocus"
            type="text"
            placeholder="请输入真实姓名"
            placeholder-style="color:#ccc;font-size:28rpx;"
          />
          <text v-else class="signer-name">{{ realName }}</text>
          <text class="signer-text"> 在此承诺：</text>
        </view>

        <!-- 承诺正文 -->
        <text class="promise-body">
          本人目前婚姻状况为单身状态，并自愿授权"栖缘社"平台向国家有关部门进行任何必须的了解和查询。如有不实，本人自愿承担由此产生的一切法律责任和后果，且与平台无关。
        </text>

        <!-- 签名与日期 -->
        <view class="promise-signature">
          <view class="sig-box" v-if="!isSigned">
            <text class="sig-placeholder">手写签名区域</text>
          </view>
          <image
            v-else
            class="sig-image"
            :src="existingSignatureUrl"
            mode="aspectFit"
          />
          <text class="sig-date">{{ signedDate }}</text>
        </view>
      </view>

      <!-- ========== 签名确认区域 ========== -->
      <view class="sign-section">
        <text class="sign-title">签名确认签署承诺书</text>
        <text class="sign-hint">（请确保字迹清晰，与实名认证姓名一致）</text>

        <!-- 签名画布 -->
        <view
          class="sign-canvas-wrap"
          :class="{ 'disabled': isSigned && !isResigning }"
        >
          <canvas
            v-show="!isSigned || isResigning"
            class="sign-canvas"
            canvas-id="signCanvas"
            id="signCanvas"
            @touchstart.stop="onTouchStart"
            @touchmove.stop="onTouchMove"
            @touchend.stop="onTouchEnd"
          />
          <image
            v-show="isSigned && !isResigning"
            class="sign-canvas-img"
            :src="existingSignatureUrl"
            mode="aspectFit"
          />

          <!-- 重签按钮 -->
          <view class="resign-btn" @tap="handleResign">
            <text class="resign-icon">↻</text>
            <text class="resign-text">重签</text>
          </view>
        </view>
      </view>

      <!-- ========== 底部按钮 ========== -->
      <view class="bottom-area">
        <view
          v-if="isSigned && !isResigning"
          class="submit-btn submitted"
          @tap="handleModify"
        >
          <text class="submit-text">已提交待审 审核前可修改</text>
        </view>
        <view
          v-else
          class="submit-btn"
          :class="{ disabled: strokeCount < 3 }"
          @tap="handleSubmit"
        >
          <text class="submit-text">提交审核</text>
        </view>
      </view>
    </view>

    <!-- ========== 提交确认弹窗 ========== -->
    <view v-if="showConfirm" class="modal-mask" @tap="cancelSubmit">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">提示</text>
        <text class="modal-body">
          本人承诺签名的信息真实有效，并承诺对因提交虚假材料、证件所引发的一切后果承担相应的法律责任！
        </text>
        <view class="modal-btns">
          <view class="modal-btn cancel" @tap="cancelSubmit">
            <text>取消</text>
          </view>
          <view class="modal-btn confirm" @tap="confirmSubmit">
            <text>提交</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ========== 提交成功弹窗 ========== -->
    <view v-if="showSuccess" class="toast-mask">
      <view class="toast-card">
        <text class="toast-icon">✓</text>
        <text class="toast-text">提交成功</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { safeNavigateBack } from '@/utils/navigate'
import { get, getBaseUrl } from '@/utils/request'
import { getToken } from '@/utils/auth'
import { getFullImageUrl } from '@/utils/common'

const statusBarHeight = ref(20)
const navBarHeightPx = ref(44)

// ========== 状态 ==========
const realName = ref('用户')

// 当姓名为占位符'用户'时，显示输入框让用户手动填写
const isNamePlaceholder = computed(() => realName.value === '用户')

// 姓名输入框聚焦时清除默认值
const onNameFocus = () => {
  if (realName.value === '用户') {
    realName.value = ''
  }
}
// 姓名输入框手动输入
const onNameInput = (e: any) => {
  realName.value = e.detail?.value ?? e.target?.value ?? ''
}
const isSigned = ref(false)
const isResigning = ref(false)
const existingSignatureUrl = ref('')
const signedDate = ref('')
const showConfirm = ref(false)
const showSuccess = ref(false)
const strokeCount = ref(0)

// Canvas 上下文
let ctx: any = null
let canvasWidth = 0
let canvasHeight = 0
let isDrawing = ref(false)
let lastX = 0
let lastY = 0

onMounted(async () => {
  const sysInfo = uni.getWindowInfo() as any
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)

  await loadStatus()
  if (!isSigned.value) {
    await initCanvas()
  }
})

// ========== 加载状态 ==========
async function loadStatus() {
  try {
    const res: any = await get('/single-promise/status')
    const data = res?.data || res
    if (data?.exists) {
      isSigned.value = true
      realName.value = data.realName || '用户'
      existingSignatureUrl.value = getFullImageUrl(data.signatureUrl || '')
      signedDate.value = formatDate(data.createdAt)
    } else {
      // 从用户资料获取真实姓名
      try {
        const profile: any = await get('/auth/profile')
        if (profile?.data?.realName || profile?.realName) {
          realName.value = profile.data?.realName || profile?.realName || '用户'
        }
      } catch (_) {}
    }
  } catch (e) {
    console.error('加载单身承诺状态失败:', e)
  }
}

// ========== Canvas 初始化 ==========
async function initCanvas(): Promise<void> {
  return new Promise((resolve) => {
    // 延迟确保 canvas 原生组件渲染就绪
    setTimeout(() => {
      ctx = uni.createCanvasContext('signCanvas')
      const query = uni.createSelectorQuery()
      query.select('#signCanvas').boundingClientRect()
      query.exec((res: any) => {
        if (res && res[0]) {
          canvasWidth = res[0].width
          canvasHeight = res[0].height
        }
        resolve()
      })
    }, 500)
  })
}

// ========== 签名事件（触摸坐标 = 画布内坐标） ==========
function onTouchStart(e: any) {
  if (isSigned.value && !isResigning.value) return
  isDrawing.value = true
  const touch = e.touches[0]
  lastX = touch.x
  lastY = touch.y
  ctx.setStrokeStyle('#000000')
  ctx.setLineWidth(3)
  ctx.setLineCap('round')
  ctx.setLineJoin('round')
}

function onTouchMove(e: any) {
  if (!isDrawing.value || !ctx) return
  const touch = e.touches[0]
  const x = touch.x
  const y = touch.y
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.draw(true)
  lastX = x
  lastY = y
}

function onTouchEnd() {
  if (isDrawing.value) {
    strokeCount.value++
  }
  isDrawing.value = false
}

// ========== 重签 ==========
function handleResign() {
  if (isSigned.value) {
    isResigning.value = true
    existingSignatureUrl.value = ''
    nextTick(() => initCanvas())
    strokeCount.value = 0
  } else {
    strokeCount.value = 0
    clearCanvas()
  }
}

function clearCanvas() {
  if (!ctx) return
  ctx.clearRect(0, 0, canvasWidth || 300, canvasHeight || 200)
  ctx.draw()
}

// ========== 导出签名图片 ==========
function exportSignature(): Promise<string> {
  return new Promise((resolve, reject) => {
    // 延迟确保画布渲染完毕（参考 poster 页面做法）
    setTimeout(() => {
      uni.canvasToTempFilePath({
        canvasId: 'signCanvas',
        destWidth: (canvasWidth || 300) * 2,
        destHeight: (canvasHeight || 200) * 2,
        fileType: 'png',
        success: (res: any) => {
          console.log('[签名导出] 成功:', res.tempFilePath)
          resolve(res.tempFilePath)
        },
        fail: (err: any) => {
          console.error('[签名导出] 失败:', err)
          reject(err)
        },
      })
    }, 500)
  })
}

// ========== 提交 ==========
async function handleSubmit() {
  if (strokeCount.value < 3) {
    uni.showToast({ title: '请至少书写3笔以上', icon: 'none' })
    return
  }
  showConfirm.value = true
}

function cancelSubmit() {
  showConfirm.value = false
}

async function confirmSubmit() {
  showConfirm.value = false
  uni.showLoading({ title: '提交中...', mask: true })

  try {
    // 导出签名图片
    console.log('[提交] 开始导出签名...')
    const tempPath = await exportSignature()
    console.log('[提交] 签名导出成功:', tempPath)

    // 上传签名图片并提交
    const token = getToken()
    const baseUrl = getBaseUrl()
    const uploadUrl = `${baseUrl}/single-promise/submit`
    console.log('[提交] 上传至:', uploadUrl)

    const res = await new Promise<any>((resolve, reject) => {
      uni.uploadFile({
        url: uploadUrl,
        filePath: tempPath,
        name: 'file',
        formData: { realName: realName.value },
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: (uploadRes) => {
          console.log('[提交] 上传响应:', uploadRes.statusCode, uploadRes.data)
          try {
            resolve(JSON.parse(uploadRes.data))
          } catch {
            reject(new Error('响应解析失败'))
          }
        },
        fail: (err) => {
          console.error('[提交] 上传失败:', err)
          reject(err)
        },
      })
    })

    uni.hideLoading()
    console.log('[提交] 服务端响应:', res)

    if (res?.code === 200 || res?.success) {
      showSuccess.value = true
      setTimeout(() => {
        showSuccess.value = false
        isSigned.value = true
        isResigning.value = false
        loadStatus()
      }, 1500)
    } else {
      uni.showToast({ title: res?.msg || res?.message || '提交失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.hideLoading()
    console.error('[提交] 异常:', e)
    uni.showToast({ title: e?.message || '提交失败，请重试', icon: 'none' })
  }
}

// ========== 修改（已签署状态重新编辑） ==========
function handleModify() {
  uni.showModal({
    title: '提示',
    content: '审核前可修改签名，是否重新签署？',
    success: (res) => {
      if (res.confirm) {
        isResigning.value = true
        nextTick(() => initCanvas())
        strokeCount.value = 0
      }
    },
  })
}

// ========== 工具函数 ==========
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}年${m}月${day}日`
}

function handleBack() {
  safeNavigateBack()
}
</script>

<style lang="scss" scoped>
$pink: #FF6B8A;
$pink-light: #FF8FA3;

.page { min-height: 100vh; background: #FFF5F7; }

// ===== 导航栏 =====
.nav-wrap {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: #fff; border-bottom: 1rpx solid #E5E5E5;
}
.nav-bar {
  height: 88rpx; display: flex; align-items: center; justify-content: center; position: relative;
}
.nav-left {
  position: absolute; left: 20rpx; width: 60rpx; height: 60rpx;
  display: flex; align-items: center; justify-content: center;
}
.back-icon { font-size: 40rpx; color: #333; font-weight: 500; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #333; }
.nav-right { position: absolute; right: 20rpx; width: 60rpx; }

// ===== 粉色渐变区域 =====
.hero-section {
  background: linear-gradient(135deg, #FFF0F5 0%, #FFF8F8 100%);
  padding: 48rpx 40rpx 60rpx;
}
.hero-title {
  font-size: 44rpx; font-weight: 700; color: #333;
}
.hero-tags {
  display: flex; gap: 16rpx; margin-top: 24rpx;
}
.hero-tag {
  background: rgba(255, 107, 138, 0.12); border-radius: 40rpx;
  padding: 8rpx 24rpx; font-size: 24rpx; color: $pink;
}
.hero-desc {
  display: block; margin-top: 24rpx; font-size: 28rpx; color: #999; line-height: 1.6;
}

// ===== 承诺书卡片 =====
.promise-card {
  margin: -30rpx 30rpx 0;
  background: #fff; border-radius: 32rpx;
  padding: 40rpx 36rpx 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
  position: relative; z-index: 2;
}
.promise-decor {
  display: block; text-align: center; font-size: 32rpx;
  font-weight: 600; color: $pink; margin-bottom: 40rpx;
}
.promise-signer {
  margin-bottom: 24rpx;
}
.signer-name {
  font-size: 32rpx; font-weight: 600; color: $pink;
}
.signer-name-input {
  font-size: 32rpx; font-weight: 600; color: $pink;
  border-bottom: 2rpx solid $pink; padding-bottom: 4rpx; min-width: 120rpx;
  height: 44rpx; line-height: 44rpx;
}
.signer-text {
  font-size: 32rpx; color: #333; font-weight: 400;
}
.promise-body {
  display: block; font-size: 30rpx; color: #333; line-height: 1.8;
  text-align: justify; text-indent: 2em;
}
.promise-signature {
  display: flex; flex-direction: column; align-items: flex-end;
  margin-top: 32rpx; padding-top: 24rpx;
  border-top: 1rpx dashed #eee;
}
.sig-box {
  width: 160rpx; height: 80rpx; border: 2rpx dashed #ddd;
  border-radius: 12rpx; display: flex; align-items: center; justify-content: center;
  margin-bottom: 8rpx;
}
.sig-placeholder { font-size: 20rpx; color: #ccc; }
.sig-image {
  width: 160rpx; height: 80rpx; margin-bottom: 8rpx;
}
.sig-date {
  font-size: 26rpx; color: #666;
}

// ===== 签名区域 =====
.sign-section {
  margin: 36rpx 30rpx 0; background: #fff;
  border-radius: 24rpx; padding: 36rpx;
}
.sign-title {
  font-size: 32rpx; font-weight: 600; color: #111;
}
.sign-hint {
  display: block; font-size: 26rpx; color: $pink; margin-top: 8rpx;
}
.sign-canvas-wrap {
  position: relative; margin-top: 24rpx;
  background: #F5F5F5; border-radius: 24rpx;
  height: 400rpx; overflow: hidden;

  &.disabled { opacity: 0.85; }
}
.sign-canvas, .sign-canvas-img {
  width: 100%; height: 100%;
}
.resign-btn {
  position: absolute; right: 16rpx; bottom: 16rpx;
  display: flex; align-items: center; gap: 4rpx;
  padding: 8rpx 16rpx; background: rgba(255,255,255,0.9);
  border-radius: 20rpx; z-index: 5;
}
.resign-icon { font-size: 24rpx; color: #999; }
.resign-text { font-size: 24rpx; color: #999; }

// ===== 底部按钮 =====
.bottom-area { padding: 48rpx 30rpx 60rpx; }
.submit-btn {
  height: 96rpx; border-radius: 48rpx;
  background: linear-gradient(90deg, $pink-light, $pink);
  display: flex; align-items: center; justify-content: center;

  &.disabled {
    background: #ccc;
  }
  &.submitted { background: linear-gradient(90deg, $pink-light, $pink); }
}
.submit-text { font-size: 32rpx; font-weight: 600; color: #fff; }

// ===== 确认弹窗 =====
.modal-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); z-index: 200;
  display: flex; align-items: center; justify-content: center;
}
.modal-card {
  width: 560rpx; background: #fff; border-radius: 32rpx;
  padding: 40rpx 40rpx 32rpx;
}
.modal-title {
  display: block; text-align: center;
  font-size: 36rpx; font-weight: 600; color: #333;
}
.modal-body {
  display: block; margin-top: 24rpx;
  font-size: 30rpx; color: #666; line-height: 1.6;
  text-align: center; padding: 0 20rpx;
}
.modal-btns {
  display: flex; gap: 24rpx; margin-top: 40rpx;
}
.modal-btn {
  flex: 1; height: 80rpx; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 28rpx;

  &.cancel { background: #F5F5F5; color: #333; }
  &.confirm { background: #07C160; color: #fff; font-weight: 600; }
}

// ===== 成功弹窗（黑底白勾白字） =====
.toast-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6); z-index: 300;
  display: flex; align-items: center; justify-content: center;
}
.toast-card {
  width: 240rpx; height: 240rpx;
  background: #333; border-radius: 24rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.toast-icon {
  font-size: 64rpx; color: #fff; font-weight: bold;
}
.toast-text {
  font-size: 30rpx; color: #fff; margin-top: 24rpx;
}
</style>
