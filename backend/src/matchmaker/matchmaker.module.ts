import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Matchmaker } from '../entities/Matchmaker'
import { MatchmakerController } from './matchmaker.controller'
import { MatchmakerService } from './matchmaker.service'

@Module({
  imports: [TypeOrmModule.forFeature([Matchmaker])],
  controllers: [MatchmakerController],
  providers: [MatchmakerService],
  exports: [MatchmakerService],
})
export class MatchmakerModule {}
