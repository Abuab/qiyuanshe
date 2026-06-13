import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from '../entities/SystemConfig'

export interface SystemConfigs {
  basic?: Record<string, any>
  share?: Record<string, any>
  vip?: Record<string, any>
  payment?: Record<string, any>
  audit?: Record<string, any>
  dict?: Record<string, any>
}

@Injectable()
export class AdminSystemService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepository: Repository<SystemConfig>,
  ) {}

  async getConfigs(): Promise<SystemConfigs> {
    const configs = await this.systemConfigRepository.find()
    const result: SystemConfigs = {}

    configs.forEach((config) => {
      const parts = config.configKey.split('.')
      if (parts.length === 2) {
        const [group, key] = parts
        if (!result[group as keyof SystemConfigs]) {
          result[group as keyof SystemConfigs] = {}
        }
        try {
          result[group as keyof SystemConfigs]![key] = JSON.parse(config.configValue || 'null')
        } catch {
          result[group as keyof SystemConfigs]![key] = config.configValue
        }
      }
    })

    return result
  }

  async saveConfigs(configs: SystemConfigs) {
    for (const [group, groupConfigs] of Object.entries(configs)) {
      if (groupConfigs) {
        for (const [key, value] of Object.entries(groupConfigs)) {
          const configKey = `${group}.${key}`
          const configValue = typeof value === 'string' ? value : JSON.stringify(value)

          let config = await this.systemConfigRepository.findOne({
            where: { configKey },
          })

          if (config) {
            config.configValue = configValue
            await this.systemConfigRepository.save(config)
          } else {
            config = this.systemConfigRepository.create({
              configKey,
              configValue,
              description: `${group} ${key}`,
            })
            await this.systemConfigRepository.save(config)
          }
        }
      }
    }
  }

  async getConfig(key: string): Promise<string | null> {
    const config = await this.systemConfigRepository.findOne({
      where: { configKey: key },
    })
    return config ? config.configValue : null
  }

  async updateConfig(key: string, value: string) {
    let config = await this.systemConfigRepository.findOne({
      where: { configKey: key },
    })

    if (config) {
      config.configValue = value
      await this.systemConfigRepository.save(config)
    } else {
      config = this.systemConfigRepository.create({
        configKey: key,
        configValue: value,
        description: key,
      })
      await this.systemConfigRepository.save(config)
    }
  }
}
