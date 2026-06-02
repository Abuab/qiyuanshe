import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Activity } from '../entities/Activity'
import { ActivitySignup } from '../entities/ActivitySignup'
import { User } from '../entities/User'
import { AdminModule } from '../admin/admin.module'
import { ActivityService } from './activity.service'
import { ActivityController, AdminActivityController, AdminSignupController } from './activity.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Activity, ActivitySignup, User]), AdminModule],
  controllers: [ActivityController, AdminActivityController, AdminSignupController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
