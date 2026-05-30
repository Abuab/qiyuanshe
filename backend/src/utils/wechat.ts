import * as crypto from 'crypto'
import { wechatConfig } from '../config/wechat'

interface AccessTokenResponse {
  access_token: string
  expires_in: number
}

interface WechatResponse {
  errcode?: number
  errmsg?: string
}

class WechatUtil {
  private accessTokenCache: { token: string; expiresAt: number } | null = null

  async code2Session(code: string): Promise<{
    openid: string
    session_key: string
    unionid?: string
  }> {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${wechatConfig.appId}&secret=${wechatConfig.secret}&js_code=${code}&grant_type=authorization_code`

    const response = await fetch(url)
    const data = await response.json()

    if (data.errcode) {
      throw new Error(`微信code2Session失败: ${data.errmsg}`)
    }

    return {
      openid: data.openid,
      session_key: data.session_key,
      unionid: data.unionid,
    }
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now()

    if (this.accessTokenCache && this.accessTokenCache.expiresAt > now) {
      return this.accessTokenCache.token
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${wechatConfig.appId}&secret=${wechatConfig.secret}`

    const response = await fetch(url)
    const data = await response.json() as AccessTokenResponse & WechatResponse

    if (data.errcode) {
      throw new Error(`获取access_token失败: ${data.errmsg}`)
    }

    this.accessTokenCache = {
      token: data.access_token,
      expiresAt: now + (data.expires_in - 200) * 1000,
    }

    return data.access_token
  }

  decryptData<T = any>(sessionKey: string, encryptedData: string, iv: string): T {
    const decodedSessionKey = Buffer.from(sessionKey, 'base64')
    const decodedEncryptedData = Buffer.from(encryptedData, 'base64')
    const decodedIV = Buffer.from(iv, 'base64')

    const decipher = crypto.createDecipheriv('aes-128-cbc', decodedSessionKey, decodedIV)

    let decrypted = Buffer.concat([
      decipher.update(decodedEncryptedData),
      decipher.final(),
    ])

    return JSON.parse(decrypted.toString('utf8')) as T
  }

  async sendSubscribeMessage(
    accessToken: string,
    openid: string,
    templateId: string,
    data: Record<string, { value: string }>,
    page?: string,
  ): Promise<boolean> {
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`

    const payload = {
      touser: openid,
      template_id: templateId,
      page,
      data,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await response.json() as WechatResponse

    if (result.errcode && result.errcode !== 0) {
      console.error(`发送订阅消息失败: ${result.errmsg}`)
      return false
    }

    return true
  }
}

export const wechatUtil = new WechatUtil()
