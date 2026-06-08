import { Controller, Get, Query } from '@nestjs/common'
import { RegionService } from './region.service'
import { Result } from '../common/result'

@Controller('api')
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Get('region')
  async getRegion(@Query('parentId') parentId?: string) {
    const pid = parentId ? parseInt(parentId, 10) : 0
    const list = await this.regionService.getChildren(pid)
    return Result.success(list)
  }
}
