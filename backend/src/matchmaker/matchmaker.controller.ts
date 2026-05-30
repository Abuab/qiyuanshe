import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common'
import { MatchmakerService } from './matchmaker.service'
import { CreateMatchmakerDto, UpdateMatchmakerDto } from './dto'
import { JwtAuthGuard } from '../auth/guards'

@Controller('matchmakers')
export class MatchmakerController {
  constructor(private readonly matchmakerService: MatchmakerService) {}

  @Get()
  async findAll() {
    return this.matchmakerService.findAll()
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.matchmakerService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateMatchmakerDto) {
    return this.matchmakerService.create(dto)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMatchmakerDto,
  ) {
    return this.matchmakerService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.matchmakerService.remove(id)
    return { success: true, message: '删除成功' }
  }

  @Put(':id/sort')
  @UseGuards(JwtAuthGuard)
  async updateSortOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body('sortOrder') sortOrder: number,
  ) {
    return this.matchmakerService.updateSortOrder(id, sortOrder)
  }
}
