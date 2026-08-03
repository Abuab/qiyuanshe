import { ref } from 'vue'
import { get } from '@/utils/request'
import { getFullImageUrl } from '@/utils/common'

export interface MatchmakerItem {
  id: number
  name: string
  avatar: string
  title: string
  wechat: string
  phone?: string
  qrCode: string
  [key: string]: unknown
}

export function useMatchmakerList() {
  const matchmakerList = ref<MatchmakerItem[]>([])

  const fetchList = async () => {
    try {
      const res: Record<string, unknown> = await get('/matchmakers') as Record<string, unknown>
      const rawList: MatchmakerItem[] = Array.isArray(res)
        ? res as MatchmakerItem[]
        : ((res?.data || res?.list || (res?.data as Record<string, unknown>)?.list || []) as MatchmakerItem[])

      matchmakerList.value = rawList.map((item: MatchmakerItem) => ({
        ...item,
        qrCode: getFullImageUrl(
          (item.qrCode || item.qr_code || (item as unknown as { qrcode?: string }).qrcode || '') as string,
        ),
        avatar: getFullImageUrl((item.avatar || (item as unknown as { avatarUrl?: string }).avatarUrl || '') as string),
      }))
    } catch {
      matchmakerList.value = []
    }
  }

  return { matchmakerList, fetchList }
}
