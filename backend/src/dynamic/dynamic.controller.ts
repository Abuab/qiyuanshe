import {
  Controller,
  Get,
  Query,
  Headers,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { DynamicService } from './dynamic.service'

@Controller('dynamics')
export class DynamicController {
  constructor(
    private readonly dynamicService: DynamicService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  async getDynamics(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('gender') gender?: number,
    @Headers('authorization') auth?: string,
  ) {
    let currentUserId: number | undefined
    try {
      if (auth) {
        const token = auth.replace('Bearer ', '')
        const payload = this.jwtService.verify(token) as any
        currentUserId = payload?.userId || payload?.sub
      }
    } catch { /* 忽略无效 token */ }

    const result = await this.dynamicService.getDynamics(
      page || 1,
      limit || 10,
      currentUserId,
      type,
      gender || undefined,
    )
    return { success: true, ...result }
  }
}
