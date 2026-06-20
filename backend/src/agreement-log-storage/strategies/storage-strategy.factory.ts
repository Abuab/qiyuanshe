import { Injectable, Logger } from '@nestjs/common'
import {
  IAgreementLogStorageStrategy,
  StorageType,
} from '../agreement-log-storage.types'
import { LocalStorageStrategy } from './local-storage.strategy'
import { SlsStorageStrategy } from './sls-storage.strategy'

/**
 * 存储策略工厂
 * 根据配置返回对应的策略实例
 */
@Injectable()
export class StorageStrategyFactory {
  private readonly logger = new Logger(StorageStrategyFactory.name)
  private activeType: StorageType = 'local'

  constructor(
    private readonly localStrategy: LocalStorageStrategy,
    private readonly slsStrategy: SlsStorageStrategy,
  ) {}

  /**
   * 获取当前生效的策略
   */
  getStrategy(): IAgreementLogStorageStrategy {
    return this.activeType === 'sls'
      ? this.slsStrategy
      : this.localStrategy
  }

  /**
   * 切换生效策略
   */
  switchTo(type: StorageType): void {
    if (type !== 'local' && type !== 'sls') {
      this.logger.warn(`Unknown storage type: ${type}, staying with ${this.activeType}`)
      return
    }
    this.activeType = type
    this.logger.log(`Storage strategy switched to: ${type}`)
  }

  /**
   * 获取当前策略类型
   */
  getActiveType(): StorageType {
    return this.activeType
  }

  /**
   * 同时获取两个策略（用于迁移）
   */
  getBothStrategies(): {
    local: IAgreementLogStorageStrategy
    sls: IAgreementLogStorageStrategy
  } {
    return {
      local: this.localStrategy,
      sls: this.slsStrategy,
    }
  }
}
