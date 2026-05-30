import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ChatMessage, User, Follow } from '../entities'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessage,
      User,
      Follow,
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
