<template>
  <view class="agreement-page">
    <scroll-view class="content-scroll" scroll-y>
      <view class="content-inner">
        <view class="agreement-content">
        <text class="agreement-title">{{ pageTitle }}</text>

        <view class="agreement-body">
          <rich-text v-if="htmlContent" class="vip-rich" :nodes="htmlContent"></rich-text>
          <view v-else-if="loading" class="loading-wrap"><text>加载中...</text></view>
          <view v-else>
            <text class="section-text">暂无内容</text>
          </view>
        </view>
        </view>
      </view>

      <view class="bottom-safe"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'
import { useSystemStore } from '@/store/system'

const type = ref('user')
const pageTitle = ref('用户协议')
const htmlContent = ref('')
const loading = ref(true)

const systemStore = useSystemStore()

const typeMap: Record<string, string> = {
  user: 'USER_AGREEMENT',
  privacy: 'PRIVACY_POLICY',
  vip: 'VIP_AGREEMENT',
  selfDiscipline: 'SELF_DISCIPLINE_STATEMENT',
  antiFraud: 'ANTI_FRAUD',
}

const titleMap: Record<string, string> = {
  user: '用户协议',
  privacy: '隐私政策',
  vip: '会员服务协议',
  selfDiscipline: '平台自律声明',
  antiFraud: '防骗提醒',
}

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}
  const t = options.type || 'user'
  type.value = t

  // 用户协议和防骗提醒页面顶部标题栏显示小程序名称
  const navTitle = (t === 'antiFraud' || t === 'user') ? (systemStore.appName || titleMap[t]) : titleMap[t]
  pageTitle.value = titleMap[t] || '用户协议'
  uni.setNavigationBarTitle({ title: navTitle })

  try {
    const res: any = await get(`/agreement?type=${typeMap[t]}`)
    htmlContent.value = res?.content || ''
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
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
