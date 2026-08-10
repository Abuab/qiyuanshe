import { ref } from 'vue'

export function useBackTop(threshold = 600) {
  const showBackTop = ref(false)
  const scrollToVal = ref(0)

  const onScroll = (e: { detail: { scrollTop: number } }) => {
    showBackTop.value = e.detail.scrollTop > threshold
  }

  const scrollToTop = () => {
    // 通过 toggle scrollToVal 触发 scroll-view 的 :scroll-top 滚动到顶部
    scrollToVal.value = scrollToVal.value ? 0 : 0.001
    showBackTop.value = false
  }

  return { showBackTop, scrollToVal, onScroll, scrollToTop }
}
