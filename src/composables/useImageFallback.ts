import { icons } from '@/config/icons'

/**
 * Image error fallback composable.
 * Usage: <image :src="url" @error="handleImageError" />
 * On load failure, swaps src to default-avatar.png.
 */
export function useImageFallback() {
  const handleImageError = (e: any) => {
    const detail = e?.detail || e
    if (detail?.target) {
      detail.target.src = icons.common.defaultAvatar
    }
  }

  return { handleImageError, defaultAvatar: icons.common.defaultAvatar }
}
