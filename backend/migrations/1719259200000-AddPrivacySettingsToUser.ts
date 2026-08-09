import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPrivacySettingsToUser1719259200000 implements MigrationInterface {
  name = 'AddPrivacySettingsToUser1719259200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner, 'users', 'showBasicProfile'))) {
      await queryRunner.query('ALTER TABLE `users` ADD COLUMN `showBasicProfile` tinyint NOT NULL DEFAULT 1')
    }
    if (!(await this.hasColumn(queryRunner, 'users', 'delegateToPlatform'))) {
      await queryRunner.query('ALTER TABLE `users` ADD COLUMN `delegateToPlatform` tinyint NOT NULL DEFAULT 0')
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'users', 'delegateToPlatform')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `delegateToPlatform`')
    }
    if (await this.hasColumn(queryRunner, 'users', 'showBasicProfile')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `showBasicProfile`')
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
