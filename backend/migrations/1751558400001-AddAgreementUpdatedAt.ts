import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 为协议同意记录表添加 updatedAt 列
 *
 * - user_agreement_logs：用于管理后台"同意记录查询"，显示最近一次同意/更新协议的时间
 * - user_agreements：用户协议同意记录（旧表），再次同意时更新时间
 *
 * 幂等 + 容错：列已存在则跳过，不影响已有数据
 */
export class AddAgreementUpdatedAt1751558400001 implements MigrationInterface {
  name = 'AddAgreementUpdatedAt1751558400001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // user_agreement_logs 表
    if (await this.tableExists(queryRunner, 'user_agreement_logs')) {
      if (!(await this.columnExists(queryRunner, 'user_agreement_logs', 'updatedAt'))) {
        await queryRunner.query(
          `ALTER TABLE \`user_agreement_logs\`
           ADD COLUMN \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
           AFTER \`createdAt\``,
        )
        // 历史数据：将 updatedAt 回填为 createdAt，避免显示为新迁移时间
        await queryRunner.query(
          `UPDATE \`user_agreement_logs\` SET \`updatedAt\` = \`createdAt\` WHERE \`updatedAt\` > \`createdAt\``,
        )
        console.log('[migration] user_agreement_logs.updatedAt 列已添加并回填历史数据')
      } else {
        console.log('[migration] user_agreement_logs.updatedAt 列已存在，跳过')
      }
    }

    // user_agreements 表
    if (await this.tableExists(queryRunner, 'user_agreements')) {
      if (!(await this.columnExists(queryRunner, 'user_agreements', 'updatedAt'))) {
        await queryRunner.query(
          `ALTER TABLE \`user_agreements\`
           ADD COLUMN \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
           AFTER \`createdAt\``,
        )
        // 历史数据回填
        await queryRunner.query(
          `UPDATE \`user_agreements\` SET \`updatedAt\` = \`createdAt\` WHERE \`updatedAt\` > \`createdAt\``,
        )
        console.log('[migration] user_agreements.updatedAt 列已添加并回填历史数据')
      } else {
        console.log('[migration] user_agreements.updatedAt 列已存在，跳过')
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner, 'user_agreement_logs', 'updatedAt')) {
      await queryRunner.query(`ALTER TABLE \`user_agreement_logs\` DROP COLUMN \`updatedAt\``)
    }
    if (await this.columnExists(queryRunner, 'user_agreements', 'updatedAt')) {
      await queryRunner.query(`ALTER TABLE \`user_agreements\` DROP COLUMN \`updatedAt\``)
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

  private async columnExists(qr: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    )
    return Number(rows?.[0]?.c) > 0
  }
}
