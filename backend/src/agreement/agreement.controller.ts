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
import { AgreementService } from './agreement.service'
import { CreateAgreementDto, UpdateAgreementDto } from './dto'
import { AgreementType } from '../entities/Agreement'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { SystemService } from '../system/system.service'

@Controller()
export class AgreementController {
  constructor(
    private readonly agreementService: AgreementService,
    private readonly systemService: SystemService,
  ) {}

  /**
   * 小程序端：获取当前生效的协议
   * GET /agreement?type=USER_AGREEMENT
   */
  @Get('agreement')
  async getActive(@Query('type') type: AgreementType) {
    const agreement = await this.agreementService.getActive(type)
    if (!agreement) return null
    // 替换模板变量 {{appName}}
    agreement.content = await this.systemService.replaceTemplateVars(agreement.content)
    return agreement
  }

  /**
   * 管理后台：获取协议列表
   * GET /admin/agreements
   */
  @Get('admin/agreements')
  @UseGuards(AdminJwtAuthGuard)
  async findAll() {
    return this.agreementService.findAll()
  }

  /**
   * 管理后台：创建/更新协议
   * POST /admin/agreements
   */
  @Post('admin/agreements')
  @UseGuards(AdminJwtAuthGuard)
  async createOrUpdate(@Body() dto: CreateAgreementDto) {
    return this.agreementService.createOrUpdate(dto)
  }

  /**
   * 管理后台：更新指定协议
   * PUT /admin/agreements/:id
   */
  @Put('admin/agreements/:id')
  @UseGuards(AdminJwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAgreementDto,
  ) {
    return this.agreementService.update(id, dto)
  }

  /**
   * 管理后台：删除协议
   * DELETE /admin/agreements/:id
   */
  @Delete('admin/agreements/:id')
  @UseGuards(AdminJwtAuthGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.agreementService.remove(id)
    return { success: true, message: '删除成功' }
  }
}
