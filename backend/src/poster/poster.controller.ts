import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common'
import { PosterService } from './poster.service'
import { TrackShareDto, GeneratePosterDto } from './dto'
import { JwtAuthGuard } from '../auth/guards'

@Controller('poster')
export class PosterController {
  constructor(private readonly posterService: PosterService) {}

  @Get('templates')
  async getTemplates() {
    return this.posterService.getTemplates()
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generatePoster(
    @Body() dto: GeneratePosterDto,
    @Request() req: any,
  ) {
    const userId = dto.userId || req.user.id
    const templateId = dto.templateId || 1

    const posterUrl = this.posterService.generatePosterUrl(userId, templateId)

    return {
      success: true,
      posterUrl,
      scene: this.posterService.encodeScene(userId, templateId),
    }
  }

  @Post('track')
  async trackShare(@Body() dto: TrackShareDto, @Request() req: any) {
    const userId = dto.userId || req?.user?.userId

    await this.posterService.trackShare({
      userId,
      templateId: dto.templateId,
      scene: dto.scene,
    })

    return { success: true }
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getPromotionStats(@Request() req: any) {
    const userId = req.user.id
    return this.posterService.getPromotionStats(userId)
  }

  @Post('parse-scene')
  async parseScene(@Body('scene') scene: string) {
    const result = await this.posterService.parseScene(scene)
    return { success: true, data: result }
  }
}
