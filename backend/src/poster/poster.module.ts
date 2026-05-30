import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditLog } from '../entities/AuditLog'
import { PosterController } from './poster.controller'
import { PosterService } from './poster.service'

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [PosterController],
  providers: [PosterService],
  exports: [PosterService],
})
export class PosterModule {}
