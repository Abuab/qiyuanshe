import { Controller, Get, Query } from '@nestjs/common'
import { RegionService } from './region.service'
import { Result } from '../common/result'

@Controller('region')
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Get()
  async getRegion(@Query('parentId') parentId?: string) {
    const pid = parentId ? parseInt(parentId, 10) : 0
    const list = await this.regionService.getChildren(pid)
    return Result.success(list)
  }
}
