import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMatchAnalysisReport1710000000000 implements MigrationInterface {
  name = 'AddMatchAnalysisReport1710000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`match_analysis_reports\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`userId\` BIGINT NOT NULL COMMENT '关联用户',
        \`quotaNo\` INT NOT NULL COMMENT '免费名额序号（1 起）',
        \`reportJson\` LONGTEXT NOT NULL COMMENT '报告快照 JSON',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_match_analysis_reports_userId\` (\`userId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='免费匹配分析报告（个人）'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`match_analysis_reports\``)
  }
}
