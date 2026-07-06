import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 补建 profile_visits 访问者索引
 *
 * 背景：AddMissingIndexes 迁移最初误用了实体属性名 visitorUserId 作为列名，
 * 而 profile_visits 表实际使用 snake_case 列 visitor_user_id，导致该索引在生产未能建立。
 * 本迁移使用正确列名幂等补建（已存在则跳过）。
 */
export class AddProfileVisitsVisitorIndex1753000000001 implements MigrationInterface {
  name = 'AddProfileVisitsVisitorIndex1753000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner, 'profile_visits'))) return
    if (await this.indexExists(queryRunner, 'profile_visits', 'IDX_profile_visits_visitorUserId')) return
    try {
      await queryRunner.query(
        'ALTER TABLE `profile_visits` ADD INDEX `IDX_profile_visits_visitorUserId` (`visitor_user_id`)',
      )
    } catch (e: any) {
      console.warn(`[migration:AddProfileVisitsVisitorIndex] 跳过: ${e?.message}`)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.indexExists(queryRunner, 'profile_visits', 'IDX_profile_visits_visitorUserId'))) return
    await queryRunner.query('ALTER TABLE `profile_visits` DROP INDEX `IDX_profile_visits_visitorUserId`')
  }

  private async tableExists(qr: QueryRunner, table: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT COUNT(*) AS c FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
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
