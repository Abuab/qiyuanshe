<template>
  <view v-if="visible" class="privacy-modal-mask">
    <view class="privacy-modal-content">
      <!-- 标题 -->
      <view class="privacy-title">隐私政策与用户协议</view>

      <!-- 内容区 -->
      <scroll-view class="privacy-body" scroll-y>
        <text class="privacy-text">
          欢迎使用栖缘社！我们非常重视您的隐私和个人信息保护。在您使用本小程序前，请仔细阅读以下协议：\n\n
          \n\n
          \n\n
          \n\n
          \n\n
          一、我们收集的信息\n
          1. 基础信息：微信头像、昵称，用于展示您的个人资料。\n
          2. 实名信息：姓名、身份证号，用于实名认证，确保平台安全。\n
          3. 位置信息：城市定位，用于推荐附近的有缘人。\n
          4. 语音信息：语音介绍，需您主动录制，用于丰富个人展示。\n
          5. 照片信息：您上传的头像及相册照片，需经审核后公开展示。\n\n
          \n\n
          \n\n
          \n\n
          \n\n
          二、信息使用方式\n
          1. 匹配推荐：基于您的资料和偏好，推荐合适的交友对象。\n
          2. 安全审核：照片、语音等内容需经AI和人工审核，防止违规信息。\n
          3. 消息通知：发送匹配成功、互动提醒等通知。\n
          4. 产品优化：匿名统计数据用于改进服务质量。\n\n
          \n\n
          \n\n
          \n\n
          \n\n
          三、您的权利\n
          1. 您可随时在「设置-隐私设置」中管理您的信息。\n
          2. 您可删除已上传的照片和语音。\n
          3. 您可注销账号，我们将删除您的所有个人信息。\n
          4. 您有权拒绝非必要的权限请求。\n\n
          \n\n
          \n\n
          \n\n
          \n\n
          四、未成年人保护\n
          本平台仅面向18岁以上用户。我们不会主动收集未成年人的个人信息。\n\n
          \n\n
          \n\n
          \n\n
          \n\n
          五、免责声明\n
          1. 平台不保证匹配成功率，交友需双方自愿。\n
          2. 用户需自行甄别对方信息真实性，平台已尽力审核但仍存在风险。\n
          3. 涉及金钱往来的行为，请谨慎对待并举报可疑用户。\n\n
          \n\n
          \n\n
          \n\n
          \n\n
          六、联系我们\n
          如有任何疑问或投诉，请通过「设置-问题反馈」联系我们。\n\n
          \n\n
          点击「同意并继续」即表示您已阅读并同意以上协议内容。
        </text>
      </scroll-view>

      <!-- 按钮区 -->
      <view class="privacy-btns">
        <view class="btn-disagree" @tap="onDisagree">不同意</view>
        <view class="btn-agree" @tap="onAgree">同意并继续</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { secureStorage } from '@/utils/crypto'

const visible = ref(false)

function open() {
  visible.value = true
}

function close() {
  visible.value = false
}

function onDisagree() {
  uni.showToast({ title: '需要同意后才能使用', icon: 'none', duration: 2000 })
  setTimeout(() => {
    // #ifdef MP-WEIXIN
    uni.exitMiniProgram()
    // #endif
  }, 2000)
}

function onAgree() {
  secureStorage.setPrivacyAgreed()
  visible.value = false
}

function checkFirstLaunch() {
  if (!secureStorage.isPrivacyAgreed()) {
    visible.value = true
  }
}

defineExpose({ open, close, checkFirstLaunch })
</script>

<style lang="scss" scoped>
.privacy-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.privacy-modal-content {
  width: 640rpx;
  max-height: 800rpx;
  border-radius: 24rpx;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.privacy-title {
  padding: 32rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  flex-shrink: 0;
}

.privacy-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 32rpx;
}

.privacy-text {
  font-size: 26rpx;
  color: #666666;
  line-height: 1.8;
  white-space: pre-wrap;
}

.privacy-btns {
  padding: 32rpx;
  border-top: 1rpx solid #eeeeee;
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
}

.btn-disagree {
  width: 240rpx;
  height: 72rpx;
  border-radius: 36rpx;
  background: #f5f5f5;
  text-align: center;
  line-height: 72rpx;
  font-size: 28rpx;
  color: #999999;
}

.btn-agree {
  width: 240rpx;
  height: 72rpx;
  border-radius: 36rpx;
  background: #ff6b6b;
  text-align: center;
  line-height: 72rpx;
  font-size: 28rpx;
  color: #ffffff;
}
</style>
