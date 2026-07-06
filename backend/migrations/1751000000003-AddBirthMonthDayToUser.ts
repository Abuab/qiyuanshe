import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBirthMonthDayToUser1751000000003 implements MigrationInterface {
  name = 'AddBirthMonthDayToUser1751000000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 幂等：列可能已由早期 DB_SYNC 创建，存在则跳过，避免重复列报错中断迁移链
    if (!(await this.hasColumn(queryRunner, 'users', 'birthMonth'))) {
      await queryRunner.query('ALTER TABLE `users` ADD COLUMN `birthMonth` tinyint NULL')
    }
    if (!(await this.hasColumn(queryRunner, 'users', 'birthDay'))) {
      await queryRunner.query('ALTER TABLE `users` ADD COLUMN `birthDay` tinyint NULL')
    }
    // 现有用户统一设置出生月日为 5月1日（避免 null 值导致 DTO 验证失败）
    await queryRunner.query(
      'UPDATE `users` SET `birthMonth` = 5, `birthDay` = 1 WHERE `birthMonth` IS NULL',
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'users', 'birthMonth')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `birthMonth`')
    }
    if (await this.hasColumn(queryRunner, 'users', 'birthDay')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `birthDay`')
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
