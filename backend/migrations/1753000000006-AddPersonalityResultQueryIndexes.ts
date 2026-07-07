import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 人格测试数据看板查询索引补强（personality_results）
 *
 * 目的（对照 personality-stats.service.ts 的查询模式）：
 * - (typeCode, isDeleted, testedAt)：typeUsers() 类型下钻分页
 *   WHERE typeCode=? AND isDeleted=0 ORDER BY testedAt DESC，消除 filesort
 * - (isDeleted, testedAt)：overview() 今日新增注册用户 WHERE isDeleted=0 AND testedAt>=?
 * - (isDeleted, durationSeconds)：overview() 平均答题时长 AVG，索引内完成过滤+聚合避免回表
 *
 * 幂等：索引已存在则跳过；仅扩展本模块自有表。
 */
export class AddPersonalityResultQueryIndexes1753000000006 implements MigrationInterface {
  name = 'AddPersonalityResultQueryIndexes1753000000006'

  private readonly indexes: Array<{ table: string; name: string; ddl: string }> = [
    {
      table: 'personality_results',
      name: 'IDX_pr_type_deleted_tested',
      ddl: 'ALTER TABLE `personality_results` ADD INDEX `IDX_pr_type_deleted_tested` (`typeCode`, `isDeleted`, `testedAt`)',
    },
    {
      table: 'personality_results',
      name: 'IDX_pr_deleted_tested',
      ddl: 'ALTER TABLE `personality_results` ADD INDEX `IDX_pr_deleted_tested` (`isDeleted`, `testedAt`)',
    },
    {
      table: 'personality_results',
      name: 'IDX_pr_deleted_duration',
      ddl: 'ALTER TABLE `personality_results` ADD INDEX `IDX_pr_deleted_duration` (`isDeleted`, `durationSeconds`)',
    },
  ]

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const idx of this.indexes) {
      if (!(await this.tableExists(queryRunner, idx.table))) continue
      if (await this.indexExists(queryRunner, idx.table, idx.name)) continue
      try {
        await queryRunner.query(idx.ddl)
      } catch (e: any) {
        console.warn(`[migration:AddPersonalityResultQueryIndexes] 跳过 ${idx.table}.${idx.name}: ${e?.message}`)
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
        console.warn(`[migration:AddPersonalityResultQueryIndexes] 回滚跳过 ${idx.table}.${idx.name}: ${e?.message}`)
      }
    }
  }

  private async tableExists(qr: QueryRunner, table: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table],
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
