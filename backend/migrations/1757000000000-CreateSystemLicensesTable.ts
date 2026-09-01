import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 创建 system_licenses 表（License 授权记录，单例）。
 *
 * 背景：生产环境 synchronize 关闭，依赖迁移建表；此表承载 RSA 授权码验签
 * 与远程吊销状态（含 V3 远程字段），使用 CREATE TABLE IF NOT EXISTS 可安全重复执行。
 */
export class CreateSystemLicensesTable1757000000000 implements MigrationInterface {
  name = 'CreateSystemLicensesTable1757000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`system_licenses\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`isActivated\` TINYINT NOT NULL DEFAULT 0,
        \`licenseKey\` TEXT NOT NULL,
        \`activatedAt\` DATETIME NULL,
        \`expiresAt\` DATETIME NULL,
        \`features\` TEXT NULL,
        \`customerId\` VARCHAR(255) NULL,
        \`customerName\` VARCHAR(255) NULL,
        \`machineFingerprint\` VARCHAR(255) NULL,
        \`remoteStatus\` VARCHAR(32) NOT NULL DEFAULT 'valid',
        \`remoteStatusUpdatedAt\` DATETIME NULL,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `system_licenses`')
  }
}
