import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common'
import { MatchmakerService } from './matchmaker.service'

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
}
