import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 清理 system_licenses 表中的机器指纹字段，改为许可证服务器分配的激活实例 ID。
 *
 * - 旧方案「机器指纹强绑定」已取消，machineFingerprint 列不再使用，需删除。
 * - 新方案「License Key + 激活次数限制 + 在线校验」需要记录 activationId，
 *   供后端心跳/解绑时定位当前激活实例。
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
    if (!names.has('activationId')) {
      await queryRunner.query('ALTER TABLE `system_licenses` ADD COLUMN `activationId` VARCHAR(64) NULL')
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns: Array<{ COLUMN_NAME: string }> = await queryRunner.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_licenses'`,
    )
    const names = new Set(columns.map((c) => c.COLUMN_NAME))

    if (names.has('activationId')) {
      await queryRunner.query('ALTER TABLE `system_licenses` DROP COLUMN `activationId`')
    }
    if (!names.has('machineFingerprint')) {
      await queryRunner.query('ALTER TABLE `system_licenses` ADD COLUMN `machineFingerprint` VARCHAR(255) NULL')
    }
  }
}
