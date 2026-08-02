import request from './request'
import type { ApiResponse } from './request'

/** 登录请求 */
export interface LoginParams {
  username: string
  password: string
  captcha: string
  captchaKey?: string
}

/** 登录响应 */
export interface LoginResult {
  success: boolean
  token?: string
  user?: {
    id: number
    username: string
    nickname: string
    role: string
    avatar?: string
    mfaEnabled?: boolean
    mfaType?: string
  }
  permissions?: string[]
  needMfa?: boolean
  mfaType?: string
  phoneMask?: string
  tempToken?: string
  message?: string
}

/** MFA 验证请求 */
export interface MfaVerifyParams {
  tempToken: string
  code: string
}

/** 验证码响应 */
export interface CaptchaResult {
  svg: string
  key: string
}

export const adminAuth = {
  /** 管理员登录（第一步：用户名+密码+验证码） */
  login(data: LoginParams): Promise<ApiResponse<LoginResult>> {
    return request.post('/admin/login', data)
  },

  /** MFA 第二步验证 */
  mfaLoginVerify(data: MfaVerifyParams): Promise<ApiResponse<LoginResult>> {
    return request.post('/admin/mfa/login-verify', data)
  },

  /** 获取图形验证码 */
  getCaptcha(): Promise<ApiResponse<CaptchaResult>> {
    return request.get('/admin/captcha')
  },

  /** 刷新管理员 token */
  refresh(refreshToken: string): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    return request.post('/admin/auth/refresh', { refreshToken })
  },
}
