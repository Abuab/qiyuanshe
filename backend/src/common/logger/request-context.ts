import { AsyncLocalStorage } from 'async_hooks'

/** 请求上下文数据结构 */
export interface RequestContextData {
  /** 请求唯一追踪 ID */
  traceId: string
  /** 客户端 IP */
  ip?: string
  /** 请求方法 */
  method?: string
  /** 请求路径 */
  url?: string
}

const storage = new AsyncLocalStorage<RequestContextData>()

export const RequestContext = {
  /** 获取当前请求上下文，未在请求上下文中返回 undefined */
  get(): RequestContextData | undefined {
    return storage.getStore()
  },

  /** 在指定上下文中运行回调 */
  run(ctx: RequestContextData, fn: () => void) {
    storage.run(ctx, fn)
  },
}
