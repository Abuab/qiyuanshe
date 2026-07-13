// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const wx: any

import type { Uni as _Uni } from '@dcloudio/types'

declare global {
  interface Uni extends _Uni {
    $baseUrl?: string
  }
}

declare interface CanvasContext {
  width?: number
  height?: number
}

export { }