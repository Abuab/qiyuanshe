import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { SuccessCaseService } from './success-case.service'
import { Result } from '../common/result'

@Controller('success-cases')
export class SuccessCaseController {
  constructor(private readonly successCaseService: SuccessCaseService) {}

  /** 小程序端：Banner 配置（需在 :id 之前声明） */
  @Get('banner')
  async getPageBanner() {
    const data = await this.successCaseService.getPageBanner()
    return Result.success(data)
  }

  @Get()
  async getList(@Query('page') page = 1, @Query('limit') limit = 10) {
    const result = await this.successCaseService.getList(+page, +limit)
    return Result.success(result)
  }

  @Get(':id')
  async getDetail(@Param('id', ParseIntPipe) id: number) {
    const item = await this.successCaseService.getDetail(id)
    return Result.success(item)
  }
}

@Controller('admin/success-cases')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles('super_admin', 'matchmaker', 'operator', 'readonly')
export class AdminSuccessCaseController {
  constructor(private readonly successCaseService: SuccessCaseService) {}

  /** Banner 配置（需在 :id 之前声明） */
  @Get('banner')
  async getBannerConfig() {
    const data = await this.successCaseService.getBannerConfig()
    return Result.success(data)
  }

  @Put('banner')
  async saveBannerConfig(@Body() body: { bannerImage?: string; pageTitle?: string }) {
    const data = await this.successCaseService.saveBannerConfig(body)
    return Result.success(data, 'Banner 配置已保存')
  }

  @Get()
  async getList(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('keyword') keyword?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const result = await this.successCaseService.getListAll(+page, +limit, { keyword, dateFrom, dateTo })
    return Result.success(result)
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const item = await this.successCaseService.getById(id)
    return Result.success(item)
  }

  @Post()
  async create(
    @Body() body: {
      title: string
      senderUserId?: number
      displayNickname?: string
      storyContent?: string
      photos?: string[]
      publishDate?: string
      sort?: number
      status?: number
    },
  ) {
    const item = await this.successCaseService.create(body)
    return Result.success(item, '创建成功')
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    const item = await this.successCaseService.update(id, body)
    return Result.success(item, '更新成功')
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.successCaseService.remove(id)
    return Result.success({ id }, '删除成功')
  }
}
