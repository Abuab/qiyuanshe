import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
  ParseIntPipe,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { DynamicService } from './dynamic.service'
import { CreateDynamicDto } from './dto'
import { JwtAuthGuard } from '../auth/guards'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { Result } from '../common/result'

@Controller('dynamics')
export class DynamicController {
  constructor(
    private readonly dynamicService: DynamicService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  async getDynamics(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Headers('authorization') auth?: string,
  ) {
    // 尝试从 JWT 中提取 userId（不强制要求登录）
    let currentUserId: number | undefined
    try {
      if (auth) {
        const token = auth.replace('Bearer ', '')
        const payload = this.jwtService.verify(token) as any
        currentUserId = payload?.userId || payload?.sub
      }
    } catch { /* 忽略无效 token */ }
    const result = await this.dynamicService.getDynamics(
      page || 1,
      limit || 10,
      currentUserId,
    )

    return {
      success: true,
      ...result,
    }
  }

  @Get(':id')
  async getDetail(@Param('id', ParseIntPipe) id: number) {
    const detail = await this.dynamicService.getDynamicDetail(id)
    return { success: true, detail }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createDynamic(
    @Body() dto: CreateDynamicDto,
    @Request() req: any,
  ) {
    const dynamic = await this.dynamicService.createDynamic(
      req.user.userId,
      dto.content,
      dto.images || [],
      dto.totalImages || dto.images?.length || 0,
    )

    return {
      success: true,
      message: '发布成功',
      data: { id: dynamic?.id },
    }
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async toggleLike(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const result = await this.dynamicService.toggleLike(id, req.user.userId)
    return {
      success: true,
      ...result,
    }
  }

  @Get(':id/like-users')
  async getLikeUsers(@Param('id', ParseIntPipe) id: number) {
    const result = await this.dynamicService.getLikeUsers(id)
    return {
      success: true,
      ...result,
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteDynamic(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    await this.dynamicService.deleteDynamic(id, req.user.userId)
    return { success: true, message: '已删除' }
  }
}

@Controller('admin/dynamics')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles('super_admin', 'matchmaker', 'operator', 'readonly')
export class AdminDynamicController {
  constructor(private readonly dynamicService: DynamicService) {}

  @Get()
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const result = await this.dynamicService.getAdminDynamics(+page, +limit)
    return Result.success(result)
  }

  @Put(':id/audit')
  async audit(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: number,
  ) {
    await this.dynamicService.auditDynamic(id, status)
    return Result.success(null, '操作成功')
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.dynamicService.deleteAdminDynamic(id)
    return Result.success(null, '删除成功')
  }
}
