import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import App from './App.vue'
import './styles/index.scss'

const app = createApp(App)
const pinia = createPinia()

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 全局图片加载失败兜底（防止循环触发）
const fallbackAppliedKey = '__fallback_applied__'
const handleImageError = (e: Event) => {
  const target = e.target as HTMLImageElement & { [fallbackAppliedKey]?: boolean }
  if (target && target.tagName === 'IMG') {
    // 已经兜底过，不再处理，防止循环
    if (target[fallbackAppliedKey]) return
    // 已经是兜底图，不重复替换
    if (target.src.includes('default-avatar.svg')) return
    target[fallbackAppliedKey] = true
    target.src = '/default-avatar.svg'
  }
}
document.addEventListener('error', handleImageError, true)

app.mount('#app')
