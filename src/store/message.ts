import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '@/utils/request'

/**
 * 消息未读数 store：作为底部 TabBar 消息角标的单一数据源。
 * 由消息列表拉取、系统消息已读等场景共同维护，
 * 保证角标能即时响应（不再依赖 storage 的延迟读取）。
 */
export const useMessageStore = defineStore('message', () => {
  const initialCount = Number(uni.getStorageSync('unreadMessageCount')) || 0
  const unreadCount = ref<number>(initialCount)

  const setUnreadCount = (count: number) => {
    unreadCount.value = count
    uni.setStorageSync('unreadMessageCount', count)
  }

  const refreshUnread = async () => {
    try {
      const notifyRes = await request({ url: '/notifications', method: 'GET', data: { page: 1, limit: 1 } }).catch(() => ({ data: { list: [], unreadCount: 0 } }))
      const notifyData = (notifyRes as any)?.data || (notifyRes as any) || {}
      const notifyUnread = notifyData.unreadCount || 0
      setUnreadCount(notifyUnread)
    } catch {
      // 拉取失败时保持当前值，避免角标闪烁
    }
  }

  return { unreadCount, setUnreadCount, refreshUnread }
})
