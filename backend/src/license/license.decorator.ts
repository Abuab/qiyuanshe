import { SetMetadata } from '@nestjs/common'

/** LicenseGuard 读取的元数据 key */
export const REQUIRE_LICENSE_KEY = 'require_license'

/**
 * 标记接口需要有效的授权状态。
 * 授权过期（expired）/ 未授权（unauthorized）时被全局 LicenseGuard 拦截，
 * 返回 HTTP 403 + bizCode（LICENSE_EXPIRED / LICENSE_INVALID）。
 */
export const RequireLicense = () => SetMetadata(REQUIRE_LICENSE_KEY, true)
