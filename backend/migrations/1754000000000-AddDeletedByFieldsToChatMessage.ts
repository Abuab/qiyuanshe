import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDeletedByFieldsToChatMessage1754000000000 implements MigrationInterface {
  name = 'AddDeletedByFieldsToChatMessage1754000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner, 'chat_messages', 'deletedBySender'))) {
      await queryRunner.query(
        'ALTER TABLE `chat_messages` ADD COLUMN `deletedBySender` tinyint NOT NULL DEFAULT 0',
      )
    }
    if (!(await this.hasColumn(queryRunner, 'chat_messages', 'deletedByReceiver'))) {
      await queryRunner.query(
        'ALTER TABLE `chat_messages` ADD COLUMN `deletedByReceiver` tinyint NOT NULL DEFAULT 0',
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'chat_messages', 'deletedByReceiver')) {
      await queryRunner.query('ALTER TABLE `chat_messages` DROP COLUMN `deletedByReceiver`')
    }
    if (await this.hasColumn(queryRunner, 'chat_messages', 'deletedBySender')) {
      await queryRunner.query('ALTER TABLE `chat_messages` DROP COLUMN `deletedBySender`')
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
