import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 补充数据库中缺失的索引和唯一约束
 * 提升高频查询性能，防止重复数据
 *
 * 幂等 + 容错：
 * - 索引已存在则跳过（历史环境可能已由运行时索引服务/手工创建）
 * - 单条创建失败（如唯一约束遇到历史重复数据）仅告警并继续，不中断整条迁移链
 *   （对于因重复数据未能建立的唯一约束，需另行清洗数据后单独补建）
 */
export class AddMissingIndexes1751558400000 implements MigrationInterface {
  name = 'AddMissingIndexes1751558400000'

  private readonly indexes: Array<{ table: string; name: string; ddl: string }> = [
    // ========== 用户表复合/单列索引 ==========
    { table: 'users', name: 'IDX_users_gender_status_deleted', ddl: 'ALTER TABLE `users` ADD INDEX `IDX_users_gender_status_deleted` (`gender`, `status`, `isDeleted`)' },
    { table: 'users', name: 'IDX_users_isVip', ddl: 'ALTER TABLE `users` ADD INDEX `IDX_users_isVip` (`isVip`)' },
    { table: 'users', name: 'IDX_users_vipLevel', ddl: 'ALTER TABLE `users` ADD INDEX `IDX_users_vipLevel` (`vipLevel`)' },
    { table: 'users', name: 'IDX_users_status', ddl: 'ALTER TABLE `users` ADD INDEX `IDX_users_status` (`status`)' },
    // ========== 唯一约束（防重复） ==========
    { table: 'answer_likes', name: 'UQ_answer_likes_user_answer', ddl: 'ALTER TABLE `answer_likes` ADD UNIQUE INDEX `UQ_answer_likes_user_answer` (`userId`, `answerId`)' },
    { table: 'dynamic_likes', name: 'UQ_dynamic_likes_user_dynamic', ddl: 'ALTER TABLE `dynamic_likes` ADD UNIQUE INDEX `UQ_dynamic_likes_user_dynamic` (`userId`, `dynamicId`)' },
    { table: 'user_blocks', name: 'UQ_user_blocks_blocker_blocked', ddl: 'ALTER TABLE `user_blocks` ADD UNIQUE INDEX `UQ_user_blocks_blocker_blocked` (`blockerId`, `blockedUserId`)' },
    { table: 'matchmaker_reviews', name: 'UQ_reviews_user_matchmaker', ddl: 'ALTER TABLE `matchmaker_reviews` ADD UNIQUE INDEX `UQ_reviews_user_matchmaker` (`userId`, `matchmakerId`)' },
    { table: 'matchmaker_comments', name: 'UQ_comments_user_matchmaker', ddl: 'ALTER TABLE `matchmaker_comments` ADD UNIQUE INDEX `UQ_comments_user_matchmaker` (`userId`, `matchmakerId`)' },
    // ========== 外键/查询性能索引 ==========
    { table: 'feedbacks', name: 'IDX_feedbacks_userId', ddl: 'ALTER TABLE `feedbacks` ADD INDEX `IDX_feedbacks_userId` (`userId`)' },
    { table: 'success_cases', name: 'IDX_success_cases_senderUserId', ddl: 'ALTER TABLE `success_cases` ADD INDEX `IDX_success_cases_senderUserId` (`senderUserId`)' },
    { table: 'profile_visits', name: 'IDX_profile_visits_visitorUserId', ddl: 'ALTER TABLE `profile_visits` ADD INDEX `IDX_profile_visits_visitorUserId` (`visitor_user_id`)' },
    { table: 'activity_signups', name: 'IDX_activity_signups_activityId', ddl: 'ALTER TABLE `activity_signups` ADD INDEX `IDX_activity_signups_activityId` (`activityId`)' },
    { table: 'activity_signups', name: 'IDX_activity_signups_userId', ddl: 'ALTER TABLE `activity_signups` ADD INDEX `IDX_activity_signups_userId` (`userId`)' },
    { table: 'vip_orders', name: 'IDX_vip_orders_payType', ddl: 'ALTER TABLE `vip_orders` ADD INDEX `IDX_vip_orders_payType` (`payType`)' },
    { table: 'vip_orders', name: 'IDX_vip_orders_paidAt', ddl: 'ALTER TABLE `vip_orders` ADD INDEX `IDX_vip_orders_paidAt` (`paidAt`)' },
    { table: 'notices', name: 'IDX_notices_type', ddl: 'ALTER TABLE `notices` ADD INDEX `IDX_notices_type` (`type`)' },
    { table: 'notices', name: 'IDX_notices_status', ddl: 'ALTER TABLE `notices` ADD INDEX `IDX_notices_status` (`status`)' },
    { table: 'activities', name: 'IDX_activities_status', ddl: 'ALTER TABLE `activities` ADD INDEX `IDX_activities_status` (`status`)' },
    { table: 'activities', name: 'IDX_activities_signUpEndTime', ddl: 'ALTER TABLE `activities` ADD INDEX `IDX_activities_signUpEndTime` (`signUpEndTime`)' },
    { table: 'user_system_tags', name: 'IDX_user_system_tags_name', ddl: 'ALTER TABLE `user_system_tags` ADD INDEX `IDX_user_system_tags_name` (`name`)' },
    { table: 'audit_logs', name: 'IDX_audit_logs_submitterId', ddl: 'ALTER TABLE `audit_logs` ADD INDEX `IDX_audit_logs_submitterId` (`submitterId`)' },
    { table: 'chat_messages', name: 'IDX_chat_messages_conversation', ddl: 'ALTER TABLE `chat_messages` ADD INDEX `IDX_chat_messages_conversation` (`fromUserId`, `toUserId`, `createdAt`)' },
  ]

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const idx of this.indexes) {
      if (!(await this.tableExists(queryRunner, idx.table))) continue
      if (await this.indexExists(queryRunner, idx.table, idx.name)) continue
      try {
        await queryRunner.query(idx.ddl)
      } catch (e: any) {
        // 唯一约束遇到历史重复数据等情况：告警并继续，避免中断迁移链
        console.warn(`[migration:AddMissingIndexes] 跳过 ${idx.table}.${idx.name}: ${e?.message}`)
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const idx of this.indexes) {
      if (!(await this.tableExists(queryRunner, idx.table))) continue
      if (!(await this.indexExists(queryRunner, idx.table, idx.name))) continue
      try {
        await queryRunner.query(`ALTER TABLE \`${idx.table}\` DROP INDEX \`${idx.name}\``)
      } catch (e: any) {
        console.warn(`[migration:AddMissingIndexes] 回滚跳过 ${idx.table}.${idx.name}: ${e?.message}`)
      }
    }
  }

  private async tableExists(qr: QueryRunner, table: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT COUNT(*) AS c FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table],
    )
    return Number(rows?.[0]?.c) > 0
  }

  private async indexExists(qr: QueryRunner, table: string, name: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT COUNT(*) AS c FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [table, name],
    )
    return Number(rows?.[0]?.c) > 0
  }
}
