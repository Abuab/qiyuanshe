import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 清理 system_licenses 表中旧「机器指纹强绑定」方案遗留的 machineFingerprint 列。
 *
 * 当前纯离线授权不再绑定机器指纹，此列已无用途，故删除。
 *
 * 本迁移对「从零部署」与「已上线升级」均安全：根据 information_schema 判断列是否存在后再执行。
 */
export class AlterSystemLicensesDropMachineFingerprint1757000000001 implements MigrationInterface {
  name = 'AlterSystemLicensesDropMachineFingerprint1757000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns: Array<{ COLUMN_NAME: string }> = await queryRunner.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_licenses'`,
    )
    const names = new Set(columns.map((c) => c.COLUMN_NAME))

    if (names.has('machineFingerprint')) {
      await queryRunner.query('ALTER TABLE `system_licenses` DROP COLUMN `machineFingerprint`')
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns: Array<{ COLUMN_NAME: string }> = await queryRunner.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_licenses'`,
    )
    const names = new Set(columns.map((c) => c.COLUMN_NAME))

    if (!names.has('machineFingerprint')) {
      await queryRunner.query('ALTER TABLE `system_licenses` ADD COLUMN `machineFingerprint` VARCHAR(255) NULL')
    }
  }
}
