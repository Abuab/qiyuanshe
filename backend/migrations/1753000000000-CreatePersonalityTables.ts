import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 创建人格测试模块的 6 张表
 *
 * 说明：生产环境 synchronize 关闭、依赖迁移建表。本迁移使用 CREATE TABLE IF NOT EXISTS，
 * 可安全地在任意环境重复执行（若表已由 DBA 手动创建则跳过）。
 * 外键采用逻辑关联（仅建索引列，不加 DB 级 FK 约束），与实体懒加载关系一致，
 * 且不触碰 users 表结构。
 */
export class CreatePersonalityTables1753000000000 implements MigrationInterface {
  name = 'CreatePersonalityTables1753000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`personality_dimensions\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`code\` VARCHAR(20) NOT NULL,
        \`name\` VARCHAR(30) NOT NULL,
        \`directionAKey\` VARCHAR(20) NOT NULL,
        \`directionALabel\` VARCHAR(30) NOT NULL,
        \`directionBKey\` VARCHAR(20) NOT NULL,
        \`directionBLabel\` VARCHAR(30) NOT NULL,
        \`icon\` VARCHAR(100) NULL,
        \`sort\` INT NOT NULL DEFAULT 0,
        \`isEnabled\` TINYINT NOT NULL DEFAULT 1,
        \`isDeleted\` TINYINT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_pd_code\` (\`code\`),
        KEY \`IDX_pd_enabled_sort\` (\`isEnabled\`, \`sort\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`personality_questions\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`content\` VARCHAR(500) NOT NULL,
        \`dimensionId\` INT NOT NULL,
        \`sort\` INT NOT NULL DEFAULT 0,
        \`isEnabled\` TINYINT NOT NULL DEFAULT 1,
        \`isDeleted\` TINYINT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_pq_enabled_sort\` (\`isEnabled\`, \`sort\`),
        KEY \`IDX_pq_dim_enabled\` (\`dimensionId\`, \`isEnabled\`),
        KEY \`IDX_pq_dim\` (\`dimensionId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`personality_options\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`questionId\` INT NOT NULL,
        \`optionLabel\` VARCHAR(10) NOT NULL,
        \`content\` VARCHAR(500) NOT NULL,
        \`directionKey\` VARCHAR(20) NOT NULL,
        \`score\` INT NOT NULL DEFAULT 1,
        \`sort\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_po_question\` (\`questionId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`personality_types\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`code\` VARCHAR(10) NOT NULL,
        \`name\` VARCHAR(50) NOT NULL,
        \`nickname\` VARCHAR(50) NULL,
        \`summary\` VARCHAR(255) NULL,
        \`description\` TEXT NULL,
        \`radarEnergy\` INT NOT NULL DEFAULT 50,
        \`radarInfo\` INT NOT NULL DEFAULT 50,
        \`radarDecision\` INT NOT NULL DEFAULT 50,
        \`radarLifestyle\` INT NOT NULL DEFAULT 50,
        \`matchTypes\` TEXT NULL,
        \`sort\` INT NOT NULL DEFAULT 0,
        \`isEnabled\` TINYINT NOT NULL DEFAULT 1,
        \`isDeleted\` TINYINT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_pt_code\` (\`code\`),
        KEY \`IDX_pt_enabled_sort\` (\`isEnabled\`, \`sort\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`personality_answer_records\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`userId\` BIGINT NOT NULL,
        \`questionId\` INT NOT NULL,
        \`optionId\` INT NOT NULL,
        \`resultId\` BIGINT NULL,
        \`isDeleted\` TINYINT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_par_user_deleted\` (\`userId\`, \`isDeleted\`),
        KEY \`IDX_par_user\` (\`userId\`),
        KEY \`IDX_par_result\` (\`resultId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`personality_results\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`userId\` BIGINT NOT NULL,
        \`typeId\` INT NULL,
        \`typeCode\` VARCHAR(10) NULL,
        \`dimensionScores\` TEXT NULL,
        \`testedAt\` DATETIME NULL,
        \`isDeleted\` TINYINT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_pr_user\` (\`userId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `personality_answer_records`')
    await queryRunner.query('DROP TABLE IF EXISTS `personality_results`')
    await queryRunner.query('DROP TABLE IF EXISTS `personality_options`')
    await queryRunner.query('DROP TABLE IF EXISTS `personality_questions`')
    await queryRunner.query('DROP TABLE IF EXISTS `personality_types`')
    await queryRunner.query('DROP TABLE IF EXISTS `personality_dimensions`')
  }
}
