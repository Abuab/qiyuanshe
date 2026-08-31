import 'reflect-metadata'
import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { LicenseGuard } from './license.guard'
import { LicenseService } from './license.service'
import { LicenseException } from './license.exception'

describe('LicenseGuard', () => {
  let getAllAndOverride: jest.Mock
  let getLicenseInfo: jest.Mock
  let guard: LicenseGuard

  const createContext = (handler: object, cls: object): ExecutionContext =>
    ({ getHandler: () => handler, getClass: () => cls }) as unknown as ExecutionContext

  beforeEach(() => {
    getAllAndOverride = jest.fn()
    getLicenseInfo = jest.fn()

    const reflector = { getAllAndOverride } as unknown as Reflector
    const licenseService = { getLicenseInfo } as unknown as LicenseService
    guard = new LicenseGuard(reflector, licenseService)
  })

  it('未标注 @RequireLicense 时放行，且不查询授权状态', async () => {
    getAllAndOverride.mockReturnValue(undefined)
    const result = await guard.canActivate(createContext({}, class {}))
    expect(result).toBe(true)
    expect(getLicenseInfo).not.toHaveBeenCalled()
  })

  it('expired 状态抛出 LICENSE_EXPIRED（403）', async () => {
    getAllAndOverride.mockReturnValue(true)
    getLicenseInfo.mockResolvedValue({ status: 'expired', lockMessage: '已过期' })

    await expect(guard.canActivate(createContext({}, class {}))).rejects.toBeInstanceOf(
      LicenseException,
    )

    try {
      await guard.canActivate(createContext({}, class {}))
    } catch (e) {
      const response = (e as LicenseException).getResponse() as Record<string, unknown>
      expect(response.bizCode).toBe('LICENSE_EXPIRED')
      expect(response.statusCode).toBe(403)
    }
  })

  it('unauthorized 状态抛出 LICENSE_INVALID（403）', async () => {
    getAllAndOverride.mockReturnValue(true)
    getLicenseInfo.mockResolvedValue({ status: 'unauthorized', lockMessage: '' })

    await expect(guard.canActivate(createContext({}, class {}))).rejects.toBeInstanceOf(
      LicenseException,
    )

    try {
      await guard.canActivate(createContext({}, class {}))
    } catch (e) {
      const response = (e as LicenseException).getResponse() as Record<string, unknown>
      expect(response.bizCode).toBe('LICENSE_INVALID')
      expect(response.statusCode).toBe(403)
    }
  })

  it('valid / grace_period 状态放行', async () => {
    getAllAndOverride.mockReturnValue(true)

    getLicenseInfo.mockResolvedValue({ status: 'valid' })
    expect(await guard.canActivate(createContext({}, class {}))).toBe(true)

    getLicenseInfo.mockResolvedValue({ status: 'grace_period' })
    expect(await guard.canActivate(createContext({}, class {}))).toBe(true)
  })
})
