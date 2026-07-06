import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SystemModule } from '../system/system.module'
import { PersonalityDimension } from './entities/PersonalityDimension'
import { PersonalityQuestion } from './entities/PersonalityQuestion'
import { PersonalityOption } from './entities/PersonalityOption'
import { PersonalityType } from './entities/PersonalityType'
import { PersonalityAnswerRecord } from './entities/PersonalityAnswerRecord'
import { PersonalityResult } from './entities/PersonalityResult'
import { PersonalityDimensionService } from './personality-dimension.service'
import { PersonalityQuestionService } from './personality-question.service'
import { PersonalityTypeService } from './personality-type.service'
import { PersonalityConfigService } from './personality-config.service'
import { PersonalityGuestService } from './personality-guest.service'
import { PersonalityUserService } from './personality-user.service'
import { PersonalityMatchService } from './personality-match.service'
import { PersonalityTestSeeder } from './personality-test.seeder'
import { AdminPersonalityDimensionController } from './admin-personality-dimension.controller'
import { AdminPersonalityQuestionController } from './admin-personality-question.controller'
import { AdminPersonalityTypeController } from './admin-personality-type.controller'
import { PublicPersonalityController } from './public-personality.controller'

/**
 * 人格测试模块
 *
 * 通过 TypeOrmModule.forFeature 注册实体，配合根模块的 autoLoadEntities:true
 * 自动加载到数据库连接，无需修改 users 等既有表结构。
 * RedisService 由根模块（@Global）提供，无需在此重复声明。
 */
@Module({
  imports: [
    SystemModule,
    TypeOrmModule.forFeature([
      PersonalityDimension,
      PersonalityQuestion,
      PersonalityOption,
      PersonalityType,
      PersonalityAnswerRecord,
      PersonalityResult,
    ]),
  ],
  controllers: [
    AdminPersonalityDimensionController,
    AdminPersonalityQuestionController,
    AdminPersonalityTypeController,
    PublicPersonalityController,
  ],
  providers: [
    PersonalityDimensionService,
    PersonalityQuestionService,
    PersonalityTypeService,
    PersonalityConfigService,
    PersonalityGuestService,
    PersonalityUserService,
    PersonalityMatchService,
    PersonalityTestSeeder,
  ],
  exports: [
    PersonalityDimensionService,
    PersonalityQuestionService,
    PersonalityTypeService,
    PersonalityMatchService,
  ],
})
export class PersonalityTestModule {}
