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

// eID 数字身份小程序 appId（用于识别从 E证通返回的场景）
const EID_APPID = 'wx0e2cb0b052a91c92'

// 冷启动时 onLaunch 后立刻触发 onShow，首次 show 跳过重复加载
let isFirstShow = true

onLaunch(() => {
  logger.info('App Launch')
  const userStore = useUserStore()
  userStore.checkVip()

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

  // 全局页面导航拦截：锁定用户（status=4）只允许留在首页，禁止进入其他页面
  const NAV_BLACKLIST = ['/pages/index/index', '/pages/splash/index']
  const blockNav = (url: string): boolean => {
    if (useUserStore().userInfo?.status === 4 && !NAV_BLACKLIST.includes(url.split('?')[0])) {
      uni.showToast({ title: '账号已锁定，请先确认脱单意向', icon: 'none', duration: 2000 })
      return false
    }
    return true
  }
  uni.addInterceptor('navigateTo', { invoke(args: any) { return blockNav(args.url) } })
  uni.addInterceptor('redirectTo', { invoke(args: any) { return blockNav(args.url) } })
  uni.addInterceptor('reLaunch', { invoke(args: any) { return blockNav(args.url) } })

  // 延迟动态导入 E证通 SDK，避免启动时同步 require 阻塞冷启动
  setTimeout(async () => {
    try {
      const { initEid } = await import('@/subpkg-pages/mp_ecard_sdk/main')
      initEid()
    } catch (e) {
      logger.error('initEid failed:', e as any)
    }
  }, 2000)
})

onShow((options: any) => {
  logger.info('App Show')

  // 从 eID 数字身份小程序返回（scene 1038）时，交由 SDK 处理，跳过应用自身逻辑，避免冲突
  const referrerAppId = options?.referrerInfo?.appId
  if (options?.scene === 1038 && referrerAppId === EID_APPID) {
    return
  }

  // 冷启动首次 onShow：onLaunch 中已加载配置，首页 refreshProfile 已处理用户信息，跳过重复加载
  // 热启动（切回前台）时重新拉取
  if (isFirstShow) {
    isFirstShow = false
    // 但用户资料仍需同步（首页 onShow 的 refreshProfile 可能未完成，且 onFirstShow 时 updateUserInfo
    // 可保证 status 等字段及时反映后台变更，避免首页 popup 判定滞后）
    const userStore = useUserStore()
    if (userStore.isLoggedIn) {
      get('/auth/profile').then((res: any) => {
        if (res?.data) {
          const p = res.data
          userStore.updateUserInfo({
            isVip: p.isVip,
            vipExpireTime: p.vipExpireTime,
            vipLevel: p.vipLevel,
          })
        }
      }).catch(() => { /* 静默失败 */ })
    }
    return
  }

  // 每次切回前台时重新拉取系统配置（项目名称等可能在后台被修改）
  const systemStore = useSystemStore()
  systemStore.loadSystemConfig().then(() => {
    logger.setTag(systemStore.appName)
  })

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
