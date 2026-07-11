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

      // ========== chat_messages：会话未读数聚合 ==========
      // getConversations() 未读数: WHERE toUserId=? AND isRead=0 GROUP BY fromUserId
      {
        name: 'idx_chat_unread_group',
        sql: `CREATE INDEX idx_chat_unread_group ON chat_messages (toUserId, isRead, fromUserId)`,
      },

      // ========== user_notifications：通知列表 + 未读红点 ==========
      // list(): WHERE userId=? ORDER BY createdAt DESC
      {
        name: 'idx_notif_user_created',
        sql: `CREATE INDEX idx_notif_user_created ON user_notifications (userId, createdAt DESC)`,
      },
      // unreadCount(): WHERE userId=? AND isRead=0
      {
        name: 'idx_notif_user_read',
        sql: `CREATE INDEX idx_notif_user_read ON user_notifications (userId, isRead)`,
      },

      // ========== follows：关注/粉丝列表（真实列名为 snake_case） ==========
      // getFollowing(): WHERE user_id=? ORDER BY created_at DESC
      {
        name: 'idx_follows_user_created',
        sql: `CREATE INDEX idx_follows_user_created ON follows (user_id, created_at DESC)`,
      },
      // getFollowers(): WHERE target_user_id=? ORDER BY created_at DESC
      {
        name: 'idx_follows_target_created',
        sql: `CREATE INDEX idx_follows_target_created ON follows (target_user_id, created_at DESC)`,
      },

      // ========== profile_visits：我看过谁（真实列名为 snake_case） ==========
      // getMyViews(): WHERE visitor_user_id=? GROUP BY user_id ORDER BY MAX(created_at) DESC
      {
        name: 'idx_visits_visitor_created',
        sql: `CREATE INDEX idx_visits_visitor_created ON profile_visits (visitor_user_id, created_at DESC)`,
      },

      // ========== question_answers：问题详情回答列表 / 我的回答 ==========
      // getQuestionDetail(): WHERE questionId=? AND status=1 ORDER BY createdAt DESC
      {
        name: 'idx_qa_question_status_time',
        sql: `CREATE INDEX idx_qa_question_status_time ON question_answers (questionId, status, createdAt DESC)`,
      },
      // getUserAnswers(): WHERE userId=? ORDER BY createdAt DESC
      {
        name: 'idx_qa_user_created',
        sql: `CREATE INDEX idx_qa_user_created ON question_answers (userId, createdAt DESC)`,
      },

      // ========== dynamics：问答动态时间线 ==========
      // getAnswerDynamics(): WHERE type='answer' ORDER BY createdAt DESC
      {
        name: 'idx_dynamic_type_time',
        sql: `CREATE INDEX idx_dynamic_type_time ON dynamics (type, createdAt DESC)`,
      },

      // ========== circle_posts：圈子帖子列表 ==========
      // getPosts(): WHERE circleId=? AND status=1 ORDER BY createdAt DESC
      {
        name: 'idx_circle_posts_list',
        sql: `CREATE INDEX idx_circle_posts_list ON circle_posts (circleId, status, createdAt DESC)`,
      },

      // ========== circle_members：圈子成员排序 ==========
      // getCircleUsers(): WHERE circleId=? ORDER BY sortOrder ASC
      {
        name: 'idx_circle_members_sort',
        sql: `CREATE INDEX idx_circle_members_sort ON circle_members (circleId, sortOrder)`,
      },

      // ========== matchmaker_comments：红娘评价批量查询 ==========
      // WHERE userId IN (...) AND status=1 ORDER BY createdAt DESC
      {
        name: 'idx_mm_comments_user',
        sql: `CREATE INDEX idx_mm_comments_user ON matchmaker_comments (userId, status, createdAt DESC)`,
      },

      // ========== user_photos：用户相册批量查询（极高频） ==========
      // WHERE userId IN (...) ORDER BY sortOrder ASC
      {
        name: 'idx_user_photos_user_sort',
        sql: `CREATE INDEX idx_user_photos_user_sort ON user_photos (userId, sortOrder)`,
      },

      // ========== activities：活动列表 ==========
      // getActivityList(): WHERE isActive=1 ORDER BY sortOrder ASC, createdAt DESC
      {
        name: 'idx_activities_list',
        sql: `CREATE INDEX idx_activities_list ON activities (isActive, sortOrder, createdAt DESC)`,
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
