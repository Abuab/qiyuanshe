import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMatchAnalysisReport1757000000003 implements MigrationInterface {
  name = 'AddMatchAnalysisReport1757000000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 幂等写法：全新部署时 schema.sql 已建全表，此处 IF NOT EXISTS 安全跳过；
    // 存量环境升级时增量建表。
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`match_analysis_reports\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`userId\` BIGINT NOT NULL COMMENT '关联用户',
        \`quotaNo\` INT NOT NULL COMMENT '免费名额序号（1 起）',
        \`reportJson\` LONGTEXT NOT NULL COMMENT '报告快照 JSON',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_match_analysis_reports_userId\` (\`userId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='免费匹配分析报告（个人）'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`match_analysis_reports\``)
  }
}
