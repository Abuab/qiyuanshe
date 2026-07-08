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
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

@Controller('admin/store-cert')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminStoreCertController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /** 所有用户列表（左侧可选用户） */
  @Get('users')
  async getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('keyword') keyword = '',
  ) {
    const offset = (+page - 1) * +limit
    const keywordLike = `%${keyword}%`

    const [rows, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT id, nickname, avatar, phone FROM users
         WHERE isDeleted = 0 AND status = 2
         AND (nickname LIKE ? OR phone LIKE ?)
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [keywordLike, keywordLike, +limit, offset],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) as total FROM users
         WHERE isDeleted = 0 AND status = 2
         AND (nickname LIKE ? OR phone LIKE ?)`,
        [keywordLike, keywordLike],
      ),
    ])

    return Result.success({
      list: rows,
      total: Number(countResult[0]?.total || 0),
    })
  }

  /** 已认证用户列表（右侧已选用户） */
  @Get('members')
  async getMembers() {
    const rows = await this.dataSource.query(
      `SELECT id, nickname, avatar, phone FROM users
       WHERE store_certified = 1 AND isDeleted = 0
       ORDER BY id DESC`,
    )
    return Result.success(rows)
  }

  /** 添加用户到店认证 */
  @Post('members/:userId')
  async addMember(@Param('userId', ParseIntPipe) userId: number) {
    await this.dataSource.query(
      `UPDATE users SET store_certified = 1 WHERE id = ?`,
      [userId],
    )
    return Result.success(null, '添加成功')
  }

  /** 移除用户到店认证 */
  @Delete('members/:userId')
  async removeMember(@Param('userId', ParseIntPipe) userId: number) {
    await this.dataSource.query(
      `UPDATE users SET store_certified = 0 WHERE id = ?`,
      [userId],
    )
    return Result.success(null, '移除成功')
  }
}
