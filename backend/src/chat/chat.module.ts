import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ChatMessage, User } from '../entities'
import { ChatMonitorSession } from '../entities/ChatMonitorSession'
import { ChatOperationLog } from '../entities/ChatOperationLog'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { ChatMonitorGateway } from './chat-monitor.gateway'
import { ChatMonitorService } from './chat-monitor.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessage,
      User,
      ChatMonitorSession,
      ChatOperationLog,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'qiyuanshe-jwt-secret-key-2024',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatMonitorGateway, ChatMonitorService],
  exports: [ChatService, ChatMonitorGateway, ChatMonitorService],
})
export class ChatModule {}
