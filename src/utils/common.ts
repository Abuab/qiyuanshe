import dayjs from 'dayjs'
import { getServerBaseUrl } from './request'

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
 * 将相对图片路径转换为完整 URL
 * /static/xxx → 本地路径（小程序内图片）
 * /uploads/xxx → 拼接服务器域名
 * http/https 开头 → 直接返回
 * 其他 → 拼接 uploads 路径
 */
export const getFullImageUrl = (path: string | null | undefined): string => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/static/')) return path
  if (path.startsWith('data:')) return path

  const serverBase = getServerBaseUrl()

  if (path.startsWith('/uploads/')) {
    return serverBase + path
  }
  return serverBase + '/uploads/' + path.replace(/^\//, '')
}

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
