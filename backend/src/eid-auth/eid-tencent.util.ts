import * as crypto from 'crypto'

/**
 * 腾讯云 FaceID（人脸核身 / E证通）API 调用工具
 *
 * 采用腾讯云 API 3.0 的 TC3-HMAC-SHA256 签名算法，直接使用 Node 内置 crypto + 全局 fetch，
 * 不引入额外 SDK 依赖。敏感配置（SecretId/SecretKey/商户号）全部从环境变量读取。
 *
 * 相关环境变量：
 *   EID_SECRET_ID    腾讯云 API 密钥 SecretId
 *   EID_SECRET_KEY   腾讯云 API 密钥 SecretKey
 *   EID_MERCHANT_ID  E证通商户号
 *   EID_REGION       区域，默认 ap-guangzhou
 */

const SERVICE = 'faceid'
const HOST = 'faceid.tencentcloudapi.com'
const VERSION = '2018-03-01'
function sha256Hex(msg: string): string {
  return crypto.createHash('sha256').update(msg, 'utf8').digest('hex')
}

function hmac(key: string | Buffer, msg: string): Buffer {
  return crypto.createHmac('sha256', key).update(msg, 'utf8').digest()
}

export interface EidConfig {
  secretId: string
  secretKey: string
  merchantId: string
  region: string
}

export function getEidConfig(): EidConfig {
  return {
    // 未单独配置 EID_* 时，回退复用通用腾讯云密钥（同一账号）
    secretId: process.env.EID_SECRET_ID || process.env.TENCENT_SECRET_ID || '',
    secretKey: process.env.EID_SECRET_KEY || process.env.TENCENT_SECRET_KEY || '',
    merchantId: process.env.EID_MERCHANT_ID || '',
    region: process.env.EID_REGION || 'ap-guangzhou',
  }
}

export function isEidConfigured(): boolean {
  const c = getEidConfig()
  return !!(c.secretId && c.secretKey && c.merchantId)
}

/**
 * 通用腾讯云 API 3.0 调用（TC3-HMAC-SHA256 签名），支持不同 service/host。
 */
export async function callTencentApi<T = any>(opts: {
  service: string
  host: string
  version: string
  action: string
  region?: string
  params: Record<string, any>
}): Promise<T> {
  const cfg = getEidConfig()
  if (!cfg.secretId || !cfg.secretKey) {
    throw new Error('腾讯云密钥未配置')
  }
  const { service, host, version, action, params } = opts
  const region = opts.region || cfg.region
  const endpoint = `https://${host}`

  const payload = JSON.stringify(params)
  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10)

  // 1. 规范请求串
  const contentType = 'application/json; charset=utf-8'
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`
  const signedHeaders = 'content-type;host'
  const hashedRequestPayload = sha256Hex(payload)
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload,
  ].join('\n')

  // 2. 待签名字符串
  const algorithm = 'TC3-HMAC-SHA256'
  const credentialScope = `${date}/${service}/tc3_request`
  const hashedCanonicalRequest = sha256Hex(canonicalRequest)
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    hashedCanonicalRequest,
  ].join('\n')

  // 3. 计算签名
  const secretDate = hmac('TC3' + cfg.secretKey, date)
  const secretService = hmac(secretDate, service)
  const secretSigning = hmac(secretService, 'tc3_request')
  const signature = crypto
    .createHmac('sha256', secretSigning)
    .update(stringToSign, 'utf8')
    .digest('hex')

  // 4. Authorization
  const authorization = `${algorithm} Credential=${cfg.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const headers: Record<string, string> = {
    Authorization: authorization,
    'Content-Type': contentType,
    Host: host,
    'X-TC-Action': action,
    'X-TC-Timestamp': String(timestamp),
    'X-TC-Version': version,
  }
  if (region) {
    headers['X-TC-Region'] = region
  }

  const resp = await fetch(endpoint, { method: 'POST', headers, body: payload })
  const json: any = await resp.json()
  const response = json?.Response
  if (!response) {
    throw new Error('腾讯云接口返回异常')
  }
  if (response.Error) {
    throw new Error(
      `${response.Error.Code || 'TencentApiError'}: ${response.Error.Message || '接口调用失败'}`,
    )
  }
  return response as T
}

/**
 * 调用腾讯云 FaceID 接口（E证通 GetEidToken / GetEidResult）
 */
export async function callFaceIdApi<T = any>(
  action: string,
  params: Record<string, any>,
): Promise<T> {
  return callTencentApi<T>({
    service: SERVICE,
    host: HOST,
    version: VERSION,
    action,
    params,
  })
}

/**
 * 调用腾讯云 OCR 身份证识别（IDCardOCR），仅用于前端表单填充，后端不做任何存储。
 */
export async function callIdCardOcr(
  imageBase64: string,
  cardSide: 'FRONT' | 'BACK' = 'FRONT',
): Promise<{ Name?: string; IdNum?: string }> {
  return callTencentApi({
    service: 'ocr',
    host: 'ocr.tencentcloudapi.com',
    version: '2018-11-19',
    action: 'IDCardOCR',
    params: { ImageBase64: imageBase64, CardSide: cardSide },
  })
}

