import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 补充数据库中缺失的索引和唯一约束
 * 提升高频查询性能，防止重复数据
 */
export class AddMissingIndexes1751558400000 implements MigrationInterface {
  name = 'AddMissingIndexes1751558400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========== 用户表复合索引（推荐列表核心查询） ==========
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD INDEX \`IDX_users_gender_status_deleted\` (\`gender\`, \`status\`, \`isDeleted\`)
    `)

    // ========== 用户表单列索引 ==========
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD INDEX \`IDX_users_isVip\` (\`isVip\`),
        ADD INDEX \`IDX_users_vipLevel\` (\`vipLevel\`),
        ADD INDEX \`IDX_users_status\` (\`status\`)
    `)

    // ========== 点赞表唯一约束（防止重复点赞） ==========
    await queryRunner.query(`
      ALTER TABLE \`answer_likes\`
        ADD UNIQUE INDEX \`UQ_answer_likes_user_answer\` (\`userId\`, \`answerId\`)
    `)

    await queryRunner.query(`
      ALTER TABLE \`dynamic_likes\`
        ADD UNIQUE INDEX \`UQ_dynamic_likes_user_dynamic\` (\`userId\`, \`dynamicId\`)
    `)

    // ========== 屏蔽表唯一约束（防止重复屏蔽） ==========
    await queryRunner.query(`
      ALTER TABLE \`user_blocks\`
        ADD UNIQUE INDEX \`UQ_user_blocks_blocker_blocked\` (\`blockerId\`, \`blockedUserId\`)
    `)

    // ========== 红娘评价唯一约束（同一用户对同一红娘只能评价一次） ==========
    await queryRunner.query(`
      ALTER TABLE \`matchmaker_reviews\`
        ADD UNIQUE INDEX \`UQ_reviews_user_matchmaker\` (\`userId\`, \`matchmakerId\`)
    `)

    // ========== 红娘评论唯一约束 ==========
    await queryRunner.query(`
      ALTER TABLE \`matchmaker_comments\`
        ADD UNIQUE INDEX \`UQ_comments_user_matchmaker\` (\`userId\`, \`matchmakerId\`)
    `)

    // ========== 外键索引（查询性能） ==========
    await queryRunner.query(`
      ALTER TABLE \`feedbacks\`
        ADD INDEX \`IDX_feedbacks_userId\` (\`userId\`)
    `)

    await queryRunner.query(`
      ALTER TABLE \`success_cases\`
        ADD INDEX \`IDX_success_cases_senderUserId\` (\`senderUserId\`)
    `)

    await queryRunner.query(`
      ALTER TABLE \`profile_visits\`
        ADD INDEX \`IDX_profile_visits_visitorUserId\` (\`visitorUserId\`)
    `)

    await queryRunner.query(`
      ALTER TABLE \`activity_signups\`
        ADD INDEX \`IDX_activity_signups_activityId\` (\`activityId\`),
        ADD INDEX \`IDX_activity_signups_userId\` (\`userId\`)
    `)

    await queryRunner.query(`
      ALTER TABLE \`vip_orders\`
        ADD INDEX \`IDX_vip_orders_payType\` (\`payType\`),
        ADD INDEX \`IDX_vip_orders_paidAt\` (\`paidAt\`)
    `)

    await queryRunner.query(`
      ALTER TABLE \`notices\`
        ADD INDEX \`IDX_notices_type\` (\`type\`),
        ADD INDEX \`IDX_notices_status\` (\`status\`)
    `)

    await queryRunner.query(`
      ALTER TABLE \`activities\`
        ADD INDEX \`IDX_activities_status\` (\`status\`),
        ADD INDEX \`IDX_activities_signUpEndTime\` (\`signUpEndTime\`)
    `)

    await queryRunner.query(`
      ALTER TABLE \`user_system_tags\`
        ADD INDEX \`IDX_user_system_tags_name\` (\`name\`)
    `)

    await queryRunner.query(`
      ALTER TABLE \`audit_logs\`
        ADD INDEX \`IDX_audit_logs_submitterId\` (\`submitterId\`)
    `)

    // ========== 聊天消息复合索引（对话查询） ==========
    await queryRunner.query(`
      ALTER TABLE \`chat_messages\`
        ADD INDEX \`IDX_chat_messages_conversation\` (\`fromUserId\`, \`toUserId\`, \`createdAt\`)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_users_gender_status_deleted\``)
    await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_users_isVip\``)
    await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_users_vipLevel\``)
    await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_users_status\``)
    await queryRunner.query(`ALTER TABLE \`answer_likes\` DROP INDEX \`UQ_answer_likes_user_answer\``)
    await queryRunner.query(`ALTER TABLE \`dynamic_likes\` DROP INDEX \`UQ_dynamic_likes_user_dynamic\``)
    await queryRunner.query(`ALTER TABLE \`user_blocks\` DROP INDEX \`UQ_user_blocks_blocker_blocked\``)
    await queryRunner.query(`ALTER TABLE \`matchmaker_reviews\` DROP INDEX \`UQ_reviews_user_matchmaker\``)
    await queryRunner.query(`ALTER TABLE \`matchmaker_comments\` DROP INDEX \`UQ_comments_user_matchmaker\``)
    await queryRunner.query(`ALTER TABLE \`feedbacks\` DROP INDEX \`IDX_feedbacks_userId\``)
    await queryRunner.query(`ALTER TABLE \`success_cases\` DROP INDEX \`IDX_success_cases_senderUserId\``)
    await queryRunner.query(`ALTER TABLE \`profile_visits\` DROP INDEX \`IDX_profile_visits_visitorUserId\``)
    await queryRunner.query(`ALTER TABLE \`activity_signups\` DROP INDEX \`IDX_activity_signups_activityId\``)
    await queryRunner.query(`ALTER TABLE \`activity_signups\` DROP INDEX \`IDX_activity_signups_userId\``)
    await queryRunner.query(`ALTER TABLE \`vip_orders\` DROP INDEX \`IDX_vip_orders_payType\``)
    await queryRunner.query(`ALTER TABLE \`vip_orders\` DROP INDEX \`IDX_vip_orders_paidAt\``)
    await queryRunner.query(`ALTER TABLE \`notices\` DROP INDEX \`IDX_notices_type\``)
    await queryRunner.query(`ALTER TABLE \`notices\` DROP INDEX \`IDX_notices_status\``)
    await queryRunner.query(`ALTER TABLE \`activities\` DROP INDEX \`IDX_activities_status\``)
    await queryRunner.query(`ALTER TABLE \`activities\` DROP INDEX \`IDX_activities_signUpEndTime\``)
    await queryRunner.query(`ALTER TABLE \`user_system_tags\` DROP INDEX \`IDX_user_system_tags_name\``)
    await queryRunner.query(`ALTER TABLE \`audit_logs\` DROP INDEX \`IDX_audit_logs_submitterId\``)
    await queryRunner.query(`ALTER TABLE \`chat_messages\` DROP INDEX \`IDX_chat_messages_conversation\``)
  }
}
