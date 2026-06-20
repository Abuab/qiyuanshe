import { Controller, Get, Post, Put, Delete, Body, Query, Param, Req, UseGuards, ParseIntPipe } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { AiProviderConfigService } from './ai-provider-config.service'
import { AiProviderSelector } from './ai-provider-selector.service'
import { AiProviderBalanceService } from './ai-provider-balance.service'
import { AiProviderStatsService } from './ai-provider-stats.service'
import { LoadBalanceStrategy } from '../entities/AiProviderConfig'
import { ProviderConfigInput, SwitchProviderInput } from './ai-provider.types'
import { Result } from '../common/result'

/**
 * 管理后台：AI Provider 多源管理接口
 */
@Controller('admin/ai/provider')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles('super_admin')
export class AdminAiProviderController {
  constructor(
    private readonly configService: AiProviderConfigService,
    private readonly selector: AiProviderSelector,
    private readonly balanceService: AiProviderBalanceService,
    private readonly statsService: AiProviderStatsService,
  ) {}

  // ==================== Provider 配置 CRUD ====================

  /** 获取所有 Provider 配置列表 */
  @Get('list')
  async getProviderList() {
    const data = await this.configService.getAll()
    return Result.success(data)
  }

  /** 新增 Provider */
  @Post('create')
  async createProvider(@Body() input: ProviderConfigInput, @Req() req: any) {
    const operatorId = req.user?.id
    const data = await this.configService.create(input, operatorId)
    return Result.success(data, 'Provider 已添加')
  }

  /** 编辑 Provider */
  @Put(':id')
  async updateProvider(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: Partial<ProviderConfigInput>,
    @Req() req: any,
  ) {
    const operatorId = req.user?.id
    const data = await this.configService.update(id, input, operatorId)
    return Result.success(data, 'Provider 已更新')
  }

  /** 删除 Provider（软删除） */
  @Delete(':id')
  async deleteProvider(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const operatorId = req.user?.id
    await this.configService.remove(id, operatorId)
    return Result.success(null, 'Provider 已删除')
  }

  /** 设为默认 Provider */
  @Put(':id/set-default')
  async setDefaultProvider(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const operatorId = req.user?.id
    await this.configService.setDefault(id, operatorId)
    return Result.success(null, '已设为默认 Provider')
  }

  // ==================== 同步 Redis ====================

  /** 手动同步所有 Provider 配置到 Redis */
  @Post('sync-redis')
  async syncToRedis() {
    await this.configService.syncToRedis()
    return Result.success(null, 'Redis 缓存已同步')
  }

  // ==================== 负载均衡策略 ====================

  /** 获取当前负载均衡策略 */
  @Get('strategy')
  async getStrategy() {
    const data = await this.configService.getStrategy()
    return Result.success(data)
  }

  /** 切换负载均衡策略 */
  @Put('strategy')
  async setStrategy(
    @Body('strategy') strategy: LoadBalanceStrategy,
    @Req() req: any,
  ) {
    const operatorId = req.user?.id
    await this.configService.setStrategy(strategy, operatorId)
    return Result.success(null, `策略已切换为: ${strategy}`)
  }

  // ==================== 故障与冷却 ====================

  /** 获取冷却中的 Provider 列表 */
  @Get('cooldown-list')
  async getCooldownList() {
    const ids = await this.selector.getCooldownList()
    return Result.success({ count: ids.length, ids })
  }

  /** 手动恢复故障 Provider */
  @Post(':id/recover')
  async recoverProvider(@Param('id', ParseIntPipe) id: number) {
    await this.selector.recover(id)
    return Result.success(null, 'Provider 已手动恢复')
  }

  // ==================== 余额监控 ====================

  /** 获取余额告警记录列表 */
  @Get('balance/alerts')
  async getBalanceAlerts() {
    const data = await this.balanceService.getAlerts()
    return Result.success(data)
  }

  /** 手动触发余额查询 */
  @Post('balance/query/:id')
  async queryProviderBalance(@Param('id', ParseIntPipe) id: number) {
    const data = await this.balanceService.queryProviderBalance(id)
    return Result.success(data)
  }

  /** 手动触发全部余额检查 */
  @Post('balance/check-all')
  async checkAllBalances() {
    const data = await this.balanceService.checkAllBalances()
    return Result.success(data)
  }

  // ==================== 成本统计 ====================

  /** 获取成本统计摘要（管理后台仪表盘） */
  @Get('stats/summary')
  async getStatsSummary() {
    const data = await this.statsService.getSummary()
    return Result.success(data)
  }

  /** 获取今日成本统计 */
  @Get('stats/daily')
  async getDailyStats() {
    const data = await this.statsService.getDailyStats()
    return Result.success(data)
  }

  /**
   * 按时间范围统计成本
   * Query: startDate=2026-06-01&endDate=2026-06-20
   */
  @Get('stats/cost')
  async getCostStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0))
    const end = endDate ? new Date(endDate) : new Date()
    const data = await this.statsService.getCostStats(start, end)
    return Result.success(data)
  }

  /** 按功能类型统计调用分布 */
  @Get('stats/call-types')
  async getCallTypeStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0))
    const end = endDate ? new Date(endDate) : new Date()
    const data = await this.statsService.getCallTypeStats(start, end)
    return Result.success(data)
  }

  // ==================== 调用日志 ====================

  /**
   * 获取调用日志（分页）
   * Query: page=1&limit=20&providerId=&callType=&status=&startDate=&endDate=
   */
  @Get('call-logs')
  async getCallLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('providerId') providerId?: number,
    @Query('callType') callType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // 按需引入 Repository（由 Controller 所在 Module 注入）
    // 此处通过 statsService 间接查询
    // 简化实现：返回提示说明调用日志通过成本统计接口获取
    return Result.success({
      message: '调用日志详细数据请查看成本统计报表，或通过数据库直接查询 ai_provider_call_logs 表',
    })
  }
}
