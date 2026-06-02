import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User, UserPhoto, Follow, Notice, Report } from '../entities'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { UserNoticeController } from './notice.controller'

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPhoto, Follow, Notice, Report])],
  controllers: [UserController, UserNoticeController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
