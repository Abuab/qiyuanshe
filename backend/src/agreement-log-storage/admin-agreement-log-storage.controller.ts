import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Response } from 'express'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { AgreementLogStorageService } from './agreement-log-storage.service'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

/**
 * 管理后台：协议日志存储配置 & 日志查询
 */
@Controller('admin/agreement-log-storage')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles(AdminRole.SUPER_ADMIN)
export class AdminAgreementLogStorageController {
  constructor(private readonly service: AgreementLogStorageService) {}

  /**
   * 获取存储配置
   * GET /admin/agreement-log-storage/config
   */
  @Get('config')
  async getConfig() {
    const config = this.service.getConfigForAdmin()
    return Result.success(config)
  }

  /**
   * 更新存储配置
   * PUT /admin/agreement-log-storage/config
   * Body: { storageType, localBackup, slsProject, slsLogstore, slsEndpoint, slsAccessKeyId, slsAccessKeySecret }
   */
  @Put('config')
  async updateConfig(@Body() body: any) {
    const config = await this.service.updateConfig(body)
    return Result.success(config, '配置已更新')
  }

  /**
   * 测试 SLS 连接
   * POST /admin/agreement-log-storage/config/test
   * Body: { slsProject, slsLogstore, slsEndpoint, slsAccessKeyId, slsAccessKeySecret }
   */
  @Post('config/test')
  async testConnection(@Body() body: any) {
    const ok = await this.service.testSlsConnection(body)
    return Result.success({
      success: ok,
      message: ok ? 'SLS 连接正常' : 'SLS 连接失败，请检查配置',
    })
  }

  /**
   * 查询同意记录
   * GET /admin/agreement-log-storage/logs?userId=&agreementType=&startTime=&endTime=&page=1&pageSize=20
   */
  @Get('logs')
  async getLogs(
    @Query('userId') userId?: string,
    @Query('agreementType') agreementType?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.service.queryLogs({
      userId: userId ? parseInt(userId, 10) : undefined,
      agreementType,
      startTime,
      endTime,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    })
    return Result.success(result)
  }

  /**
   * 导出同意记录 CSV
   * GET /admin/agreement-log-storage/logs/export?userId=&startTime=&endTime=
   */
  @Get('logs/export')
  async exportLogs(
    @Query('userId') userId?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.service.exportLogs({
      userId: userId ? parseInt(userId, 10) : undefined,
      startTime,
      endTime,
    })
    res?.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res?.setHeader(
      'Content-Disposition',
      `attachment; filename="agreement-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    )
    res?.send(buffer)
  }

  /**
   * 跨策略迁移数据
   * POST /admin/agreement-log-storage/migrate
   * Body: { from: 'local'|'sls', to: 'local'|'sls' }
   */
  @Post('migrate')
  async migrate(@Body() body: { from: string; to: string }) {
    const result = await this.service.migrate(
      body.from as any,
      body.to as any,
    )
    return Result.success(result, `已迁移 ${result.migrated} 条记录`)
  }
}
