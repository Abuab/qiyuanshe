import { icons } from '@/config/icons'
import { useSystemStore } from '@/store/system'

/**
 * Image error fallback composable.
 * Usage: <image :src="url" @error="handleImageError" />
 * On load failure, swaps src to default avatar from SystemConfig (fallback to built-in).
 */
export function useImageFallback() {
  const handleImageError = (e: any) => {
    const detail = e?.detail || e
    if (detail?.target) {
      const store = useSystemStore()
      detail.target.src = store.defaultAvatar || icons.common.defaultAvatar
    }
  }

  return { handleImageError, defaultAvatar: icons.common.defaultAvatar }
}
