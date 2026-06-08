import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../api/request'

export const useSystemStore = defineStore('system', () => {
  const appName = ref<string>('')

  const fetchSystemConfig = async () => {
    try {
      const res: any = await request.get('/system/config')
      if (res?.appName) {
        appName.value = res.appName
      }
    } catch (e) {
      console.error('Failed to load system config:', e)
    }
  }

  return {
    appName,
    fetchSystemConfig,
  }
})
