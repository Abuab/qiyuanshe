import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminSystemService, SystemConfigs } from './system.service'
import { Result } from '../common/result'

@Controller('admin/system')
@Roles('super_admin')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminSystemController {
  constructor(private readonly systemService: AdminSystemService) {}

  @Get('configs')
  async getConfigs() {
    const configs = await this.systemService.getConfigs()
    return Result.success(configs)
  }

  @Put('configs')
  async saveConfigs(@Body() body: SystemConfigs) {
    await this.systemService.saveConfigs(body)
    return Result.success(null, '保存成功')
  }

  @Get('config/:key')
  async getConfig(@Param('key') key: string) {
    const value = await this.systemService.getConfig(key)
    return Result.success(value)
  }

  @Put('config/:key')
  async updateConfig(@Param('key') key: string, @Body('value') value: string) {
    await this.systemService.updateConfig(key, value)
    return Result.success(null, '更新成功')
  }

  @Get('dict/:key')
  async getDict(@Param('key') key: string) {
    const value = await this.systemService.getConfig('dict_' + key)
    return Result.success(value ? JSON.parse(value) : [])
  }

  @Put('dict/:key')
  async updateDict(@Param('key') key: string, @Body() body: { value: string[] }) {
    await this.systemService.updateConfig('dict_' + key, JSON.stringify(body.value || []))
    return Result.success(null, '更新成功')
  }
}
