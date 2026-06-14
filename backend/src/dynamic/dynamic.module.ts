import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { Dynamic } from '../entities/Dynamic'
import { DynamicLike } from '../entities/DynamicLike'
import { User } from '../entities/User'
import { DynamicController } from './dynamic.controller'
import { DynamicService } from './dynamic.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Dynamic, DynamicLike, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'qiyuanshe-jwt-secret-key-2024',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [DynamicController],
  providers: [DynamicService],
  exports: [DynamicService],
})
export class DynamicModule {}
