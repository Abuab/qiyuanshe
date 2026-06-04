import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { icons } from './config/icons'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()

  app.use(pinia)

  // 全局挂载图标配置
  app.config.globalProperties.$icons = icons

  app.config.errorHandler = (err, instance, info) => {
    console.error('Global Error:', err)
    console.error('Error Info:', info)
    uni.showToast({
      title: '应用程序出现错误',
      icon: 'none',
      duration: 2000
    })
  }

  app.config.warnHandler = (msg, instance, trace) => {
    console.warn('Vue Warning:', msg)
    console.warn('Trace:', trace)
  }

  return {
    app
  }
}
