import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 创建引导文案配置中心的 4 张表
 *
 * 生产 synchronize 关闭、依赖迁移建表。使用 CREATE TABLE IF NOT EXISTS，可安全重复执行。
 * 首页浮动按钮配置复用 system_configs（key: guide.homeFloatingButton），此处不建表。
 */
export class CreateGuideCopyTables1753000000002 implements MigrationInterface {
  name = 'CreateGuideCopyTables1753000000002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`copy_slots\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`code\` VARCHAR(50) NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`pageLocation\` VARCHAR(100) NULL,
        \`remark\` VARCHAR(255) NULL,
        \`displayMode\` VARCHAR(20) NOT NULL DEFAULT 'carousel',
        \`isSystem\` TINYINT NOT NULL DEFAULT 0,
        \`isEnabled\` TINYINT NOT NULL DEFAULT 1,
        \`sort\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_copy_slots_code\` (\`code\`),
        KEY \`IDX_copy_slots_enabled_sort\` (\`isEnabled\`, \`sort\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`copy_items\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`slotId\` INT NOT NULL,
        \`mainText\` VARCHAR(255) NOT NULL,
        \`subText\` VARCHAR(255) NULL,
        \`weight\` INT NOT NULL DEFAULT 50,
        \`targetLoginState\` VARCHAR(10) NULL,
        \`targetGender\` TINYINT NULL,
        \`targetTested\` TINYINT NULL,
        \`isEnabled\` TINYINT NOT NULL DEFAULT 1,
        \`sort\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_copy_items_slot_enabled\` (\`slotId\`, \`isEnabled\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`copy_stats\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`slotId\` INT NOT NULL,
        \`itemId\` INT NOT NULL,
        \`statDate\` DATE NOT NULL,
        \`impressions\` INT NOT NULL DEFAULT 0,
        \`clicks\` INT NOT NULL DEFAULT 0,
        \`loginConversions\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_copy_stats_item_date\` (\`itemId\`, \`statDate\`),
        KEY \`IDX_copy_stats_slot\` (\`slotId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`copy_exposure_logs\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`slotId\` INT NOT NULL,
        \`itemId\` INT NOT NULL,
        \`userKey\` VARCHAR(80) NOT NULL,
        \`statDate\` DATE NOT NULL,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_copy_exposure_slot_user_date\` (\`slotId\`, \`userKey\`, \`statDate\`),
        KEY \`IDX_copy_exposure_userKey\` (\`userKey\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `copy_exposure_logs`')
    await queryRunner.query('DROP TABLE IF EXISTS `copy_stats`')
    await queryRunner.query('DROP TABLE IF EXISTS `copy_items`')
    await queryRunner.query('DROP TABLE IF EXISTS `copy_slots`')
  }
}
