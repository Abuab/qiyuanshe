<template>
  <MatchModal />
</template>

<script setup lang="ts">
import { onLaunch, onShow, onHide, onError, onUnhandledRejection } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { logger } from '@/utils/logger'
import { get } from '@/utils/request'
import MatchModal from '@/components/MatchModal/MatchModal.vue'
// @ts-ignore 腾讯云 E证通 SDK 无类型声明
import { initEid } from '@/mp_ecard_sdk/main'

// eID 数字身份小程序 appId（用于识别从 E证通返回的场景）
const EID_APPID = 'wx0e2cb0b052a91c92'

// 冷启动时 onLaunch 后立刻触发 onShow，防止重复请求
let launched = false

onLaunch(() => {
  logger.info('App Launch')
  const userStore = useUserStore()
  userStore.checkVip()

  // 初始化腾讯云 E证通 SDK（startEid 调用前必须先初始化）
  try {
    initEid()
  } catch (e) {
    logger.error('initEid failed:', e as any)
  }

  // 加载系统配置（应用名称等）
  const systemStore = useSystemStore()
  systemStore.loadSystemConfig().then(() => {
    logger.setTag(systemStore.appName)
  })

  // 全局开启分享菜单（兜底），失败静默
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage'],
    fail: () => {
      // 开发工具可能 ban，真机正常
      console.log('[分享]showShareMenu 开发工具跳过')
    },
  })

  launched = true
})

onShow((options: any) => {
  logger.info('App Show')

  // 从 eID 数字身份小程序返回（scene 1038）时，交由 SDK 处理，跳过应用自身逻辑，避免冲突
  const referrerAppId = options?.referrerInfo?.appId
  if (options?.scene === 1038 && referrerAppId === EID_APPID) {
    return
  }

  // 每次切回前台时重新拉取系统配置（项目名称等可能在后台被修改）
  // 冷启动时 onLaunch 已加载过，跳过本次避免重复请求造成超时
  const systemStore = useSystemStore()
  if (launched) {
    systemStore.loadSystemConfig().then(() => {
      logger.setTag(systemStore.appName)
    })
  }

  // 每次切回前台时同步 VIP 状态（管理后台可能取消/修改了会员）
  const userStore = useUserStore()
  if (userStore.isLoggedIn) {
    get('/auth/profile').then((res: any) => {
      if (res?.data) {
        const p = res.data
        userStore.updateUserInfo({
          isVip: p.isVip,
          vipExpireTime: p.vipExpireTime,
          vipLevel: p.vipLevel,
          vipPackageName: p.vipPackageName,
        })
      }
    }).catch(() => { /* 静默失败 */ })
  }

  // 每次切回应用时重试开启分享菜单
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage'],
    fail: () => {
      // ignore
    },
  })
})

onHide(() => {
  logger.info('App Hide')
})

onError((err: string) => {
  logger.error('App onError:', err)
})

onUnhandledRejection((res: { reason: string }) => {
  logger.error('App onUnhandledRejection:', res?.reason || res)
})
</script>

<style lang="scss">
@import './styles/variables.scss';

page {
  height: 100%;
  background-color: var(--bg);
  font-size: 14px;
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

view {
  box-sizing: border-box;
}

.container {
  min-height: 100vh;
  padding: 24rpx;
}

.btn-primary {
  background-color: var(--primary);
  color: #fff;
  border-radius: 44rpx;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;

  &:active {
    background-color: var(--primary-light);
  }
}

.btn-default {
  background-color: #fff;
  color: var(--text);
  border: 2rpx solid #eee;
  border-radius: 44rpx;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
}

.card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.text-primary {
  color: var(--primary);
}

.text-secondary {
  color: var(--text-secondary);
}

.text-success {
  color: var(--success);
}

.text-warning {
  color: var(--warning);
}

.text-danger {
  color: var(--danger);
}
</style>
