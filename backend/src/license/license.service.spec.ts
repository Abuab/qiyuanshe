import 'reflect-metadata'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { generateKeyPairSync, createSign } from 'crypto'
import { LicenseService, ALL_LICENSE_FEATURES, LICENSE_PUBLIC_KEY_TOKEN } from './license.service'
import { SystemLicense } from '../entities/SystemLicense'

describe('LicenseService', () => {
  let service: LicenseService
  let findOne: jest.Mock
  let update: jest.Mock
  let create: jest.Mock
  let save: jest.Mock
  let publicKey: string
  let privateKey: string

  beforeAll(() => {
    const pair = generateKeyPairSync('rsa', { modulusLength: 2048 })
    publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString()
    privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  })

  beforeEach(async () => {
    findOne = jest.fn()
    update = jest.fn()
    create = jest.fn()
    save = jest.fn()
    const repo = { findOne, update, create, save } as unknown as Repository<SystemLicense>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseService,
        { provide: getRepositoryToken(SystemLicense), useValue: repo },
        { provide: LICENSE_PUBLIC_KEY_TOKEN, useValue: publicKey },
      ],
    }).compile()

    service = module.get<LicenseService>(LicenseService)
  })

  const signPayload = (payload: Record<string, any>) => {
    const sign = createSign('RSA-SHA256')
    sign.update(JSON.stringify(payload))
    sign.end()
    const signature = sign.sign(privateKey, 'base64')
    return Buffer.from(JSON.stringify({ payload, signature })).toString('base64')
  }

  const validPayload = (overrides: Record<string, any> = {}) => ({
    customer: '测试客户',
    status: 'valid',
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    features: [...ALL_LICENSE_FEATURES],
    issuedAt: new Date().toISOString(),
    ...overrides,
  })

  const activatedRecord = (licenseKey: string): Partial<SystemLicense> => ({
    id: 1,
    isActivated: true,
    licenseKey,
    activatedAt: new Date(),
  })

  describe('getLicenseInfo', () => {
    it('无激活记录时返回 unauthorized（fail-closed）', async () => {
      findOne.mockResolvedValue(null)
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('unauthorized')
      expect(info.features).toEqual(['user_browse', 'realname_auth'])
      expect(info.lockMessage).toBe('系统未授权')
    })

    it('数据库异常时 fail-closed 返回 unauthorized', async () => {
      findOne.mockRejectedValue(new Error('db down'))
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('unauthorized')
    })

    it('有效 License 验签通过，返回 valid + 全量功能', async () => {
      const payload = validPayload()
      findOne.mockResolvedValue(activatedRecord(signPayload(payload)))
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('valid')
      expect(info.features).toEqual([...ALL_LICENSE_FEATURES])
      expect(info.customer).toBe('测试客户')
    })

    it('过期 License 收敛为只读白名单', async () => {
      const payload = validPayload({ expiresAt: new Date(Date.now() - 86400000).toISOString() })
      findOne.mockResolvedValue(activatedRecord(signPayload(payload)))
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('expired')
      expect(info.features).toEqual(['user_browse', 'realname_auth'])
      expect(info.lockMessage).toBe('系统授权已过期')
    })

    it('grace_period 状态返回全量功能', async () => {
      const payload = validPayload({ status: 'grace_period' })
      findOne.mockResolvedValue(activatedRecord(signPayload(payload)))
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('grace_period')
      expect(info.features).toEqual([...ALL_LICENSE_FEATURES])
    })

    it('签名被篡改时返回 unauthorized', async () => {
      const payload = validPayload()
      const sign = createSign('RSA-SHA256')
      sign.update(JSON.stringify(payload))
      sign.end()
      const signature = sign.sign(privateKey, 'base64')
      // 篡改 payload 内容但保持原签名不变 → 验签必然失败
      const tampered = Buffer.from(
        JSON.stringify({ payload: { ...payload, customer: '被篡改的客户' }, signature }),
      ).toString('base64')
      findOne.mockResolvedValue(activatedRecord(tampered))
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('unauthorized')
    })

    it('非 Base64 / 结构非法返回 unauthorized', async () => {
      findOne.mockResolvedValue(activatedRecord('not-a-base64-key'))
      const info = await service.getLicenseInfo()
      expect(info.status).toBe('unauthorized')
    })
  })

  describe('activateLicense', () => {
    it('验签通过后写入数据库并返回 valid', async () => {
      const payload = validPayload()
      const licenseKey = signPayload(payload)
      create.mockReturnValue({ id: 1, isActivated: true, licenseKey, activatedAt: new Date() })
      save.mockResolvedValue(undefined)

      // activateLicense 内部会再次调用 getLicenseInfo，需返回已激活记录
      findOne.mockResolvedValueOnce(null) // 第一次：查现有记录
      findOne.mockResolvedValueOnce({ id: 1, isActivated: true, licenseKey, activatedAt: new Date() }) // getLicenseInfo

      const info = await service.activateLicense(licenseKey)
      expect(info.status).toBe('valid')
      expect(create).toHaveBeenCalled()
      expect(save).toHaveBeenCalled()
    })

    it('验签失败时抛错', async () => {
      findOne.mockResolvedValue(null)
      await expect(service.activateLicense('invalid-key')).rejects.toThrow()
    })
  })

  describe('isActive', () => {
    it('无记录时为 false', async () => {
      findOne.mockResolvedValue(null)
      expect(await service.isActive()).toBe(false)
    })

    it('valid 时为 true', async () => {
      const payload = validPayload()
      findOne.mockResolvedValue(activatedRecord(signPayload(payload)))
      expect(await service.isActive()).toBe(true)
    })
  })
})
