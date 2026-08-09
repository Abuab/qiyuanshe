import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVoiceFieldsToUser1751000000000 implements MigrationInterface {
  name = 'AddVoiceFieldsToUser1751000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner, 'users', 'voiceUrl'))) {
      await queryRunner.query('ALTER TABLE `users` ADD COLUMN `voiceUrl` varchar(500) NULL')
    }
    if (!(await this.hasColumn(queryRunner, 'users', 'voiceAuditStatus'))) {
      await queryRunner.query('ALTER TABLE `users` ADD COLUMN `voiceAuditStatus` tinyint NULL')
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'users', 'voiceAuditStatus')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `voiceAuditStatus`')
    }
    if (await this.hasColumn(queryRunner, 'users', 'voiceUrl')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `voiceUrl`')
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
