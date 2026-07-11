import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBlocksToActivity1753000000008 implements MigrationInterface {
  name = 'AddBlocksToActivity1753000000008'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 幂等：列可能已由早期 DB_SYNC 创建，存在则跳过
    if (!(await this.hasColumn(queryRunner, 'activities', 'detailBlocks'))) {
      await queryRunner.query('ALTER TABLE `activities` ADD COLUMN `detailBlocks` json NULL')
    }
    if (!(await this.hasColumn(queryRunner, 'activities', 'sceneBlocks'))) {
      await queryRunner.query('ALTER TABLE `activities` ADD COLUMN `sceneBlocks` json NULL')
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'activities', 'sceneBlocks')) {
      await queryRunner.query('ALTER TABLE `activities` DROP COLUMN `sceneBlocks`')
    }
    if (await this.hasColumn(queryRunner, 'activities', 'detailBlocks')) {
      await queryRunner.query('ALTER TABLE `activities` DROP COLUMN `detailBlocks`')
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
