import type { Uni as _Uni } from '@dcloudio/types'

declare global {
  interface Uni extends _Uni {
    $baseUrl?: string
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wx: any
}

declare interface CanvasContext {
  width?: number
  height?: number
}

export { }