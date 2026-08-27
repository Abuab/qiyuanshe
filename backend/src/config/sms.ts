export interface SmsConfig {
  secretId: string
  secretKey: string
  sdkAppId: string
  signName: string
  templateId: string
  region: string
}

export const smsConfig = (): SmsConfig => ({
  // 未单独配置 SMS_* 时，回退复用通用腾讯云密钥（同一账号）
  secretId: process.env.SMS_SECRET_ID || process.env.TENCENT_SECRET_ID || '',
  secretKey: process.env.SMS_SECRET_KEY || process.env.TENCENT_SECRET_KEY || '',
  sdkAppId: process.env.SMS_SDK_APP_ID || '',
  signName: process.env.SMS_SIGN_NAME || '',
  templateId: process.env.SMS_TEMPLATE_ID || '',
  region: process.env.SMS_REGION || 'ap-guangzhou',
})

export const isSmsConfigured = (): boolean => {
  const c = smsConfig()
  return !!(c.secretId && c.secretKey && c.sdkAppId && c.signName && c.templateId)
}
