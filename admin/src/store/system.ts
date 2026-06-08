import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSystemStore = defineStore('system', () => {
  const appName = ref<string>('栖缘社')

  const fetchSystemConfig = async () => {
    try {
      const response = await fetch('/api/system/config')
      const result = await response.json()
      const data = result.data || result
      if (data.appName) {
        appName.value = data.appName
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
