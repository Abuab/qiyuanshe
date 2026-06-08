import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../api/request'

export const useSystemStore = defineStore('system', () => {
  const appName = ref<string>('')

  const fetchSystemConfig = async () => {
    try {
      const res: any = await request.get('/system/config')
      const name = res?.appName || ''
      console.log('[systemStore] appName =', name)
      appName.value = name
    } catch (e) {
      console.error('[systemStore] fetch failed:', e)
    }
  }

  return {
    appName,
    fetchSystemConfig,
  }
})
