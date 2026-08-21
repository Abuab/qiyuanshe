import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { jwtConfig } from '../config/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ChatMessage, User, AuditLog, UserBlock } from '../entities'
import { ChatMonitorSession } from '../entities/ChatMonitorSession'
import { ChatOperationLog } from '../entities/ChatOperationLog'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { ChatMonitorGateway } from './chat-monitor.gateway'
import { ChatMonitorService } from './chat-monitor.service'
import { AuditModule } from '../audit/audit.module'
import { SystemModule } from '../system/system.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessage,
      User,
      ChatMonitorSession,
      ChatOperationLog,
      AuditLog,
      UserBlock,
    ]),
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    AuditModule,
    SystemModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatMonitorGateway, ChatMonitorService],
  exports: [ChatService, ChatMonitorGateway, ChatMonitorService],
})
export class ChatModule {}
