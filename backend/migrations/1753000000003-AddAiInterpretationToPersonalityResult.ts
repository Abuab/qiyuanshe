import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * personality_results 增加 AI 性格解读缓存列
 *
 * 幂等：列已存在则跳过；不改动 users 表，仅扩展本模块自有表。
 */
export class AddAiInterpretationToPersonalityResult1753000000003 implements MigrationInterface {
  name = 'AddAiInterpretationToPersonalityResult1753000000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner, 'personality_results'))) return
    if (!(await this.columnExists(queryRunner, 'personality_results', 'aiInterpretation'))) {
      await queryRunner.query('ALTER TABLE `personality_results` ADD COLUMN `aiInterpretation` TEXT NULL')
    }
    if (!(await this.columnExists(queryRunner, 'personality_results', 'aiInterpretationAt'))) {
      await queryRunner.query('ALTER TABLE `personality_results` ADD COLUMN `aiInterpretationAt` DATETIME NULL')
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner, 'personality_results', 'aiInterpretationAt')) {
      await queryRunner.query('ALTER TABLE `personality_results` DROP COLUMN `aiInterpretationAt`')
    }
    if (await this.columnExists(queryRunner, 'personality_results', 'aiInterpretation')) {
      await queryRunner.query('ALTER TABLE `personality_results` DROP COLUMN `aiInterpretation`')
    }
  }

  private async tableExists(qr: QueryRunner, table: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
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
