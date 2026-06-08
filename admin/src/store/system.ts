import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSystemStore = defineStore('system', () => {
  const appName = ref<string>('栖缘社')
  const loaded = ref(false)

  const fetchSystemConfig = async () => {
    if (loaded.value) return
    try {
      const response = await fetch('/api/system/config')
      const result = await response.json()
      const data = result.data || result
      if (data.appName) {
        appName.value = data.appName
      }
    } catch (e) {
      console.error('Failed to load system config:', e)
    } finally {
      loaded.value = true
    }
  }

  return {
    appName,
    loaded,
    fetchSystemConfig,
  }
})
