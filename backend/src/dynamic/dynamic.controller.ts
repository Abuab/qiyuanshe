import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common'
import { DynamicService } from './dynamic.service'
import { CreateDynamicDto } from './dto'
import { JwtAuthGuard } from '../auth/guards'

@Controller('dynamics')
export class DynamicController {
  constructor(private readonly dynamicService: DynamicService) {}

  @Get()
  async getDynamics(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.dynamicService.getDynamics(
      page || 1,
      limit || 10,
    )

    return {
      success: true,
      ...result,
    }
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
