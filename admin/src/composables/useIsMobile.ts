import { ref } from 'vue'

/**
 * 全局响应式断点：是否为移动端（宽度 <= 768px）
 * 模块级单例，所有组件共享同一个响应式 ref。
 */
const MOBILE_BREAKPOINT = 768

export const isMobile = ref(false)

let mql: MediaQueryList | null = null

function update() {
  isMobile.value = mql ? mql.matches : window.innerWidth <= MOBILE_BREAKPOINT
}

if (typeof window !== 'undefined' && window.matchMedia) {
  mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
  update()
  mql.addEventListener('change', update)
}
