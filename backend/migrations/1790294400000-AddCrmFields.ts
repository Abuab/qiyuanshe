import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCrmFields1790294400000 implements MigrationInterface {
  name = 'AddCrmFields1790294400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. users 表新增 CRM 客户阶段与负责人列（幂等：存量 DB_SYNC 可能已建列）
    if (!(await this.hasColumn(queryRunner, 'users', 'crmStage'))) {
      await queryRunner.query(
        "ALTER TABLE `users` ADD COLUMN `crmStage` tinyint NOT NULL DEFAULT '0'",
      )
    }
    if (!(await this.hasColumn(queryRunner, 'users', 'crmOwnerId'))) {
      await queryRunner.query('ALTER TABLE `users` ADD COLUMN `crmOwnerId` int NULL')
    }

    // 2. CRM 跟进记录表（幂等：全新部署 schema.sql 已建全表，此处 IF NOT EXISTS 安全跳过）
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`crm_follow_records\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`userId\` bigint NOT NULL,
        \`adminUserId\` int NOT NULL,
        \`content\` text COLLATE utf8mb4_unicode_ci NOT NULL,
        \`nextFollowAt\` datetime DEFAULT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_crm_fr_userId\` (\`userId\`),
        KEY \`IDX_crm_fr_adminUserId\` (\`adminUserId\`),
        KEY \`IDX_crm_fr_nextFollowAt\` (\`nextFollowAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `crm_follow_records`')
    if (await this.hasColumn(queryRunner, 'users', 'crmStage')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `crmStage`')
    }
    if (await this.hasColumn(queryRunner, 'users', 'crmOwnerId')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `crmOwnerId`')
    }
  }

  private async hasColumn(qr: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    )
    return Number(rows?.[0]?.c) > 0
  }
}
