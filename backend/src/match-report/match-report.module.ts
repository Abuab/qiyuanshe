import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MatchAnalysisReport } from '../entities/MatchAnalysisReport'
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
import { UserTagSelection } from '../entities/UserTagSelection'
import { SystemModule } from '../system/system.module'
import { WechatQrService } from '../personality-test/wechat-qr.service'
import { MatchReportController } from './match-report.controller'
import { MatchReportService } from './match-report.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchAnalysisReport, User, UserPhoto, UserTagSelection]),
    SystemModule,
  ],
  controllers: [MatchReportController],
  providers: [MatchReportService, WechatQrService],
  exports: [MatchReportService],
})
export class MatchReportModule {}
