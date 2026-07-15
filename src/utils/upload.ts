import { getToken } from './auth'
import { getBaseUrl } from './request'

/** 单张图片上传返回结果 */
export interface UploadResult {
  /** 服务器返回的图片 URL（相对路径，由后端 resolveAvatarUrl() 在读取时拼接域名） */
  url: string
}

/**
 * 上传单张图片到服务器
 *
 * 使用 uni.uploadFile，自动携带 Authorization token，
 * 统一处理 401 / 解析错误 / 网络错误。
 *
 * @param filePath - 本地临时文件路径（来自 uni.chooseImage 的 tempFilePaths）
 * @param fieldName - 后端接收的文件字段名，默认 'file'
 * @returns 包含 url 的结果
 */
export function uploadImage(filePath: string, fieldName = 'file'): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    const header: Record<string, string> = {}
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }

    const baseUrl = getBaseUrl()
    const uploadUrl = `${baseUrl}/upload`

    uni.uploadFile({
      url: uploadUrl,
      filePath,
      name: fieldName,
      header,
      timeout: 30000,
      success: (res) => {
        // 401 特殊处理
        if (res.statusCode === 401) {
          reject(new Error('Unauthorized'))
          return
        }

        // HTTP 层面失败
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`服务器响应异常(${res.statusCode})`))
          return
        }

        // 解析响应体
        try {
          const data = JSON.parse(res.data) as Record<string, unknown>

          // 兼容多种后端响应格式：
          // NestJS Result.success() → { code: 200, data: { url: '...' } }
          // 直接返回 URL      → { url: '...' }
          // 老格式            → { success: true, url: '...' }
          if (data.code === 200 && data.data && typeof data.data === 'object') {
            const inner = data.data as Record<string, unknown>
            if (typeof inner.url === 'string') {
              resolve({ url: inner.url as string })
              return
            }
          }
          if (typeof data.url === 'string') {
            resolve({ url: data.url as string })
            return
          }

          reject(new Error((data.msg || data.message || '上传失败') as string))
        } catch {
          reject(new Error('响应解析失败'))
        }
      },
      fail: (err) => {
        console.error('[upload] 上传失败:', err)
        const msg = err.errMsg?.includes('timeout')
          ? '上传超时，请检查网络'
          : '上传失败，请重试'
        reject(new Error(msg))
      },
    })
  })
}

/**
 * 批量上传多张图片（每批最多 5 个并发，避免超过小程序网络连接限制）
 *
 * @param filePaths - 临时文件路径数组
 * @returns 上传成功的结果数组（失败会跳过并 console.error）
 */
export async function uploadImages(filePaths: string[]): Promise<UploadResult[]> {
  const CONCURRENCY = 5
  const results: (UploadResult | null)[] = []

  for (let i = 0; i < filePaths.length; i += CONCURRENCY) {
    const batch = filePaths.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map((path) =>
        uploadImage(path).catch((err) => {
          console.error('[upload] 批量上传中单张失败:', err)
          return null
        }),
      ),
    )
    results.push(...batchResults)
  }

  return results.filter((r): r is UploadResult => r !== null)
}
