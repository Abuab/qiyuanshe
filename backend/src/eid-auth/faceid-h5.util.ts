import * as crypto from 'crypto'

/**
 * 腾讯云人脸核身「增强版 · 移动端浏览器 H5」接入工具
 *
 * 与 E证通（小程序）是两条独立链路：
 *   - E证通：GetEidToken / GetEidResult，商户号鉴权，调起微信小程序
 *   - 移动 H5：kyc1.qcloud.com SaaS 接口，WBappId + Secret 鉴权，跳转腾讯云托管 H5 页
 *
 * 流程（见官方文档 1007/61073、61074、61302）：
 *   1. 取 access_token（缓存 20 分钟）
 *   2. 取 SIGN ticket（服务端签名用，缓存 20 分钟）/ NONCE ticket（启动 H5 用，一次性，120 秒）
 *   3. 后台上送身份信息 getAdvFaceId → 返回 faceId + optimalDomain
 *   4. 拼接启动 URL，前端跳转 https://{optimalDomain}/s/web/h5?...
 *   5. 核身完成后跳回我们的回调 URL（带 code / orderNo / h5faceId）
 *   6. 服务端 queryfacerecord 拉取权威结果
 *
 * 相关环境变量：
 *   EID_FACEID_WBAPPID      H5 服务的 WBappId（控制台 SDK/移动H5服务）
 *   EID_FACEID_SECRET       WBappId 对应的 Secret
 *   EID_FACEID_REDIRECT_URL 核身完成后回跳的落地页（必须是可直接访问的完整 URL）
 */

const HOST = 'kyc1.qcloud.com'
const VERSION = '1.0.0'
const BASE = `https://${HOST}`
const DEFAULT_REDIRECT_URL = 'https://www.arvine.cn/static/h5-auth-callback.html'

export interface FaceIdH5Config {
  appId: string
  secret: string
  redirectUrl: string
}

export function getFaceIdH5Config(): FaceIdH5Config {
  return {
    appId: process.env.EID_FACEID_WBAPPID || '',
    secret: process.env.EID_FACEID_SECRET || '',
    redirectUrl: process.env.EID_FACEID_REDIRECT_URL || DEFAULT_REDIRECT_URL,
  }
}

export function isFaceIdH5Configured(): boolean {
  const c = getFaceIdH5Config()
  return !!(c.appId && c.secret)
}

/** 字典序排序后拼接，SHA1 取 40 位签名（官方约定不区分大小写，这里统一大写） */
function sha1Sign(values: Array<string | number>): string {
  return crypto
    .createHash('sha1')
    .update(values.map(String).sort().join(''), 'utf8')
    .digest('hex')
    .toUpperCase()
}

/** 32 位随机串（字母 + 数字） */
function randomNonce(len = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length]
  return out
}

async function requestJson(url: string, body?: Record<string, any>): Promise<any> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const resp = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    return await resp.json()
  } finally {
    clearTimeout(timer)
  }
}

// ============ access_token / ticket 缓存 ============
// 官方要求缓存并定时刷新、不可并发刷新；这里用 Promise 单飞避免并发刷新
let tokenCache: { value: string; expireAt: number } = { value: '', expireAt: 0 }
let tokenInflight: Promise<string> | null = null

async function fetchAccessToken(): Promise<string> {
  const cfg = getFaceIdH5Config()
  const url = `${BASE}/api/oauth2/access_token?appId=${encodeURIComponent(cfg.appId)}&secret=${encodeURIComponent(cfg.secret)}&grant_type=client_credential&version=${VERSION}`
  const res = await requestJson(url)
  if (String(res?.code) !== '0' || !res?.access_token) {
    throw new Error(`获取人脸核身 access_token 失败：${res?.msg || res?.code || '未知错误'}`)
  }
  const ttl = Math.max(60, (Number(res.expire_in) || 7200) - 120)
  tokenCache = { value: res.access_token, expireAt: Date.now() + ttl * 1000 }
  return tokenCache.value
}

async function getAccessToken(): Promise<string> {
  if (tokenCache.value && Date.now() < tokenCache.expireAt) return tokenCache.value
  if (!tokenInflight) {
    tokenInflight = fetchAccessToken().finally(() => {
      tokenInflight = null
    })
  }
  return tokenInflight
}

let signTicketCache: { value: string; expireAt: number } = { value: '', expireAt: 0 }

async function getSignTicket(): Promise<string> {
  if (signTicketCache.value && Date.now() < signTicketCache.expireAt) return signTicketCache.value
  const cfg = getFaceIdH5Config()
  const token = await getAccessToken()
  const url = `${BASE}/api/oauth2/api_ticket?appId=${encodeURIComponent(cfg.appId)}&access_token=${encodeURIComponent(token)}&type=SIGN&version=${VERSION}`
  const res = await requestJson(url)
  const value = res?.tickets?.[0]?.value
  if (String(res?.code) !== '0' || !value) {
    throw new Error(`获取人脸核身 SIGN ticket 失败：${res?.msg || res?.code || '未知错误'}`)
  }
  // SIGN ticket 有效期 60 分钟，官方建议每 20 分钟刷新一次
  const ttl = 20 * 60 - 60
  signTicketCache = { value, expireAt: Date.now() + ttl * 1000 }
  return value
}

/** NONCE ticket 一次性有效（120 秒），每次启动 H5 都必须重新获取 */
async function getNonceTicket(userId: string): Promise<string> {
  const cfg = getFaceIdH5Config()
  const token = await getAccessToken()
  const url = `${BASE}/api/oauth2/api_ticket?appId=${encodeURIComponent(cfg.appId)}&access_token=${encodeURIComponent(token)}&type=NONCE&version=${VERSION}&user_id=${encodeURIComponent(userId)}`
  const res = await requestJson(url)
  const value = res?.tickets?.[0]?.value
  if (String(res?.code) !== '0' || !value) {
    throw new Error(`获取人脸核身 NONCE ticket 失败：${res?.msg || res?.code || '未知错误'}`)
  }
  return value
}

// ============ 对外接口 ============

/**
 * 后台上送身份信息（增强版 H5），拿到 faceId。
 * 使用权威数据源比对：姓名 + 身份证号必须传入。
 */
export async function createH5FaceId(params: {
  orderNo: string
  userId: string
  name: string
  idNo: string
}): Promise<{ faceId: string; optimalDomain: string }> {
  const cfg = getFaceIdH5Config()
  const ticket = await getSignTicket()
  const nonce = randomNonce()

  // 增强版上送签名：appId / userId / version / ticket(SIGN) / nonce
  const sign = sha1Sign([cfg.appId, params.userId, VERSION, ticket, nonce])

  const res = await requestJson(
    `${BASE}/api/server/getAdvFaceId?orderNo=${encodeURIComponent(params.orderNo)}`,
    {
      appId: cfg.appId,
      orderNo: params.orderNo,
      name: params.name,
      idNo: params.idNo,
      userId: params.userId,
      version: VERSION,
      sign,
      nonce,
      url: encodeURIComponent(cfg.redirectUrl),
      from: 'browser',
    },
  )

  if (String(res?.code) !== '0') {
    throw new Error(`人脸核身上送身份失败：${res?.msg || res?.code || '未知错误'}`)
  }
  const result = res?.result || {}
  if (!result.faceId) {
    throw new Error('人脸核身上送身份失败：未返回 faceId')
  }
  return {
    faceId: result.faceId,
    optimalDomain: result.optimalDomain || HOST,
  }
}

/**
 * 拼接启动 H5 人脸核身的跳转 URL。
 * 注意：该 URL 不能放在 <a> 标签里（浏览器预加载会导致签名一次性失效），必须由 JS 跳转。
 */
export async function buildH5LaunchUrl(params: {
  orderNo: string
  userId: string
  faceId: string
  optimalDomain: string
}): Promise<string> {
  const cfg = getFaceIdH5Config()
  const nonceTicket = await getNonceTicket(params.userId)
  // 启动签名：appId / userId / orderNo / version / faceId / ticket(NONCE)
  const sign = sha1Sign([cfg.appId, params.userId, params.orderNo, VERSION, params.faceId, nonceTicket])
  const query = [
    `appId=${encodeURIComponent(cfg.appId)}`,
    `version=${VERSION}`,
    `orderNo=${encodeURIComponent(params.orderNo)}`,
    `faceId=${encodeURIComponent(params.faceId)}`,
    `userId=${encodeURIComponent(params.userId)}`,
    `sign=${sign}`,
  ].join('&')
  return `https://${params.optimalDomain}/s/web/h5?${query}`
}

/**
 * 服务端查询核身结果（权威结果）。
 * code=0 表示身份验证成功且为同一人。
 */
export async function queryH5FaceRecord(orderNo: string): Promise<{
  code: string
  msg: string
  liveRate: string
  similarity: string
}> {
  const cfg = getFaceIdH5Config()
  const ticket = await getSignTicket()
  const nonce = randomNonce()
  // 查询签名：appId / orderNo / version / ticket(SIGN) / nonce
  const sign = sha1Sign([cfg.appId, orderNo, VERSION, ticket, nonce])

  const res = await requestJson(
    `${BASE}/api/v2/base/queryfacerecord?orderNo=${encodeURIComponent(orderNo)}`,
    {
      appId: cfg.appId,
      version: VERSION,
      nonce,
      orderNo,
      sign,
    },
  )

  return {
    code: String(res?.code ?? ''),
    msg: res?.msg || '',
    liveRate: String(res?.result?.liveRate ?? ''),
    similarity: String(res?.result?.similarity ?? ''),
  }
}
