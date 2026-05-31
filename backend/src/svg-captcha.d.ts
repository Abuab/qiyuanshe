declare module 'svg-captcha' {
  interface CaptchaOptions {
    size?: number
    ignoreChars?: string
    noise?: number
    color?: boolean
    width?: number
    height?: number
    fontSize?: number
    charPreset?: string
    background?: string
  }

  interface CaptchaResult {
    data: string
    text: string
  }

  export function create(options?: CaptchaOptions): CaptchaResult
}