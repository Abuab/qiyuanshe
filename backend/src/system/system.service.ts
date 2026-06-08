import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from '../entities/SystemConfig'

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
  ) {}

  async getAllConfigs(): Promise<Record<string, any>> {
    const configs = await this.configRepository.find()

    const result: Record<string, any> = {
      basic: {},
      share: {},
      vip: {},
      payment: {},
      audit: {},
    }

    for (const config of configs) {
      const [group, key] = config.configKey.split('.')
      if (group && key) {
        if (!result[group]) {
          result[group] = {}
        }
        try {
          result[group][key] = JSON.parse(config.configValue)
        } catch {
          result[group][key] = config.configValue
        }
      }
    }

    return result
  }

  async getConfig(key: string): Promise<string | null> {
    const config = await this.configRepository.findOne({ where: { configKey: key } })
    if (config) {
      return config.configValue
    }
    return null
  }

  async saveConfigs(configs: Record<string, Record<string, any>>): Promise<void> {
    for (const [group, items] of Object.entries(configs)) {
      for (const [key, value] of Object.entries(items as any)) {
        const configKey = `${group}.${key}`
        const configValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

        let config = await this.configRepository.findOne({ where: { configKey } })

        if (config) {
          await this.configRepository.update(config.id, { configValue })
        } else {
          config = this.configRepository.create({
            configKey,
            configValue,
            description: `${group}.${key}`,
          })
          await this.configRepository.save(config)
        }
      }
    }
  }

  /**
   * 获取当前项目名称，用于模板变量替换
   */
  async getAppName(): Promise<string> {
    const config = await this.configRepository.findOne({
      where: { configKey: 'basic.appName' },
    })
    return config?.configValue || '栖缘社'
  }

  /**
   * 替换文本中的模板变量 {{appName}}
   */
  async replaceTemplateVars(text: string): Promise<string> {
    if (!text) return text
    const appName = await this.getAppName()
    return text.replace(/\{\{appName\}\}/g, appName)
  }
}
