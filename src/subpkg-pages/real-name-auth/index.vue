<template>
  <view class="real-name-auth-page">
    <!-- 自定义导航栏 -->
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <text class="nav-back" @tap="handleBack">←</text>
        <text class="nav-title">灵通相亲</text>
        <text class="nav-placeholder"></text>
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view
      class="page-content"
      scroll-y
      :style="{ paddingTop: navTopPx + 'px' }"
    >
      <!-- ========== 三步进度指示器（全部完成） ========== -->
      <view class="steps-bar">
        <view class="step-item">
          <view class="step-circle step-circle--done">
            <text>1</text>
          </view>
          <text class="step-label step-label--done">详细信息</text>
        </view>

        <view class="step-line" />

        <view class="step-item">
          <view class="step-circle step-circle--done">
            <text>2</text>
          </view>
          <text class="step-label step-label--done">择偶要求</text>
        </view>

        <view class="step-line" />

        <view class="step-item">
          <view class="step-circle step-circle--active">
            <text>3</text>
          </view>
          <text class="step-label step-label--active">实名认证</text>
        </view>
      </view>

      <!-- ========== 认证优势图标区 ========== -->
      <view class="advantages-area">
        <view class="advantage-item">
          <view class="advantage-icon advantage-icon--blue">
            <text class="advantage-icon-text">✓</text>
          </view>
          <text class="advantage-label">上万认证</text>
        </view>
        <view class="advantage-item">
          <view class="advantage-icon advantage-icon--pink">
            <text class="advantage-icon-text">♥</text>
          </view>
          <text class="advantage-label">真实相亲</text>
        </view>
        <view class="advantage-item">
          <view class="advantage-icon advantage-icon--purple">
            <text class="advantage-icon-text">🔒</text>
          </view>
          <text class="advantage-label">隐私保障</text>
        </view>
        <view class="advantage-item">
          <view class="advantage-icon advantage-icon--green">
            <text class="advantage-icon-text">◉</text>
          </view>
          <text class="advantage-label">腾讯实名认证</text>
        </view>
      </view>

      <!-- ========== 表单输入区 ========== -->
      <view class="form-area">
        <!-- 真实姓名 -->
        <view class="form-item">
          <text class="form-label">真实姓名</text>
          <input
            class="form-input"
            v-model="realName"
            type="text"
            placeholder="请输入身份证上的姓名"
            placeholder-style="color:#CCCCCC;font-size:28rpx;"
          />
        </view>

        <!-- 身份证号 -->
        <view class="form-item form-item--id">
          <text class="form-label">身份证号</text>
          <input
            class="form-input"
            v-model="idCard"
            type="idcard"
            maxlength="18"
            placeholder="请输入身份证号"
            placeholder-style="color:#CCCCCC;font-size:28rpx;"
          />
        </view>
      </view>

      <!-- ========== 按钮区 ========== -->
      <view class="submit-btn-area">
        <view class="submit-btn" @tap="handleSubmit">
          <text>开始实名认证</text>
        </view>
      </view>

      <!-- 暂时跳过 -->
      <view class="skip-btn" @tap="handleSkip">
        <text>暂时跳过</text>
      </view>

      <!-- ========== 底部说明文字 ========== -->
      <view class="bottom-desc">
        <text class="desc-line">1、距离注册完成就差这最后一步，即将开启真实相亲交友！</text>
        <text class="desc-line">2、请放心，身份证信息仅用于验证，并经过严格保密，认证接口是腾讯实名认证平台！</text>
        <text class="desc-line">3、如遇到认证问题，请<text class="desc-link" @tap="handleContact">联系客服</text></text>
      </view>

      <!-- 底部安全区 -->
      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { post } from '@/utils/request'
import { useUserStore } from '@/store/user'
import { showToast } from '@/utils/common'
import { STORAGE_KEY } from '@/config/constants'

const userStore = useUserStore()

// ========== 导航相关 ==========
const statusBarHeight = ref(20)
const navTopPx = ref(64)

onMounted(() => {
  const sysInfo = uni.getWindowInfo()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  navTopPx.value = (sysInfo.statusBarHeight || 20) + 44
  // 自动填充已有实名信息
  if (userStore.userInfo?.isRealName && (userStore.userInfo as any).realName) {
    realName.value = (userStore.userInfo as any).realName || ''
    idCard.value = (userStore.userInfo as any).idCard || ''
  }
})

const handleBack = () => {
  uni.navigateBack()
}

// ========== 表单数据 ==========
const realName = ref('')
const idCard = ref('')

// ========== 身份证校验 ==========
const validateIdCard = (id: string): boolean => {
  // 18位格式
  if (!/^\d{17}[\dXx]$/.test(id)) return false

  // 校验码
  const weight = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checkMap = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += parseInt(id[i]) * weight[i]
  }
  const mod = sum % 11
  return checkMap[mod] === id[17].toUpperCase()
}

// ========== 提交 ==========
const handleSubmit = async () => {
  if (!realName.value.trim()) {
    showToast('请填写真实姓名')
    return
  }
  if (!idCard.value.trim()) {
    showToast('请填写身份证号')
    return
  }
  if (!validateIdCard(idCard.value)) {
    showToast('身份证号格式不正确')
    return
  }

  try {
    await post('/users/real-name-auth', {
      realName: realName.value.trim(),
      idCard: idCard.value.trim(),
    })

    // 更新 store
    ;(userStore.updateProfile as any)({ isRealName: true })

    showToast('认证成功', 'success')
    setTimeout(() => {
      finishFlow()
    }, 800)
  } catch (err: any) {
    console.error('[real-name-auth] 提交失败:', err?.message || err)
    showToast(err?.message || '提交失败，请稍后重试')
  }
}

const handleSkip = () => {
  finishFlow()
}

const handleContact = () => {
  // 联系客服：复用项目已有客服逻辑
  if (typeof (uni as any).openCustomerServiceChat === 'function') {
    ;(uni as any).openCustomerServiceChat({
      extInfo: { url: '' },
      corpId: '',
      success: () => {},
      fail: () => {},
    })
  } else {
    showToast('请联系客服')
  }
}

// ========== 流程终结 ==========
const finishFlow = () => {
  userStore.isProfileComplete = true
  uni.setStorageSync(STORAGE_KEY.PHONE_CREDENTIAL, '1')
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.real-name-auth-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

// ========== 导航栏 ==========
.nav-wrap {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 100; background: #ffffff;
}
.nav-bar {
  height: 88rpx; display: flex; align-items: center;
  justify-content: space-between; padding: 0 32rpx;
}
.nav-back { font-size: 36rpx; color: #333; width: 80rpx; }
.nav-title { font-size: 34rpx; font-weight: bold; color: #333; }
.nav-placeholder { width: 80rpx; }

.page-content { flex: 1; height: 100vh; box-sizing: border-box; }

// ========== 进度指示器 ==========
.steps-bar {
  display: flex; align-items: center; justify-content: center;
  background: #ffffff; padding: 32rpx 60rpx;
}
.step-item { display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.step-circle {
  width: 64rpx; height: 64rpx; border-radius: 50%;
  background: #E0E0E0;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 28rpx; color: #ffffff; font-weight: bold; }
}
.step-circle--active, .step-circle--done { background: #FF4D6A; }
.step-label { font-size: 28rpx; color: #999999; }
.step-label--active, .step-label--done { color: #FF4D6A; }
.step-line {
  flex: 1; height: 2rpx; margin: 0 12rpx; margin-bottom: 52rpx;
  border-top: 2rpx dashed #CCCCCC;
}

// ========== 认证优势图标区 ==========
.advantages-area {
  display: flex; justify-content: space-around;
  padding: 40rpx 16rpx 0;
}
.advantage-item { display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.advantage-icon {
  width: 96rpx; height: 96rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.advantage-icon--blue  { background: #E8F4FD; }
.advantage-icon--pink  { background: #FDE8EE; }
.advantage-icon--purple { background: #F0E8FD; }
.advantage-icon--green { background: #E8FDF0; }
.advantage-icon-text { font-size: 40rpx; }
.advantage-label { font-size: 24rpx; color: #666666; }

// ========== 表单输入区 ==========
.form-area { padding: 48rpx 32rpx 0; display: flex; flex-direction: column; gap: 20rpx; }
.form-item {
  background: #ffffff; border-radius: 16rpx; height: 100rpx;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28rpx; box-sizing: border-box;
}
.form-label { font-size: 30rpx; font-weight: bold; color: #333333; flex-shrink: 0; }
.form-input {
  flex: 1; text-align: right; font-size: 28rpx; color: #333333;
  height: 100%; background: transparent;
}

// ========== 按钮区 ==========
.submit-btn-area { padding: 48rpx 60rpx 0; }
.submit-btn {
  height: 96rpx; background: #FF4D6A; border-radius: 48rpx;
  display: flex; align-items: center; justify-content: center;
  text { font-size: 32rpx; font-weight: bold; color: #ffffff; }
  &:active { opacity: 0.85; }
}

// ========== 暂时跳过 ==========
.skip-btn {
  margin-top: 24rpx; text-align: center;
  text { font-size: 28rpx; color: #CCCCCC; text-decoration: underline; }
  &:active { text { color: #999999; } }
}

// ========== 底部说明 ==========
.bottom-desc {
  padding: 60rpx 32rpx 0;
  display: flex; flex-direction: column; gap: 12rpx;
}
.desc-line { font-size: 24rpx; color: #666666; line-height: 1.6; }
.desc-link { color: #FF4D6A; &:active { opacity: 0.7; } }

// 安全区
.safe-bottom {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  min-height: 40rpx;
}
</style>
