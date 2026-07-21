import request, { get, post } from '@/utils/request'

/**
 * 人格测试 - 小程序端公共逻辑
 * 覆盖：游客 token、答题进度缓存、统一入口跳转、文案位曝光/点击/转化上报。
 */

const GUEST_TOKEN_KEY = 'ptest_guest_token'
const PROGRESS_KEY = 'ptest_progress'
const PENDING_CONVERSION_KEY = 'ptest_pending_conversion'
const REPORT_QUEUE_KEY = 'ptest_report_queue'
const QUESTIONS_CACHE_KEY = 'ptest_questions_cache'

// ==================== 游客 token ====================

export function getGuestToken(): string {
  try {
    return (uni.getStorageSync(GUEST_TOKEN_KEY) as string) || ''
  } catch {
    return ''
  }
}

function setGuestToken(token: string): void {
  try {
    uni.setStorageSync(GUEST_TOKEN_KEY, token)
  } catch { /* ignore */ }
}

export function clearGuestToken(): void {
  try {
    uni.removeStorageSync(GUEST_TOKEN_KEY)
  } catch { /* ignore */ }
}

/** 确保存在有效游客 token（未登录时使用），返回 token（失败返回空串） */
export async function ensureGuestToken(): Promise<string> {
  const existing = getGuestToken()
  if (existing) return existing
  try {
    const sys = uni.getSystemInfoSync()
    const res: any = await post('/personality/guest-token', {
      deviceInfo: { model: sys.model, platform: sys.platform, system: sys.system },
    })
    const token = res?.guestToken || ''
    if (token) setGuestToken(token)
    return token
  } catch {
    return ''
  }
}

// ==================== 答题进度本地缓存 ====================

export interface LocalProgress {
  sessionId: string
  questions: any[]
  answers: Record<number, number>
  answeredAt: Record<number, number>
  currentIndex: number
  startedAt: number
  minDurationSeconds: number
  updatedAt: number
}

export function saveLocalProgress(p: LocalProgress): void {
  try {
    uni.setStorageSync(PROGRESS_KEY, JSON.stringify(p))
  } catch { /* ignore */ }
}

export function loadLocalProgress(): LocalProgress | null {
  try {
    const raw = uni.getStorageSync(PROGRESS_KEY) as string
    if (!raw) return null
    const p = JSON.parse(raw) as LocalProgress
    // 有效期 24 小时
    if (!p.updatedAt || Date.now() - p.updatedAt > 24 * 3600 * 1000) {
      clearLocalProgress()
      return null
    }
    return p
  } catch {
    return null
  }
}

export function clearLocalProgress(): void {
  try {
    uni.removeStorageSync(PROGRESS_KEY)
  } catch { /* ignore */ }
}

// ==================== 结果查询 & 统一入口跳转 ====================

/** 查询人格结果（登录用户走 JWT，游客带 guestToken）；无结果返回 null */
export async function fetchPersonalityResult(isLoggedIn: boolean): Promise<any | null> {
  try {
    if (isLoggedIn) return await get('/personality/my-result')
    const token = getGuestToken()
    if (!token) return null
    return await get('/personality/my-result', { guestToken: token })
  } catch {
    return null
  }
}

/**
 * 统一入口跳转：
 * - 已测试 → 结果页
 * - 未测试 → 答题页（游客先建 token）
 */
export async function goPersonalityEntry(isLoggedIn: boolean): Promise<void> {
  const result = await fetchPersonalityResult(isLoggedIn)
  if (result && result.typeCode) {
    uni.navigateTo({ url: '/subpkg-pages/personality/result' })
    return
  }
  if (!isLoggedIn) await ensureGuestToken()
  uni.navigateTo({ url: '/subpkg-pages/personality/test' })
}

// ==================== 文案合规 ====================

/** 禁用词（与后端 ai-personality.compliance 保持一致的软性表述原则） */
const FORBIDDEN_WORDS = [
  '算命', '运势', '命理', '占卜', '命中注定', '宿命', '八字', '风水',
  '转运', '旺夫', '克夫', '批命', '卜卦', '生辰',
]

/** 分享文案合规过滤：命中禁用词则返回空串，交由调用方使用默认合规文案 */
export function sanitizeShareText(text: string): string {
  if (!text) return ''
  const hit = FORBIDDEN_WORDS.some((w) => text.includes(w))
  return hit ? '' : text
}

export interface ResolvedCopy {
  mainText?: string
  subText?: string
  itemId?: number
}

// ==================== 弱网离线上报队列 ====================

interface ReportEvent {
  url: string
  data: Record<string, any>
}

/** 静默上报（不弹 toast），返回是否成功 */
async function silentPost(url: string, data: Record<string, any>): Promise<boolean> {
  try {
    await request({ url, method: 'POST', data, skipToast: true })
    return true
  } catch {
    return false
  }
}

function readQueue(): ReportEvent[] {
  try {
    const raw = uni.getStorageSync(REPORT_QUEUE_KEY) as string
    return raw ? (JSON.parse(raw) as ReportEvent[]) : []
  } catch {
    return []
  }
}

function writeQueue(q: ReportEvent[]): void {
  try {
    // 队列最多保留 100 条，避免无限膨胀
    uni.setStorageSync(REPORT_QUEUE_KEY, JSON.stringify(q.slice(-100)))
  } catch { /* ignore */ }
}

function enqueueReport(evt: ReportEvent): void {
  const q = readQueue()
  q.push(evt)
  writeQueue(q)
}

/** 上报（失败入队，弱网恢复后由 flushReportQueue 批量补报） */
async function reportOrQueue(url: string, data: Record<string, any>): Promise<void> {
  const ok = await silentPost(url, data)
  if (!ok) enqueueReport({ url, data })
}

/** 批量补报离线队列（App/页面启动时调用），逐条成功后移除 */
export async function flushReportQueue(): Promise<void> {
  let q = readQueue()
  if (q.length === 0) return
  const remaining: ReportEvent[] = []
  for (const evt of q) {
    const ok = await silentPost(evt.url, evt.data)
    if (!ok) remaining.push(evt)
  }
  writeQueue(remaining)
}

/**
 * 解析文案位并上报曝光：返回首条文案（含 itemId）。
 * 槽位未配置时返回 null（静默），调用方使用默认文案。
 */
export async function resolveAndExposeCopy(slotCode: string): Promise<ResolvedCopy | null> {
  try {
    const copy: any = await get('/guide/copy/resolve', { slotCode })
    const items: any[] = copy?.items || []
    if (items.length === 0) return null
    const itemIds = items.map((i) => i.id).filter((n) => typeof n === 'number')
    if (itemIds.length > 0) {
      reportOrQueue('/guide/copy/exposure', { slotCode, itemIds })
    }
    return { mainText: items[0].mainText, subText: items[0].subText, itemId: items[0].id }
  } catch {
    return null
  }
}

/** 上报文案位点击 */
export function reportCopyClick(slotCode: string, itemId?: number): void {
  if (!itemId) return
  reportOrQueue('/guide/copy/click', { slotCode, itemId })
  // 记录待转化 itemId，登录成功后回传转化
  try {
    uni.setStorageSync(PENDING_CONVERSION_KEY, String(itemId))
  } catch { /* ignore */ }
}

/** 登录成功后上报文案转化（需已登录），成功后清除待转化标记 */
export function reportPendingConversion(): void {
  try {
    const raw = uni.getStorageSync(PENDING_CONVERSION_KEY) as string
    const itemId = raw ? parseInt(raw, 10) : NaN
    if (!Number.isFinite(itemId)) return
    silentPost('/guide/copy/login-conversion', { itemId }).then((ok) => {
      if (ok) uni.removeStorageSync(PENDING_CONVERSION_KEY)
    })
  } catch { /* ignore */ }
}

// ==================== 题目本地缓存（避免重复请求） ====================

interface CachedQuestions {
  data: any
  loggedIn: boolean
  updatedAt: number
}

const QUESTIONS_CACHE_TTL = 30 * 60 * 1000 // 30 分钟

export function cacheQuestions(data: any, loggedIn: boolean): void {
  try {
    uni.setStorageSync(
      QUESTIONS_CACHE_KEY,
      JSON.stringify({ data, loggedIn, updatedAt: Date.now() } as CachedQuestions),
    )
  } catch { /* ignore */ }
}

export function loadCachedQuestions(loggedIn: boolean): any | null {
  try {
    const raw = uni.getStorageSync(QUESTIONS_CACHE_KEY) as string
    if (!raw) return null
    const c = JSON.parse(raw) as CachedQuestions
    if (c.loggedIn !== loggedIn) return null
    if (!c.updatedAt || Date.now() - c.updatedAt > QUESTIONS_CACHE_TTL) return null
    return c.data
  } catch {
    return null
  }
}

export function clearQuestionsCache(): void {
  try {
    uni.removeStorageSync(QUESTIONS_CACHE_KEY)
  } catch { /* ignore */ }
}
