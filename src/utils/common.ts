import dayjs from 'dayjs'
import { icons } from '@/config/icons'
import { getServerBaseUrl } from './request'
import { getToken } from './auth'
import { secureStorage } from './crypto'

export const formatDate = (date: string | Date | number, format: string = 'YYYY-MM-DD'): string => {
  if (!date) return ''
  return dayjs(date).format(format)
}

export const formatDateTime = (date: string | Date | number): string => {
  return formatDate(date, 'YYYY-MM-DD HH:mm')
}

export const calcAge = (birthYear: number): number => {
  if (!birthYear) return 0
  const currentYear = new Date().getFullYear()
  return currentYear - birthYear
}

export const hidePhone = (phone: string): string => {
  if (!phone || phone.length !== 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

export const copyText = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    uni.setClipboardData({
      data: text,
      success: () => {
        uni.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 1500
        })
        resolve()
      },
      fail: (err) => {
        uni.showToast({
          title: '复制失败',
          icon: 'none',
          duration: 1500
        })
        reject(err)
      }
    })
  })
}

export const saveImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    uni.getSetting({
      success: (settingRes) => {
        if (!settingRes.authSetting['scope.writePhotosAlbum']) {
          uni.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => {
              downloadAndSave(url, resolve, reject)
            },
            fail: () => {
              uni.showToast({
                title: '请授权保存图片',
                icon: 'none'
              })
              reject(new Error('Authorization denied'))
            }
          })
        } else {
          downloadAndSave(url, resolve, reject)
        }
      },
      fail: () => {
        uni.showToast({
          title: '保存失败',
          icon: 'none'
        })
        reject(new Error('Get setting failed'))
      }
    })
  })
}

const downloadAndSave = (url: string, resolve: () => void, reject: (err: Error) => void) => {
  uni.downloadFile({
    url: url,
    success: (downloadRes) => {
      if (downloadRes.statusCode === 200) {
        uni.saveImageToPhotosAlbum({
          filePath: downloadRes.tempFilePath,
          success: () => {
            uni.showToast({
              title: '保存成功',
              icon: 'success',
              duration: 1500
            })
            resolve()
          },
          fail: () => {
            uni.showToast({
              title: '保存失败',
              icon: 'none'
            })
            reject(new Error('Save image failed'))
          }
        })
      } else {
        uni.showToast({
          title: '下载失败',
          icon: 'none'
        })
        reject(new Error('Download failed'))
      }
    },
    fail: () => {
      uni.showToast({
        title: '下载失败',
        icon: 'none'
      })
      reject(new Error('Download failed'))
    }
  })
}

export const showLoading = (title: string = '加载中...'): void => {
  uni.showLoading({
    title,
    mask: true
  })
}

export const hideLoading = (): void => {
  uni.hideLoading()
}

export const showToast = (title: string, icon: 'success' | 'none' | 'loading' = 'none', duration: number = 1500): void => {
  uni.showToast({
    title,
    icon,
    duration
  })
}

export const goBack = (delta: number = 1): void => {
  uni.navigateBack({
    delta
  })
}

export const navigateTo = (url: string): void => {
  uni.navigateTo({ url })
}

export const redirectTo = (url: string): void => {
  uni.redirectTo({ url })
}

export const reLaunch = (url: string): void => {
  uni.reLaunch({ url })
}

/**
 * 将相对图片路径转换为通过后端 COS 网关访问的 URL。
 * 所有图片统一走 /api/cos/image?key= 接口，由后端负责 COS 签名 URL 或降级到本地。
 *
 * uni-app <image> 组件无法发送自定义 HTTP 头（Authorization），
 * 因此将 JWT token 作为 ?token= 查询参数一并携带。
 *
 * @param key - 图片相对路径，如 "uploads/avatar/123.jpg" 或 "/uploads/avatar/123.jpg"
 * @returns 后端 COS 网关 URL（含 token）
 */
export const getImageUrl = (key: string | null | undefined): string => {
  if (!key) return ''
  // 过滤 picsum.photos / placeholder 等不可用外部图片源
  if (/picsum\.photos|placeholder\.com|lorempixel/i.test(key)) {
    return icons.common.defaultAvatar
  }
  // 静态资源和 data URI 直接返回
  if (key.startsWith('/static/') || key.startsWith('data:')) return key

  const serverBase = getServerBaseUrl()
  // 如果已经是完整的 HTTP(S) URL，且不是本地服务器地址，直接返回
  if (key.startsWith('http://') || key.startsWith('https://')) {
    // 替换旧 IP 地址为当前域名后走 COS 网关
    const ipMatch = key.match(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/)
    if (ipMatch) {
      return key.replace(ipMatch[0], serverBase)
    }
    // 自身域名的 HTTPS URL，提取路径走 COS 网关
    if (key.startsWith(serverBase)) {
      const relative = key.slice(serverBase.length)
      let cleanKey = relative.replace(/^\//, '')
      // 若本身已是 COS 代理 URL（双层嵌套），提取原始 key，保证幂等
      const nested = cleanKey.match(/^api\/cos\/image\?key=([^&]+)/)
      if (nested) cleanKey = decodeURIComponent(nested[1]).replace(/^\//, '')
      const token = getToken()
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
      return `${serverBase}/api/cos/image?key=${encodeURIComponent(cleanKey)}${tokenParam}`
    }
    return key
  }
  // 相对路径：去掉开头的 / 后传给 COS 网关
  let cleanKey = key.replace(/^\//, '')
  // 如果相对路径本身是 COS 代理 URL（双层嵌套），提取原始 key
  const cosNestedMatch = cleanKey.match(/^api\/cos\/image\?key=([^&]+)/)
  if (cosNestedMatch) {
    cleanKey = decodeURIComponent(cosNestedMatch[1]).replace(/^\//, '')
  }
  const token = getToken()
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
  return `${serverBase}/api/cos/image?key=${encodeURIComponent(cleanKey)}${tokenParam}`
}

/**
 * 将相对图片路径转换为完整 URL。
 * @deprecated 请使用 getImageUrl 替代，新方法统一走 COS 网关（/api/cos/image）。
 * uni-app <image> 组件无法发送自定义 HTTP 头，JWT token 通过 ?token= 查询参数携带。
 */
export const getFullImageUrl = (path: string | null | undefined): string => {
  if (!path) return ''
  // 过滤 picsum.photos / placeholder 等不可用外部图片源
  if (/picsum\.photos|placeholder\.com|lorempixel/i.test(path)) {
    return icons.common.defaultAvatar
  }

  // 优先使用独立的静态资源域名（CDN/OSS），否则回退到 API 域名
  const viteEnv = (import.meta as unknown as Record<string, Record<string, string>>).env
  const serverBase = (viteEnv?.VITE_STATIC_BASE_URL || getServerBaseUrl()).replace(/\/$/, '')

  if (path.startsWith('http://') || path.startsWith('https://')) {
    // 替换旧 IP 地址为当前域名后走 COS 网关
    const ipMatch = path.match(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/)
    if (ipMatch) {
      return path.replace(ipMatch[0], serverBase)
    }
    // 自身域名的 HTTPS URL，提取路径走 COS 网关
    if (path.startsWith(serverBase)) {
      const relative = path.slice(serverBase.length)
      let cleanKey = relative.replace(/^\//, '')
      // 若本身已是 COS 代理 URL（双层嵌套），提取原始 key，保证幂等
      const nested = cleanKey.match(/^api\/cos\/image\?key=([^&]+)/)
      if (nested) cleanKey = decodeURIComponent(nested[1]).replace(/^\//, '')
      const token = getToken()
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
      return `${serverBase}/api/cos/image?key=${encodeURIComponent(cleanKey)}${tokenParam}`
    }
    return path
  }
  if (path.startsWith('/static/')) return path
  if (path.startsWith('data:')) return path

  // 相对路径走 COS 网关
  let cleanKey = path.replace(/^\//, '')
  // 如果相对路径本身是 COS 代理 URL（双层嵌套），提取原始 key
  const cosNestedMatch = cleanKey.match(/^api\/cos\/image\?key=([^&]+)/)
  if (cosNestedMatch) {
    cleanKey = decodeURIComponent(cosNestedMatch[1]).replace(/^\//, '')
  }
  const token = getToken()
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
  return `${serverBase}/api/cos/image?key=${encodeURIComponent(cleanKey)}${tokenParam}`
}

/** @deprecated 使用 getImageUrl 替代 */
export const formatImageUrl = getImageUrl

export const switchTab = (url: string): void => {
  uni.switchTab({ url })
}

export const getQueryParams = (url: string): Record<string, string> => {
  const query = url.split('?')[1] || ''
  const params: Record<string, string> = {}
  query.split('&').forEach(item => {
    const [key, value] = item.split('=')
    if (key) params[key] = decodeURIComponent(value || '')
  })
  return params
}

export const getCurrentPage = (): any => {
  const pages = getCurrentPages()
  return pages[pages.length - 1]
}

export const getCurrentPageParams = (): Record<string, string> => {
  const page = getCurrentPage()
  const { options = {} } = page
  return options as Record<string, string>
}
