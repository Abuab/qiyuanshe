<template>
  <view class="agreement-page">
    <scroll-view class="content-scroll" scroll-y>
      <view class="content-inner">
        <view class="agreement-content">
        <text class="agreement-title">{{ title }}</text>

        <view v-if="type === 'vip'" class="agreement-body">
          <template v-if="vipContent">
            <rich-text class="vip-rich" :nodes="vipContent"></rich-text>
          </template>
          <template v-else>
            <text class="section-title">一、服务说明</text>
            <text class="section-text">{{ systemStore.appName }}会员服务是{{ systemStore.appName }}为注册用户提供的增值服务。开通会员后可享受会员专属权益，具体权益以页面展示为准。</text>

            <text class="section-title">二、会员套餐</text>
            <text class="section-text">1. 黄金会员：有效期1个月，价格¥99.00</text>
            <text class="section-text">2. 钻石会员：有效期3个月，价格¥249.00</text>
            <text class="section-text">3. 至尊VIP：有效期12个月，价格¥799.00</text>

            <text class="section-title">三、购买与支付</text>
            <text class="section-text">1. 会员服务通过微信支付完成购买，支付成功后立即生效。</text>
            <text class="section-text">2. 同一账号在同一会员有效期内重复购买，会员有效期将自动叠加。</text>
            <text class="section-text">3. 如因系统原因导致支付异常，请联系客服处理。</text>

            <text class="section-title">四、退款政策</text>
            <text class="section-text">1. 会员服务为虚拟商品，一经开通原则上不支持退款。</text>
            <text class="section-text">2. 如因平台原因导致无法正常使用会员服务，可联系客服协商处理。</text>

            <text class="section-title">五、免责条款</text>
            <text class="section-text">1. {{ systemStore.appName }}仅提供婚恋交友信息展示和匹配服务，不对用户之间的交往行为和结果承担责任。</text>
            <text class="section-text">2. 会员在使用过程中应遵守国家法律法规及平台规则。</text>
            <text class="section-text">3. 平台有权根据运营需要调整会员权益和价格，调整前已购买的会员不受影响。</text>

            <text class="section-title">六、其他</text>
            <text class="section-text">1. 本协议的解释、变更和执行均适用中华人民共和国法律。</text>
            <text class="section-text">2. 如本协议任何条款被认定无效，不影响其余条款的效力。</text>
          </template>
        </view>

        <view v-else-if="type === 'privacy'" class="agreement-body">
          <text class="section-title">隐私政策</text>
          <text class="section-text">{{ systemStore.appName }}尊重并保护所有用户的个人隐私。本隐私政策说明了我们在收集、使用和保护您个人信息方面的做法。</text>

          <text class="section-title">一、信息收集</text>
          <text class="section-text">1. 您在注册时提供的微信昵称、头像等基本信息。</text>
          <text class="section-text">2. 您主动填写的个人资料信息，如年龄、身高、学历、职业等。</text>
          <text class="section-text">3. 您在使用服务时产生的行为数据，如浏览、点赞、关注等。</text>

          <text class="section-title">二、信息使用</text>
          <text class="section-text">1. 用于匹配和推荐合适的交友对象。</text>
          <text class="section-text">2. 用于改进和优化我们的服务质量。</text>
          <text class="section-text">3. 未经您明确同意，我们不会向第三方提供您的个人信息。</text>

          <text class="section-title">三、信息安全</text>
          <text class="section-text">我们采取合理的技术手段和管理措施保护您的个人信息安全，防止信息泄露、损毁或丢失。</text>
        </view>

        <view v-else class="agreement-body">
          <text class="section-title">用户协议</text>
          <text class="section-text">欢迎使用{{ systemStore.appName }}。在使用本平台服务前，请您仔细阅读以下条款。</text>

          <text class="section-title">一、服务条款</text>
          <text class="section-text">{{ systemStore.appName }}是一个婚恋交友信息展示和匹配平台，仅为用户提供信息交流和匹配服务。</text>

          <text class="section-title">二、用户义务</text>
          <text class="section-text">1. 用户应提供真实、准确的个人信息。</text>
          <text class="section-text">2. 用户不得利用平台从事违法或不当行为。</text>
          <text class="section-text">3. 用户应尊重其他用户的合法权益。</text>
        </view>
        </view>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSystemStore } from '@/store/system'

const systemStore = useSystemStore()

const type = ref('user')
const title = ref('用户协议')

const vipContent = computed(() => {
  const raw = systemStore.vipAgreement
  if (!raw || !raw.trim()) return ''
  // 将换行分隔的文本转为 HTML 段落，支持后台配置
  const html = raw
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => `<p style="font-size:28rpx;color:#666;line-height:1.8;margin-bottom:8rpx;">${line.trim()}</p>`)
    .join('')
  return html
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  const t = options.type || 'user'
  type.value = t

  if (t === 'vip') {
    title.value = '会员服务协议'
  } else if (t === 'privacy') {
    title.value = '隐私政策'
  } else {
    title.value = '用户协议'
  }

  uni.setNavigationBarTitle({ title: title.value })
})
</script>

<style lang="scss" scoped>
.agreement-page {
  min-height: 100vh;
  background-color: #fff;
}

.content-scroll {
  height: 100vh;
}

.content-inner {
  padding: 32rpx;
}

.agreement-content {
  padding-bottom: 40rpx;
}

.agreement-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 40rpx;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-top: 32rpx;
  margin-bottom: 16rpx;
  word-break: break-all;
}

.section-text {
  display: block;
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  margin-bottom: 8rpx;
  word-break: break-all;
}

.vip-rich {
  width: 100%;
  word-break: break-all;
}

.bottom-safe {
  height: 60rpx;
}
</style>
