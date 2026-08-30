import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Matchmaker } from '../entities/Matchmaker'
import { HotQuestion } from '../entities/HotQuestion'
import { MessageTemplate } from '../entities/MessageTemplate'
import { OperationTag } from '../entities/OperationTag'
import { QuickQuestion } from '../entities/QuickQuestion'
import { QuickQuestionCategory } from '../entities/QuickQuestionCategory'
import { ConfigSeederService } from './config-seeder.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Matchmaker,
      HotQuestion,
      MessageTemplate,
      OperationTag,
      QuickQuestion,
      QuickQuestionCategory,
    ]),
  ],
  providers: [ConfigSeederService],
})
export class ConfigSeedModule {}
