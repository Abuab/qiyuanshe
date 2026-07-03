import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Notice } from '../entities/Notice'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

@Controller('admin/notices')
@Roles(AdminRole.SUPER_ADMIN)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminNoticeController {
  constructor(
    @InjectRepository(Notice)
    private readonly repo: Repository<Notice>,
  ) {}

  @Get()
  async list(@Query() q: any) {
    const page = parseInt(q.page) || 1
    const limit = parseInt(q.limit) || 20
    const where: any = {}
    if (q.status !== undefined && q.status !== '') {
      where.status = parseInt(q.status)
    }
    const [list, total] = await this.repo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return Result.success({ list, total, page, limit })
  }

  @Post()
  async create(@Body() body: Partial<Notice>) {
    const notice = await this.repo.save(this.repo.create(body))
    return Result.success(notice, '创建成功')
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<Notice>,
  ) {
    await this.repo.update(id, body)
    return Result.success(null, '更新成功')
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.repo.delete(id)
    return Result.success(null, '删除成功')
  }
}
