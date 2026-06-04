import { logger } from './logger'

export const setupGlobalErrorHandling = () => {
  // @ts-ignore
  if (uni.onUnhandledRejection) {
    uni.onUnhandledRejection((res: { reason?: unknown }) => {
      logger.error('未处理Promise:', res.reason)
    })
  }
  // @ts-ignore
  if (uni.onError) {
    uni.onError((err: string) => {
      logger.error('全局错误:', err)
    })
  }
}

export const showError = (msg: string) => {
  uni.showToast({ title: msg || '操作失败', icon: 'none', duration: 2000 })
}
