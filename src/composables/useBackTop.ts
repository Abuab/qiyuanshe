import { ref } from 'vue'

export function useBackTop(threshold = 600) {
  const showBackTop = ref(false)

  const onScroll = (e: { detail: { scrollTop: number } }) => {
    showBackTop.value = e.detail.scrollTop > threshold
  }

  const scrollToTop = () => {
    uni.pageScrollTo({ scrollTop: 0, duration: 300 })
  }

  return { showBackTop, onScroll, scrollToTop }
}
