<script setup lang="ts">
import { onLaunch, onShow, onHide, onError, onUnhandledRejection } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useSystemStore } from '@/store/system'
import { logger } from '@/utils/logger'

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
})

onShow(() => {
  logger.info('App Show')

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
