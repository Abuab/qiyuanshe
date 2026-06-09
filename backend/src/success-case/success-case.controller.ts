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

  @Get()
  async getList(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const result = await this.successCaseService.getListAll(+page, +limit)
    return Result.success(result)
  }

  @Post()
  async create(
    @Body() body: {
      title: string; cover: string; maleUserId: number; femaleUserId: number;
      storyContent: string; photos: string[]; sort: number
    },
  ) {
    const item = await this.successCaseService.create(body)
    return Result.success(item)
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    const item = await this.successCaseService.update(id, body)
    return Result.success(item)
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.successCaseService.remove(id)
    return Result.success(null, '删除成功')
  }
}
