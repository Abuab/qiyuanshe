import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 人格测试统计性能优化：新增 durationSeconds 数值列 + 补充高频查询索引
 *
 * 目的：
 * - durationSeconds 独立列：数据看板平均答题时长可用 SQL AVG 聚合，避免读取整表 JSON 到内存
 * - personality_results(testedAt)：加速「今日新增」按时间筛选与 ORDER BY testedAt
 * - personality_results(typeCode, isDeleted)：加速类型分布 GROUP BY 与类型下钻
 * - personality_answer_records(isDeleted, questionId, optionId)：加速题目选项统计聚合
 *
 * 幂等：列/索引已存在则跳过；仅扩展本模块自有表，不改动 users 表。
 */
export class AddPersonalityStatsIndexes1753000000004 implements MigrationInterface {
  name = 'AddPersonalityStatsIndexes1753000000004'

  private readonly indexes: Array<{ table: string; name: string; ddl: string }> = [
    {
      table: 'personality_results',
      name: 'IDX_pr_testedAt',
      ddl: 'ALTER TABLE `personality_results` ADD INDEX `IDX_pr_testedAt` (`testedAt`)',
    },
    {
      table: 'personality_results',
      name: 'IDX_pr_typeCode_deleted',
      ddl: 'ALTER TABLE `personality_results` ADD INDEX `IDX_pr_typeCode_deleted` (`typeCode`, `isDeleted`)',
    },
    {
      table: 'personality_answer_records',
      name: 'IDX_par_deleted_q_o',
      ddl: 'ALTER TABLE `personality_answer_records` ADD INDEX `IDX_par_deleted_q_o` (`isDeleted`, `questionId`, `optionId`)',
    },
  ]

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 新增 durationSeconds 列
    if (await this.tableExists(queryRunner, 'personality_results')) {
      if (!(await this.columnExists(queryRunner, 'personality_results', 'durationSeconds'))) {
        await queryRunner.query('ALTER TABLE `personality_results` ADD COLUMN `durationSeconds` INT NULL')
        // 尽力回填历史行：从 dimensionScores JSON 提取 durationSeconds（失败不阻断迁移链）
        try {
          await queryRunner.query(
            "UPDATE `personality_results` " +
              "SET `durationSeconds` = CAST(JSON_UNQUOTE(JSON_EXTRACT(`dimensionScores`, '$.durationSeconds')) AS UNSIGNED) " +
              "WHERE `durationSeconds` IS NULL AND `dimensionScores` IS NOT NULL " +
              "AND JSON_VALID(`dimensionScores`) " +
              "AND JSON_EXTRACT(`dimensionScores`, '$.durationSeconds') IS NOT NULL",
          )
        } catch (e: any) {
          console.warn(`[migration:AddPersonalityStatsIndexes] durationSeconds 回填跳过: ${e?.message}`)
        }
      }
    }

    // 2. 补充索引
    for (const idx of this.indexes) {
      if (!(await this.tableExists(queryRunner, idx.table))) continue
      if (await this.indexExists(queryRunner, idx.table, idx.name)) continue
      try {
        await queryRunner.query(idx.ddl)
      } catch (e: any) {
        console.warn(`[migration:AddPersonalityStatsIndexes] 跳过 ${idx.table}.${idx.name}: ${e?.message}`)
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const idx of this.indexes) {
      if (!(await this.tableExists(queryRunner, idx.table))) continue
      if (!(await this.indexExists(queryRunner, idx.table, idx.name))) continue
      try {
        await queryRunner.query(`ALTER TABLE \`${idx.table}\` DROP INDEX \`${idx.name}\``)
      } catch (e: any) {
        console.warn(`[migration:AddPersonalityStatsIndexes] 回滚跳过 ${idx.table}.${idx.name}: ${e?.message}`)
      }
    }
    if (
      (await this.tableExists(queryRunner, 'personality_results')) &&
      (await this.columnExists(queryRunner, 'personality_results', 'durationSeconds'))
    ) {
      await queryRunner.query('ALTER TABLE `personality_results` DROP COLUMN `durationSeconds`')
    }
  }

  private async tableExists(qr: QueryRunner, table: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table],
    )
    return Number(rows?.[0]?.c) > 0
  }

  private async columnExists(qr: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    )
    return Number(rows?.[0]?.c) > 0
  }

  private async indexExists(qr: QueryRunner, table: string, name: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT COUNT(*) AS c FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [table, name],
    )
    return Number(rows?.[0]?.c) > 0
  }
}
