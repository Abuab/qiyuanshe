import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStatusToRealNameIdentities1753000000009 implements MigrationInterface {
  name = 'AddStatusToRealNameIdentities1753000000009'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // real_name_identities 新增 status 字段：0=有效 1=已注销
    if (!(await this.hasColumn(queryRunner, 'real_name_identities', 'status'))) {
      await queryRunner.query(
        'ALTER TABLE `real_name_identities` ADD COLUMN `status` tinyint NOT NULL DEFAULT 0',
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'real_name_identities', 'status')) {
      await queryRunner.query('ALTER TABLE `real_name_identities` DROP COLUMN `status`')
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
