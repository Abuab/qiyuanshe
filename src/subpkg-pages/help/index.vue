<template>
  <view class="page">
    <view class="nav-wrap" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left" @tap="handleBack"><text class="back-icon iconfont icon-back"></text></view>
        <text class="nav-title">帮助与反馈</text>
        <view class="nav-right"></view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :style="{ paddingTop: (statusBarHeight + navBarHeightPx) + 'px' }">
      <view class="faq-list">
        <view v-for="(faq, idx) in faqs" :key="idx" class="faq-item">
          <view class="faq-q" @tap="toggleFaq(idx)">
            <text class="faq-q-text">{{ faq.q }}</text>
            <text class="faq-arrow">{{ faq.open ? '▼' : '▶' }}</text>
          </view>
          <text v-if="faq.open" class="faq-a">{{ faq.a }}</text>
        </view>
      </view>
      <view class="contact">
        <text class="contact-title">没找到答案？联系客服</text>
        <!-- #ifdef MP-WEIXIN -->
        <button class="contact-btn" open-type="contact">联系客服</button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="contact-btn" @tap="handleContactCustomer">联系客服</button>
        <!-- #endif -->
      </view>

      <view class="deactivate-section">
        <view class="deactivate-btn" @tap="showDeactivateConfirm">
          <text>注销账户</text>
        </view>
        <text class="deactivate-hint">注销后所有数据将被清除，请谨慎操作</text>
      </view>
      <view class="bottom-safe"></view>
    </scroll-view>

    <!-- ========== H5 客服二维码弹窗 ========== -->
    <!-- #ifndef MP-WEIXIN -->
    <view v-if="showServicePopup" class="service-popup">
      <view class="service-overlay" @tap="closeServicePopup"></view>
      <view class="service-body">
        <view class="service-card">
          <view class="service-qrcode-wrap">
            <image class="service-qrcode" src="/static/images/service-qrcode.png" mode="aspectFit" />
          </view>
          <view class="service-title">添加客服微信获取帮助</view>
          <view class="service-desc">
            <text>遇到问题可添加客服微信</text>
            <text>请长按或截图识别二维码，客服将为您解答</text>
          </view>
          <view class="service-time">工作时间：9:00-21:00</view>
        </view>
        <view class="service-close-btn" @tap="closeServicePopup">
          <text class="service-close-x">✕</text>
        </view>
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { post } from '@/utils/request'
import { useUserStore } from '@/store/user'
import { safeNavigateBack } from '@/utils/navigate'
import { useStatusBarHeight } from '@/subpkg-pages/composables/useStatusBarHeight'

const statusBarHeight = useStatusBarHeight()
const navBarHeightPx = ref(44)
const userStore = useUserStore()

const faqs = ref([
  { q: '如何注册账号？', a: '使用微信授权登录即可自动注册账号。', open: false },
  { q: '如何修改个人资料？', a: '进入"我的"页面，点击"编辑资料"即可修改。', open: false },
  { q: '会员有什么特权？', a: '会员可享受无限畅聊、优先推荐、查看访客等特权。', open: false },
  { q: '如何注销账号？', a: '联系客服或发送邮件至 support@qiyuanshe.com 申请注销。', open: false },
  { q: '如何保障隐私安全？', a: '我们严格保护您的个人信息，详见隐私政策。', open: false },
])

onMounted(() => {
  const sysInfo = uni.getWindowInfo()
  navBarHeightPx.value = Math.round(88 * (sysInfo.windowWidth || 375) / 750)
})

function toggleFaq(idx: number) { faqs.value[idx].open = !faqs.value[idx].open }
function handleBack() { safeNavigateBack() }

// ===== H5 客服二维码弹窗 =====
const showServicePopup = ref(false)
function handleContactCustomer() { showServicePopup.value = true }
function closeServicePopup() { showServicePopup.value = false }

async function showDeactivateConfirm() {
  const res: any = await new Promise((resolve) => {
    uni.showModal({
      title: '注销账户',
      content: '确定要注销账户吗？注销后您的个人资料将不可见，此操作不可撤销。',
      confirmText: '确定注销',
      confirmColor: '#E7412B',
      success: (r) => resolve(r),
    })
  })
  if (res.confirm) {
    try {
      await post('/users/cancel')
      uni.showToast({ title: '账户已注销', icon: 'none' })
      userStore.logout()
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/index/index' })
      }, 1500)
    } catch (e) {
      uni.showToast({ title: '注销失败，请重试', icon: 'none' })
    }
  }
}
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.nav-bar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.nav-left, .nav-right { width: 100rpx; }
.back-icon { font-size: 40rpx; color: #333; }
.nav-title { font-size: 32rpx; font-weight: bold; color: #333; }
.content { height: 100vh; padding: 32rpx; box-sizing: border-box; }
.faq-list { background: #fff; border-radius: 16rpx; padding: 0 24rpx; margin-bottom: 24rpx; }
.faq-item { border-bottom: 1rpx solid #f0f0f0; &:last-child { border-bottom: none; } }
.faq-q { display: flex; justify-content: space-between; align-items: center; padding: 28rpx 0; }
.faq-q-text { font-size: 28rpx; color: #333; flex: 1; }
.faq-arrow { font-size: 22rpx; color: #999; }
.faq-a { display: block; font-size: 26rpx; color: #666; padding: 0 0 24rpx; line-height: 1.6; }
.contact { background: #fff; border-radius: 16rpx; padding: 40rpx; text-align: center; }
.contact-title { display: block; font-size: 28rpx; color: #333; margin-bottom: 24rpx; }
.contact-btn { background: #07c160; color: #fff; border-radius: 40rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; width: 300rpx; }

.deactivate-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
  text-align: center;
  margin-top: 24rpx;
}

.deactivate-btn {
  display: inline-block;
  padding: 16rpx 64rpx;
  border: 1rpx solid #E7412B;
  border-radius: 40rpx;
  font-size: 28rpx;
  color: #E7412B;
}

.deactivate-hint {
  display: block;
  font-size: 24rpx;
  color: #ccc;
  margin-top: 16rpx;
}

.bottom-safe { height: 60rpx; }

// ===== H5 客服二维码弹窗 =====
.service-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.service-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
}

.service-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.service-card {
  position: relative;
  width: 620rpx;
  border-radius: 32rpx;
  background: linear-gradient(180deg, #FFE8EC 0%, #FFD5D5 100%);
  padding: 60rpx 40rpx 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.service-qrcode-wrap {
  width: 360rpx;
  height: 360rpx;
  background: #FFFFFF;
  border-radius: 8rpx;
  margin: 0 auto;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.service-qrcode {
  width: 320rpx;
  height: 320rpx;
}

.service-title {
  text-align: center;
  margin-top: 32rpx;
  color: #FF6B6B;
  font-size: 30rpx;
  font-weight: 700;
}

.service-desc {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  margin-top: 20rpx;

  text {
    font-size: 24rpx;
    color: #B0748A;
    line-height: 1.5;
    text-align: center;
  }
}

.service-time {
  margin-top: 20rpx;
  text-align: center;
  font-size: 24rpx;
  color: #999;
}

.service-close-btn {
  margin-top: 40rpx;
  width: 64rpx;
  height: 64rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-close-x {
  color: #FFFFFF;
  font-size: 32rpx;
  line-height: 1;
}
</style>
