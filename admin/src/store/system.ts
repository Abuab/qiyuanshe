import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../api/request'

export const useSystemStore = defineStore('system', () => {
  const appName = ref<string>('')

  const fetchSystemConfig = async () => {
    try {
      const res: any = await request.get('/system/config')
      console.log('[SystemStore] fetchSystemConfig response:', res)
      // 无论 appName 是什么值都更新，包括空字符串
      if (res && 'appName' in res) {
        appName.value = res.appName || ''
        console.log('[SystemStore] appName updated to:', appName.value)
      }
    } catch (e) {
      console.error('[SystemStore] Failed to load system config:', e)
    }
  }

  return {
    appName,
    fetchSystemConfig,
  }
})
