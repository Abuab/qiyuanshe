import { Controller, Get, Put, Delete, Param, ParseIntPipe, Query, UseGuards, Request } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserNotification } from '../entities/UserNotification'
import { JwtAuthGuard } from '../auth/guards'
import { Result } from '../common/result'

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class UserNotificationController {
  constructor(
    @InjectRepository(UserNotification)
    private readonly repo: Repository<UserNotification>,
  ) {}

  @Get()
  async list(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    const p = parseInt(page as string, 10) || 1
    const l = parseInt(limit as string, 10) || 20

    const [list, total] = await this.repo.findAndCount({
      where: { userId: req.user.userId },
      order: { createdAt: 'DESC' },
      skip: (p - 1) * l,
      take: l,
    })

    const unreadCount = await this.repo.count({
      where: { userId: req.user.userId, isRead: 0 },
    })

    return Result.success({
      list: list.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        isRead: n.isRead,
        createdAt: n.createdAt,
        type: 'system' as const,
      })),
      total,
      unreadCount,
    })
  }

  @Put(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.repo.update(
      { id, userId: req.user.userId },
      { isRead: 1 },
    )
    return Result.success(null, '已读')
  }

  @Put('read-all')
  async markAllAsRead(@Request() req: any) {
    await this.repo.update(
      { userId: req.user.userId, isRead: 0 },
      { isRead: 1 },
    )
    return Result.success(null, '全部已读')
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.repo.delete({ id, userId: req.user.userId })
    return Result.success(null, '已删除')
  }
}
