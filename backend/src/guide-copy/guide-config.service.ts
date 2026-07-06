import { BadRequestException, Injectable } from '@nestjs/common'
import { SystemService } from '../system/system.service'

/** 浮动按钮展示模式：ask 问媒 / test 测一测 */
export type FloatingButtonMode = 'ask' | 'test'

/** 单个模式下的按钮外观与跳转配置 */
export interface FloatingButtonStyle {
  /** 按钮文案 */
  text: string
  /** 按钮图标（图标标识或图片 URL） */
  icon: string
  /** 按钮背景色 */
  bgColor: string
  /** 跳转目标（页面路径或动作标识） */
  target: string
}

export interface FloatingButtonConfig {
  /** 当前生效模式 */
  mode: FloatingButtonMode
  /** 问媒模式配置 */
  ask: FloatingButtonStyle
  /** 测一测模式配置 */
  test: FloatingButtonStyle
}

const CONFIG_KEY = 'guide.homeFloatingButton'

const DEFAULTS: FloatingButtonConfig = {
  mode: 'ask',
  ask: {
    text: '问媒',
    icon: 'chat',
    bgColor: '#ff6b81',
    target: 'action:matchmaker-contact',
  },
  test: {
    text: '测一测',
    icon: 'compass',
    bgColor: '#7c5cff',
    target: '/pages/personality/test',
  },
}

/**
 * 引导配置服务（首页浮动按钮）
 *
 * 复用 system_configs 存储（key: guide.homeFloatingButton，值为 JSON）。
 * 读取时不做长缓存，管理员保存后即时生效、无需重启。
 */
@Injectable()
export class GuideConfigService {
  constructor(private readonly systemService: SystemService) {}

  async getFloatingButton(): Promise<FloatingButtonConfig> {
    let parsed: Partial<FloatingButtonConfig> = {}
    try {
      const raw = await this.systemService.getConfig(CONFIG_KEY)
      if (raw) parsed = JSON.parse(raw)
    } catch {
      parsed = {}
    }
    // 与默认值合并，保证字段完整
    return {
      mode: parsed.mode === 'test' ? 'test' : 'ask',
      ask: { ...DEFAULTS.ask, ...(parsed.ask || {}) },
      test: { ...DEFAULTS.test, ...(parsed.test || {}) },
    }
  }

  async saveFloatingButton(input: any): Promise<FloatingButtonConfig> {
    const mode: FloatingButtonMode = input?.mode === 'test' ? 'test' : 'ask'
    const normalizeStyle = (s: any, fallback: FloatingButtonStyle): FloatingButtonStyle => {
      const text = typeof s?.text === 'string' ? s.text.trim() : ''
      if (!text) throw new BadRequestException('按钮文案不能为空')
      return {
        text,
        icon: typeof s?.icon === 'string' ? s.icon.trim() : fallback.icon,
        bgColor: typeof s?.bgColor === 'string' && s.bgColor.trim() ? s.bgColor.trim() : fallback.bgColor,
        target: typeof s?.target === 'string' && s.target.trim() ? s.target.trim() : fallback.target,
      }
    }
    const config: FloatingButtonConfig = {
      mode,
      ask: normalizeStyle(input?.ask, DEFAULTS.ask),
      test: normalizeStyle(input?.test, DEFAULTS.test),
    }
    await this.systemService.saveConfigs({ guide: { homeFloatingButton: config } })
    return config
  }
}
