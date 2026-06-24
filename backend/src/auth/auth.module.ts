import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { User } from '../entities/User'
import { UserAgreement } from '../entities/UserAgreement'
import { Feedback } from '../entities/Feedback'
import { jwtConfig } from '../config/jwt'
import { AgreementLogStorageModule } from '../agreement-log-storage/agreement-log-storage.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserAgreement, Feedback]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: { expiresIn: jwtConfig.expiresIn },
    }),
    AgreementLogStorageModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
