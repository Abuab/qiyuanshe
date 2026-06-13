import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from '../entities/SystemConfig'

/** 默认选项字典 */
const DEFAULT_DICTS: Record<string, any> = {
  occupation: [
    '事业编','中学老师','小学老师','幼师','辅导站老师','服务行业','保险','老师','药剂师',
    '设计','培训','发型师','运营','个体工商户','普通职员','银行','工程','财务','技术',
    '技术工','餐饮','体制内','事业单位','销售','公务员','国企职员','工程师','银行职员',
    '个体户','老板创业者','公司职员','公司高管','律师','设计师','IT从业者','客服','人事',
    '财务会计','军人','服务业','教师','医生','护士','警察','其他',
  ],
  personalityTags: {
    character: [
      '话痨','社牛','慢热','敏感','闷骚','佛系','有强迫症','热爱工作',
      '关注细节','比较乖','没心机','笑点低','真诚靠谱','乐观自信','调皮可爱',
      '温柔体贴','贤惠顾家','严谨细心','智慧颜值并存','爱玩爱闹','勤奋好学',
      '风趣幽默','有气质','御姐范','敢爱敢恨','有选择恐惧症','喜欢宅',
      '大方直率','善解人意','有完美主义','知书达理','有点社恐','欢乐逗比',
      '外冷内热','斯文内敛','开朗积极','淳朴憨厚',
    ],
    hobby: [
      '剧本杀','玩游戏','二次元','看动漫','看小说','美食','自驾游',
      '听音乐','看电影','爱追剧','K歌','看书','逛街','宠物','厨艺',
      '旅行','运动','户外爬山','跑步','精致生活',
    ],
    loveRule: [
      '接受姐弟恋','绝不做舔狗','接受异地恋','信一见钟情','拒绝异地恋',
      '宁缺也毋滥','喜欢被照顾','恋爱以结婚为目的','拒大男子主义',
    ],
  },
  hopeTaTags: [
    '品味出众','喜欢厨艺','不冷暴力','重视家庭','整洁干净','阳光运动',
    '文艺范','懂得尊重','低调沉稳','心地善良','浪漫主义','乐观积极',
    '成熟稳重','爱情专一','真诚靠谱','风趣幽默','温柔体贴','有责任心',
    '有上进心','孝敬父母','能一起打拼','独立不粘人',
  ],
}

@Injectable()
export class SystemService implements OnModuleInit {
  private readonly logger = new Logger(SystemService.name)

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
  ) {}

  async onModuleInit() {
    await this.initDefaultDicts()
  }

  /**
   * 初始化默认选项字典（只有数据库无数据时才写入）
   */
  private async initDefaultDicts() {
    try {
      for (const [key, value] of Object.entries(DEFAULT_DICTS)) {
        const configKey = `dict.${key}`
        const exists = await this.configRepository.findOne({ where: { configKey } })
        if (!exists) {
          const entry = this.configRepository.create({
            configKey,
            configValue: JSON.stringify(value),
            description: `选项字典: ${key}`,
          })
          await this.configRepository.save(entry)
          this.logger.log(`[Dict] 初始化默认字典: ${key}`)
        }
      }
    } catch (error: any) {
      this.logger.warn(`[Dict] 初始化字典失败（不影响启动）: ${error?.message}`)
    }
  }

  /**
   * 获取所有选项字典（公开接口，无需auth）
   */
  async getDicts(): Promise<Record<string, any>> {
    const configs = await this.configRepository.find()
    const result: Record<string, any> = {}

    for (const config of configs) {
      const parts = config.configKey.split('.')
      if (parts[0] === 'dict' && parts[1]) {
        const key = parts[1]
        try {
          result[key] = JSON.parse(config.configValue)
        } catch {
          result[key] = config.configValue
        }
      }
    }

    return result
  }

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
