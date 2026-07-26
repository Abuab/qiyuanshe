<template>
  <view class="real-name-auth-page">
    <!-- 内容区 -->
    <scroll-view class="page-content" scroll-y>
      <!-- ========== 三步进度指示器（全部完成：第1、2步 done，第3步 active） ========== -->
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
            <text class="advantage-icon-text">&#10003;</text>
          </view>
          <text class="advantage-label">上万认证</text>
        </view>
        <view class="advantage-item">
          <view class="advantage-icon advantage-icon--pink">
            <text class="advantage-icon-text">&#9829;</text>
          </view>
          <text class="advantage-label">真实相亲</text>
        </view>
        <view class="advantage-item">
          <view class="advantage-icon advantage-icon--purple">
            <text class="advantage-icon-text">&#128274;</text>
          </view>
          <text class="advantage-label">隐私保障</text>
        </view>
        <view class="advantage-item">
          <view class="advantage-icon advantage-icon--green">
            <text class="advantage-icon-text">&#9673;</text>
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
        <view class="form-item">
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

    <!-- ========== 红娘联系弹窗 ========== -->
    <matchmaker-popup
      :show="showMatchmaker"
      :matchmaker="matchmakerData || {}"
      @close="showMatchmaker = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { post, get, put } from '@/utils/request'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { showToast, getFullImageUrl } from '@/utils/common'
import { STORAGE_KEY } from '@/config/constants'
import { startEid } from '@/subpkg-pages/mp_ecard_sdk/main'
import MatchmakerPopup from '@/components/matchmaker-popup/matchmaker-popup.vue'

const userStore = useUserStore()
const systemStore = useSystemStore()
const appName = computed(() => systemStore.appName || '灵通相亲')

// ========== 设置原生导航栏标题 ==========
onMounted(() => {
  uni.setNavigationBarTitle({ title: appName.value })
})

// 从 E证通返回时检测认证结果
onShow(() => {
  if (pendingVerify.value) {
    pendingVerify.value = false
    setTimeout(() => refreshCertResult(), 600)
  }
  // 若已完成实名认证，自动结束流程
  if ((userStore.userInfo?.isRealName as any) === true || (userStore.userInfo as any)?.isRealName === 1) {
    finishFlow()
  }
})

// ========== 表单数据 ==========
const realName = ref('')
const idCard = ref('')
const submitting = ref(false)
const pendingVerify = ref(false)

// ========== E证通结果轮询 ==========
const refreshCertResult = async () => {
  try {
    const res: any = await get('/eid-auth/result')
    const d = res?.data || res
    if (d && d.isRealName === true) {
      userStore.updateProfile({ isRealName: true, eidCertStatus: 2 } as any)
      showToast('认证成功', 'success')
      setTimeout(() => finishFlow(), 800)
    } else if (d && d.status === 'pending') {
      // 仍在认证中，允许用户再次发起
      showToast('认证仍在处理中，请稍后再试')
      pendingVerify.value = false
    }
  } catch (e: any) {
    console.error('[real-name-auth] 查询认证结果失败:', e?.message || e)
    pendingVerify.value = false
  }
}

// ========== 身份证校验 ==========
const validateIdCard = (id: string): boolean => {
  if (!/^\d{17}[\dXx]$/.test(id)) return false
  const weight = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checkMap = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += parseInt(id[i]) * weight[i]
  }
  return checkMap[sum % 11] === id[17].toUpperCase()
}

// ========== 提交 - 调用腾讯云 E证通 SDK 进行人脸核身 ==========
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
  if (submitting.value) return
  submitting.value = true

  // 去重检查
  try {
    const dupCheck: any = await post('/eid-auth/check-duplicate', {
      idCard: idCard.value.trim(),
      realName: realName.value.trim(),
    })
    const dupData = dupCheck?.data || dupCheck
    if (dupData && !dupData.canProceed) {
      submitting.value = false
      if (dupData.reason === 'requires_reauth') {
        const res = await new Promise<boolean>((resolve) => {
          uni.showModal({
            title: '二次认证',
            content: dupData.message || '检测到您之前已完成实名认证，重新验证需支付 1 元',
            cancelText: '取消',
            confirmText: '去支付',
            success: (r) => resolve(r.confirm),
          })
        })
        if (!res) return
        try {
          submitting.value = true
          uni.showLoading({ title: '验证中...', mask: true })
          const reVerifyRes: any = await put('/eid-auth/re-verify', { idCard: idCard.value.trim() })
          const rvData = reVerifyRes?.data || reVerifyRes
          uni.hideLoading()
          if (rvData && (rvData.code === 0 || rvData.status === 'success')) {
            userStore.updateProfile({ isRealName: true, eidCertStatus: 2 } as any)
            showToast('认证成功', 'success')
            setTimeout(() => finishFlow(), 800)
          } else {
            uni.showModal({
              title: '提示',
              content: rvData?.message || rvData?.msg || '二次认证失败，请稍后重试',
              showCancel: false,
            })
          }
        } catch (e2: any) {
          uni.hideLoading()
          uni.showModal({
            title: '提示',
            content: e2?.message || '二次认证失败，请稍后重试',
            showCancel: false,
          })
        } finally {
          submitting.value = false
        }
        return
      }
      uni.showModal({
        title: '提示',
        content: dupData.message || '该身份证已绑定其他账号，如有疑问请联系客服',
        showCancel: false,
      })
      return
    }
  } catch (e: any) {
    submitting.value = false
    uni.showModal({
      title: '提示',
      content: e?.message || '身份校验异常，请稍后重试',
      showCancel: false,
    })
    return
  }

  uni.showLoading({ title: '发起认证...', mask: true })
  try {
    const res: any = await post('/eid-auth/create-order')
    const d = res?.data || res
    const token = d && d.eidToken
    uni.hideLoading()
    if (!token) {
      showToast('发起认证失败，请稍后重试')
      return
    }
    pendingVerify.value = true
    // 调起腾讯云 E证通 SDK，SDK 内部跳转 eID 数字身份小程序完成人脸核身
    startEid({
      data: { token },
      verifyDoneCallback: () => {
        refreshCertResult()
      },
    })
  } catch (e: any) {
    uni.hideLoading()
    showToast(e?.message || '网络异常，请稍后重试')
  } finally {
    submitting.value = false
  }
}

const handleSkip = () => {
  finishFlow()
}

// ========== 联系客服 - 红娘弹窗 ==========
const showMatchmaker = ref(false)
const matchmakerData = ref<any>(null)

const handleContact = async () => {
  try {
    if (!matchmakerData.value) {
      const res: any = await get('/matchmakers')
      const rawList = Array.isArray(res) ? res : (res?.data || res?.list || [])
      if (rawList.length > 0) {
        matchmakerData.value = {
          ...rawList[0],
          qrCode: getFullImageUrl(rawList[0].qrCode || rawList[0].qr_code || rawList[0].qrcode),
          avatar: getFullImageUrl(rawList[0].avatar),
        }
      }
    }
  } catch {
    // 获取失败仍显示弹窗
  }
  showMatchmaker.value = true
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

.page-content {
  flex: 1;
  height: 100vh;
  box-sizing: border-box;
}

// ========== 进度指示器 ==========
.steps-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 32rpx 60rpx;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.step-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #E0E0E0;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 28rpx;
    color: #ffffff;
    font-weight: bold;
  }
}

.step-circle--active,
.step-circle--done {
  background: #FF4D6A;
}

.step-label {
  font-size: 28rpx;
  color: #999999;
}

.step-label--active,
.step-label--done {
  color: #FF4D6A;
}

.step-line {
  flex: 1;
  height: 2rpx;
  margin: 0 12rpx;
  margin-bottom: 52rpx;
  border-top: 2rpx dashed #CCCCCC;
}

// ========== 认证优势图标区 ==========
.advantages-area {
  display: flex;
  justify-content: space-around;
  padding: 40rpx 16rpx 0;
}

.advantage-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.advantage-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.advantage-icon--blue {
  background: #E8F4FD;
}

.advantage-icon--pink {
  background: #FDE8EE;
}

.advantage-icon--purple {
  background: #F0E8FD;
}

.advantage-icon--green {
  background: #E8FDF0;
}

.advantage-icon-text {
  font-size: 40rpx;
}

.advantage-label {
  font-size: 24rpx;
  color: #666666;
}

// ========== 表单输入区 ==========
.form-area {
  padding: 48rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.form-item {
  background: #ffffff;
  border-radius: 16rpx;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28rpx;
  box-sizing: border-box;
}

.form-label {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: #333333;
  height: 100%;
  background: transparent;
}

// ========== 按钮区 ==========
.submit-btn-area {
  padding: 48rpx 60rpx 0;
}

.submit-btn {
  height: 96rpx;
  background: #FF4D6A;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 32rpx;
    font-weight: bold;
    color: #ffffff;
  }

  &:active {
    opacity: 0.85;
  }
}

// ========== 暂时跳过 ==========
.skip-btn {
  margin-top: 24rpx;
  text-align: center;

  text {
    font-size: 28rpx;
    color: #CCCCCC;
    text-decoration: underline;
  }

  &:active {
    text {
      color: #999999;
    }
  }
}

// ========== 底部说明 ==========
.bottom-desc {
  padding: 60rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.desc-line {
  font-size: 24rpx;
  color: #666666;
  line-height: 1.6;
}

.desc-link {
  color: #FF4D6A;

  &:active {
    opacity: 0.7;
  }
}

// 安全区
.safe-bottom {
  height: calc(40rpx + constant(safe-area-inset-bottom));
  height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
