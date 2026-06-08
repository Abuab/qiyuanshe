import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../api/request'

const STORAGE_KEY = 'admin_app_name'

export const useSystemStore = defineStore('system', () => {
  // 先从 localStorage 恢复，避免刷新后短暂空白
  const stored = localStorage.getItem(STORAGE_KEY)
  const appName = ref<string>(stored || '')

  const fetchSystemConfig = async () => {
    try {
      // _t 参数避免浏览器缓存返回 304
      const res: any = await request.get(`/system/config?_t=${Date.now()}`)
      const name = res?.appName || ''
      console.log('[systemStore] appName =', name)
      appName.value = name
      localStorage.setItem(STORAGE_KEY, name)
    } catch (e) {
      console.error('[systemStore] fetch failed:', e)
    }
  }

  return {
    appName,
    fetchSystemConfig,
  }
})
