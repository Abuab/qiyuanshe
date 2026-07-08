import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like } from 'typeorm'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'
import { User } from '../entities/User'

@Controller('admin/store-cert')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminStoreCertController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** 所有用户列表（左侧可选用户） */
  @Get('users')
  async getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('keyword') keyword = '',
  ) {
    const [list, total] = await this.userRepo.findAndCount({
      where: [
        { nickname: Like(`%${keyword}%`), isDeleted: 0, status: 2 },
        { phone: Like(`%${keyword}%`), isDeleted: 0, status: 2 },
      ],
      select: ['id', 'nickname', 'avatar', 'phone'],
      order: { id: 'DESC' },
      skip: (+page - 1) * +limit,
      take: +limit,
    })
    return Result.success({ list, total })
  }

  /** 已认证用户列表（右侧已选用户） */
  @Get('members')
  async getMembers() {
    const list = await this.userRepo.find({
      where: { storeCertified: 1, isDeleted: 0 },
      select: ['id', 'nickname', 'avatar', 'phone'],
      order: { id: 'DESC' },
    })
    return Result.success(list)
  }

  /** 添加用户到店认证 */
  @Post('members/:userId')
  async addMember(@Param('userId', ParseIntPipe) userId: number) {
    await this.userRepo.update(userId, { storeCertified: 1 })
    return Result.success(null, '添加成功')
  }

  /** 移除用户到店认证 */
  @Delete('members/:userId')
  async removeMember(@Param('userId', ParseIntPipe) userId: number) {
    await this.userRepo.update(userId, { storeCertified: 0 })
    return Result.success(null, '移除成功')
  }
}
