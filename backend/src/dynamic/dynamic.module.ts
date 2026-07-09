import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { jwtConfig } from '../config/jwt'
import { Dynamic } from '../entities/Dynamic'
import { DynamicLike } from '../entities/DynamicLike'
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
import { Follow } from '../entities/Follow'
import { MatchRecord } from '../entities/MatchRecord'
import { Matchmaker } from '../entities/Matchmaker'
import { DynamicController } from './dynamic.controller'
import { DynamicService } from './dynamic.service'
import { SystemModule } from '../system/system.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Dynamic, DynamicLike, User, UserPhoto, Follow, MatchRecord, Matchmaker]),
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    SystemModule,
  ],
  controllers: [DynamicController],
  providers: [DynamicService],
  exports: [DynamicService],
})
export class DynamicModule {}
