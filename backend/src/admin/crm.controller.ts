import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminCrmService, CRM_STAGE_LABELS } from './crm.service'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

@Controller('admin/crm')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminCrmController {
  constructor(private readonly crmService: AdminCrmService) {}

  /** 客户列表 */
  @Get('customers')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async customers(@Query() filter: any) {
    const data = await this.crmService.listCustomers(filter)
    return Result.success(data)
  }

  /** 销售漏斗统计 */
  @Get('funnel')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async funnel() {
    const data = await this.crmService.funnel()
    return Result.success(data)
  }

  /** 阶段标签（供前端下拉使用） */
  @Get('stages')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async stages() {
    return Result.success(
      Object.entries(CRM_STAGE_LABELS).map(([value, label]) => ({ value: Number(value), label })),
    )
  }

  /** 可分配负责人列表 */
  @Get('admins')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async admins() {
    const data = await this.crmService.listAssignableAdmins()
    return Result.success(data)
  }

  /** 线索分配 */
  @Put('assign')
  async assign(@Body() body: { userIds: number[]; ownerId: number }) {
    const data = await this.crmService.assign(body?.userIds, body?.ownerId)
    return Result.success(data, '分配成功')
  }

  /** 某客户跟进记录 */
  @Get('follow-records')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async followRecords(
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    const data = await this.crmService.listFollowRecords(userId)
    return Result.success(data)
  }

  /** 新增跟进记录 */
  @Post('follow-records')
  async createFollowRecord(
    @Req() req: any,
    @Body() body: { userId: number; content: string; nextFollowAt?: string; stage?: number },
  ) {
    const data = await this.crmService.createFollowRecord(req.user?.id, body)
    return Result.success(data, '跟进记录已保存')
  }

  /** 红娘工作台 */
  @Get('workspace')
  async workspace(@Req() req: any) {
    const data = await this.crmService.workspace(req.user?.id)
    return Result.success(data)
  }
}
