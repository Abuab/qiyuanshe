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

// 全局图片加载失败兜底
const handleImageError = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (target && target.tagName === 'IMG') {
    if (target.src.includes('default-avatar.svg')) return
    target.src = '/default-avatar.svg'
  }
}
document.addEventListener('error', handleImageError, true)

app.mount('#app')
