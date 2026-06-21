import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

/**
 * 数据库索引初始化服务
 * 在应用启动时自动创建缺失的性能索引，避免生产环境每次重启执行 synchronize
 */
@Injectable()
export class DatabaseIndexService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseIndexService.name)

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    if (process.env.DB_SKIP_AUTO_INDEX === 'true') {
      this.logger.debug('[Index] 已跳过自动索引创建')
      return
    }

    try {
      await this.createIndexes()
    } catch (e: any) {
      this.logger.error(`[Index] 索引创建失败: ${e?.message}`)
    }
  }

  private async createIndexes() {
    const indexes: Array<{ name: string; sql: string }> = [
      // ========== chat_messages：会话查询优化 ==========
      // 功能索引：按 (LEAST(f,t), GREATEST(f,t)) 排序获取每对用户最新消息
      {
        name: 'idx_chat_pair_latest',
        sql: `CREATE INDEX idx_chat_pair_latest ON chat_messages ((LEAST(fromUserId, toUserId)), (GREATEST(fromUserId, toUserId)), id DESC)`,
      },
      // 复合索引：查询单用户的收发消息
      {
        name: 'idx_chat_from_created',
        sql: `CREATE INDEX idx_chat_from_created ON chat_messages (fromUserId, createdAt DESC)`,
      },
      {
        name: 'idx_chat_to_created',
        sql: `CREATE INDEX idx_chat_to_created ON chat_messages (toUserId, createdAt DESC)`,
      },
      // ========== notify_logs：通知查询优化 ==========
      {
        name: 'idx_notify_channel',
        sql: `CREATE INDEX idx_notify_channel ON notify_logs (channel, createdAt DESC)`,
      },
      {
        name: 'idx_notify_source',
        sql: `CREATE INDEX idx_notify_source ON notify_logs (source, createdAt DESC)`,
      },
      // ========== dynamics：动态时间线 ==========
      {
        name: 'idx_dynamic_user_time',
        sql: `CREATE INDEX idx_dynamic_user_time ON dynamics (userId, createdAt DESC)`,
      },
      // ========== users：推荐/搜索优化 ==========
      {
        name: 'idx_users_status_created',
        sql: `CREATE INDEX idx_users_status_created ON users (status, createdAt DESC)`,
      },
      {
        name: 'idx_users_gender_status',
        sql: `CREATE INDEX idx_users_gender_status ON users (gender, status)`,
      },
      {
        name: 'idx_users_is_deleted',
        sql: `CREATE INDEX idx_users_is_deleted ON users (isDeleted, status)`,
      },
      // ========== chat_monitor_sessions ==========
      {
        name: 'idx_monitor_op_created',
        sql: `CREATE INDEX idx_monitor_op_created ON chat_monitor_sessions (operatorId, createdAt DESC)`,
      },
      // ========== chat_operation_logs ==========
      {
        name: 'idx_oplog_created',
        sql: `CREATE INDEX idx_oplog_created ON chat_operation_logs (createdAt DESC)`,
      },
    ]

    let created = 0
    for (const idx of indexes) {
      try {
        await this.dataSource.query(idx.sql)
        created++
      } catch (e: any) {
        // ER_DUP_KEYNAME (1061) = 索引已存在，忽略
        const code = e?.code || e?.sqlState
        if (code === 'ER_DUP_KEYNAME' || e?.errno === 1061) {
          // 索引已存在，跳过
        } else {
          this.logger.warn(`[Index] 创建 ${idx.name} 失败: ${e?.message}`)
        }
      }
    }

    if (created > 0) {
      this.logger.log(`[Index] 已创建 ${created}/${indexes.length} 个索引`)
    }
  }
}
