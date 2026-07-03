import { SetMetadata } from '@nestjs/common'
import { AdminRole } from '../shared/enums'

export const Roles = (...roles: AdminRole[]) => SetMetadata('roles', roles)
