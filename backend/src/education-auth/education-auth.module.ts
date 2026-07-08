import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserAuth } from '../entities/UserAuth'
import { EducationAuthController } from './education-auth.controller'
import { EducationAuthService } from './education-auth.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [TypeOrmModule.forFeature([UserAuth]), AuthModule],
  controllers: [EducationAuthController],
  providers: [EducationAuthService],
  exports: [EducationAuthService],
})
export class EducationAuthModule {}
