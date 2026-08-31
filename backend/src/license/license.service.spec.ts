import 'reflect-metadata'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { LicenseService, ALL_LICENSE_FEATURES } from './license.service'
import { SystemConfig } from '../entities/SystemConfig'

describe('LicenseService', () => {
  let service: LicenseService
  let findOne: jest.Mock

  beforeEach(async () => {
    findOne = jest.fn()
    const repo = { findOne } as unknown as Repository<SystemConfig>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseService,
        { provide: getRepositoryToken(SystemConfig), useValue: repo },
      ],
    }).compile()

    service = module.get<LicenseService>(LicenseService)
  })

  /** 模拟 system_configs 表中 license.config 的 configValue（null 表示未配置） */
  const setConfig = (configValue: string | null) => {
    findOne.mockResolvedValue(configValue == null ? null : { configValue })
  }

  describe('getLicenseInfo', () => {
    it('未配置时按 valid 处理并返回全量功能', async () => {
      setConfig(null)
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('valid')
      expect(info.features).toEqual([...ALL_LICENSE_FEATURES])
    })

    it('valid 状态返回全量功能', async () => {
      setConfig('{"status":"valid"}')
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('valid')
      expect(info.features).toEqual([...ALL_LICENSE_FEATURES])
    })

    it('grace_period 状态返回全量功能并计算剩余天数', async () => {
      const expiresAt = new Date(Date.now() + 10 * 86400000).toISOString()
      setConfig(JSON.stringify({ status: 'grace_period', expiresAt }))
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('grace_period')
      expect(info.features).toEqual([...ALL_LICENSE_FEATURES])
      expect(info.graceDaysLeft).toBeGreaterThan(0)
    })

    it('expired 状态收敛为只读白名单（忽略显式写功能配置）', async () => {
      setConfig('{"status":"expired","features":["like","vip"]}')
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('expired')
      expect(info.features).toEqual(['user_browse', 'realname_auth'])
      expect(info.lockMessage).toBe('系统授权已过期')
    })

    it('unauthorized 状态收敛为只读白名单', async () => {
      setConfig('{"status":"unauthorized"}')
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('unauthorized')
      expect(info.features).toEqual(['user_browse', 'realname_auth'])
      expect(info.lockMessage).toBe('系统未授权')
    })

    it('非法 status 回退为 valid', async () => {
      setConfig('{"status":"unknown"}')
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('valid')
    })

    it('非法 JSON 回退为 valid', async () => {
      setConfig('not-a-json')
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('valid')
    })

    it('数据库异常时 fail-open 返回 valid（不锁死平台）', async () => {
      findOne.mockRejectedValue(new Error('db down'))
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('valid')
      expect(info.features).toEqual([...ALL_LICENSE_FEATURES])
    })
  })

  describe('isActive', () => {
    it('valid / grace_period 视为可用', async () => {
      setConfig('{"status":"valid"}')
      expect(await service.isActive()).toBe(true)

      setConfig('{"status":"grace_period"}')
      expect(await service.isActive()).toBe(true)
    })

    it('expired / unauthorized 视为不可用', async () => {
      setConfig('{"status":"expired"}')
      expect(await service.isActive()).toBe(false)

      setConfig('{"status":"unauthorized"}')
      expect(await service.isActive()).toBe(false)
    })
  })
})
