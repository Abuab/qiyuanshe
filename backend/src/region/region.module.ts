import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AddressRegion } from '../entities/AddressRegion'
import { RegionController } from './region.controller'
import { RegionService } from './region.service'

@Module({
  imports: [TypeOrmModule.forFeature([AddressRegion])],
  controllers: [RegionController],
  providers: [RegionService],
  exports: [RegionService],
})
export class RegionModule {}
