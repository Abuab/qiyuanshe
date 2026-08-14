import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuditResultToNotifyLog1755000000000 implements MigrationInterface {
  name = 'AddAuditResultToNotifyLog1755000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner, 'notify_logs', 'auditStatus'))) {
      await queryRunner.query('ALTER TABLE `notify_logs` ADD COLUMN `auditStatus` tinyint NULL')
    }
    if (!(await this.hasColumn(queryRunner, 'notify_logs', 'adminName'))) {
      await queryRunner.query('ALTER TABLE `notify_logs` ADD COLUMN `adminName` varchar(100) NULL')
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'notify_logs', 'adminName')) {
      await queryRunner.query('ALTER TABLE `notify_logs` DROP COLUMN `adminName`')
    }
    if (await this.hasColumn(queryRunner, 'notify_logs', 'auditStatus')) {
      await queryRunner.query('ALTER TABLE `notify_logs` DROP COLUMN `auditStatus`')
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
