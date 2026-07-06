import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVoiceDurationToUser1751000000004 implements MigrationInterface {
  name = 'AddVoiceDurationToUser1751000000004'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 幂等：列可能已由早期 DB_SYNC 创建，存在则跳过
    if (!(await this.hasColumn(queryRunner, 'users', 'voiceDuration'))) {
      await queryRunner.query('ALTER TABLE `users` ADD COLUMN `voiceDuration` int NULL')
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'users', 'voiceDuration')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `voiceDuration`')
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
