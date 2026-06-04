import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { icons } from './config/icons'
import '@/utils/logger'
import { logger } from '@/utils/logger'
import { secureStorage } from './utils/crypto'
import { setupGlobalErrorHandling } from './utils/error-handler'

// 旧版明文 Token 一次性迁移到加密存储
const oldToken = uni.getStorageSync('token')
const oldUserInfo = uni.getStorageSync('userInfo')
if (oldToken && !secureStorage.getToken()) {
  secureStorage.setToken(oldToken)
  uni.removeStorageSync('token')
}
if (oldUserInfo && !secureStorage.getUserInfo()) {
  try {
    secureStorage.setUserInfo(JSON.parse(oldUserInfo))
    uni.removeStorageSync('userInfo')
  } catch { /* ignore parse error */ }
}

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()

  app.use(pinia)

  // 全局挂载图标配置
  app.config.globalProperties.$icons = icons

  // 全局错误处理
  setupGlobalErrorHandling()

  app.config.errorHandler = (err, instance, info) => {
    logger.error('Global Error:', err)
    logger.error('Error Info:', info)
    uni.showToast({
      title: '应用程序出现错误',
      icon: 'none',
      duration: 2000
    })
  }

  app.config.warnHandler = (msg, instance, trace) => {
    logger.warn('Vue Warning:', msg)
    logger.warn('Trace:', trace)
  }

  return {
    app
  }
}
