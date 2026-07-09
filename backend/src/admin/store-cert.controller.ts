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

  /** 所有用户列表（左侧可选用户）—— 与圈子管理 getAllUsers 一致 */
  @Get('users')
  async getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('keyword') keyword = '',
  ) {
    const offset = (+page - 1) * +limit
    const kw = keyword.trim()
    let whereClause = 'WHERE u.isDeleted = 0 AND u.status = 1'
    const params: any[] = []

    if (kw.length > 0) {
      whereClause += ' AND (u.nickname LIKE ? OR u.userId LIKE ?)'
      params.push(`%${kw}%`, `%${kw}%`)
    }

    const [rows, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT u.id, u.userId, u.nickname, u.avatar, u.gender, u.birthYear, u.phone
         FROM users u
         ${whereClause}
         ORDER BY u.id DESC
         LIMIT ? OFFSET ?`,
        [...params, +limit, offset],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) as total FROM users u ${whereClause}`,
        [...params],
      ),
    ])

    const currentYear = new Date().getFullYear()
    const list = rows.map((row: any) => ({
      id: row.id,
      publicUserId: row.userId || '',
      nickname: row.nickname,
      avatar: row.avatar,
      gender: row.gender,
      age: row.birthYear ? currentYear - row.birthYear : null,
      phone: row.phone,
    }))

    return Result.success({
      list,
      total: Number(countResult[0]?.total || 0),
      page: +page,
      limit: +limit,
    })
  }

  /** 已认证用户列表（右侧已选用户） */
  @Get('members')
  async getMembers() {
    const currentYear = new Date().getFullYear()
    const rows = await this.dataSource.query(
      `SELECT u.id, u.userId, u.nickname, u.avatar, u.gender, u.birthYear, u.phone
       FROM users u
       WHERE u.store_certified = 1 AND u.isDeleted = 0
       ORDER BY u.id DESC`,
    )

    const list = rows.map((row: any) => ({
      id: row.id,
      publicUserId: row.userId || '',
      nickname: row.nickname,
      avatar: row.avatar,
      gender: row.gender,
      age: row.birthYear ? currentYear - row.birthYear : null,
      phone: row.phone,
    }))

    return Result.success(list)
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
