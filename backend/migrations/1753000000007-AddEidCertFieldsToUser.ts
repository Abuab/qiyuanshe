import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEidCertFieldsToUser1753000000007 implements MigrationInterface {
  name = 'AddEidCertFieldsToUser1753000000007'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // E证通实名认证状态：0未认证 1认证中 2已认证 3认证失败（幂等，存在则跳过）
    if (!(await this.hasColumn(queryRunner, 'users', 'eid_cert_status'))) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD COLUMN `eid_cert_status` tinyint NOT NULL DEFAULT 0',
      )
    }
    if (!(await this.hasColumn(queryRunner, 'users', 'eid_cert_time'))) {
      await queryRunner.query('ALTER TABLE `users` ADD COLUMN `eid_cert_time` datetime NULL')
    }
    if (!(await this.hasColumn(queryRunner, 'users', 'eid_biz_seq_no'))) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD COLUMN `eid_biz_seq_no` varchar(64) NULL',
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'users', 'eid_biz_seq_no')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `eid_biz_seq_no`')
    }
    if (await this.hasColumn(queryRunner, 'users', 'eid_cert_time')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `eid_cert_time`')
    }
    if (await this.hasColumn(queryRunner, 'users', 'eid_cert_status')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `eid_cert_status`')
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
