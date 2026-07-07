import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { AdminRole } from '../shared/enums'
import { Result } from '../common/result'
import { AiPromptTemplateService } from './ai-prompt-template.service'

/**
 * 管理后台：AI Prompt 模板配置（性格解读 / 匹配建议 / 分享文案）
 */
@Controller('admin/ai/prompt-templates')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR)
export class AdminAiPromptController {
  constructor(private readonly service: AiPromptTemplateService) {}

  @Get()
  async list() {
    return Result.success(await this.service.getAll())
  }

  @Put()
  async save(@Body() body: any) {
    await this.service.save(body?.templates)
    return Result.success(null, '保存成功')
  }
}
