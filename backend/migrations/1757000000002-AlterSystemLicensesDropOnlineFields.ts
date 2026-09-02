import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 纯离线授权改造：删除 system_licenses 表中与在线授权相关的字段。
 *
 * - activationId（在线激活实例 ID）
 * - remoteStatus（远程吊销状态）
 * - remoteStatusUpdatedAt（远程状态更新时间）
 *
 * 改为纯离线模式：本地 RSA 验签，无远程心跳与吊销。
 * 本迁移根据 information_schema 判断列是否存在后再执行，对「从零部署」与「已上线升级」均安全。
 */
export class AlterSystemLicensesDropOnlineFields1757000000002 implements MigrationInterface {
  name = 'AlterSystemLicensesDropOnlineFields1757000000002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns: Array<{ COLUMN_NAME: string }> = await queryRunner.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_licenses'`,
    )
    const names = new Set(columns.map((c) => c.COLUMN_NAME))

    for (const col of ['activationId', 'remoteStatus', 'remoteStatusUpdatedAt']) {
      if (names.has(col)) {
        await queryRunner.query(`ALTER TABLE \`system_licenses\` DROP COLUMN \`${col}\``)
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns: Array<{ COLUMN_NAME: string }> = await queryRunner.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_licenses'`,
    )
    const names = new Set(columns.map((c) => c.COLUMN_NAME))

    if (!names.has('activationId')) {
      await queryRunner.query('ALTER TABLE `system_licenses` ADD COLUMN `activationId` VARCHAR(64) NULL')
    }
    if (!names.has('remoteStatus')) {
      await queryRunner.query("ALTER TABLE `system_licenses` ADD COLUMN `remoteStatus` VARCHAR(32) NOT NULL DEFAULT 'valid'")
    }
    if (!names.has('remoteStatusUpdatedAt')) {
      await queryRunner.query('ALTER TABLE `system_licenses` ADD COLUMN `remoteStatusUpdatedAt` DATETIME NULL')
    }
  }
}
