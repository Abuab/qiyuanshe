import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../api/request'

const STORAGE_KEY = 'admin_app_name'

export const useSystemStore = defineStore('system', () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const appName = ref<string>(stored || '')

  const fetchSystemConfig = async () => {
    // 已有缓存就不再请求，避免 API 返回旧数据覆盖正确值
    if (appName.value) return

    try {
      const res: any = await request.get(`/system/config?_t=${Date.now()}`)
      const name = res?.appName || ''
      if (name) {
        appName.value = name
        localStorage.setItem(STORAGE_KEY, name)
      }
    } catch (e) {
      console.error('[systemStore] fetch failed:', e)
    }
  }

  // 供 config.vue 保存后调用，同步写入 localStorage
  const setAppName = (name: string) => {
    appName.value = name
    localStorage.setItem(STORAGE_KEY, name)
  }

  return {
    appName,
    fetchSystemConfig,
    setAppName,
  }
})
