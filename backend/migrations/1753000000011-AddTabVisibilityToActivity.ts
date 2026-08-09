import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTabVisibilityToActivity1753000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 活动详情 Tab 显示控制（默认 1=显示）
    if (!(await this.hasColumn(queryRunner, 'activities', 'showDetailTab'))) {
      await queryRunner.query(
        "ALTER TABLE `activities` ADD COLUMN `showDetailTab` tinyint NOT NULL DEFAULT 1",
      )
    }
    // 活动现场 Tab 显示控制（默认 0=隐藏）
    if (!(await this.hasColumn(queryRunner, 'activities', 'showSceneTab'))) {
      await queryRunner.query(
        "ALTER TABLE `activities` ADD COLUMN `showSceneTab` tinyint NOT NULL DEFAULT 0",
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'activities', 'showSceneTab')) {
      await queryRunner.query('ALTER TABLE `activities` DROP COLUMN `showSceneTab`')
    }
    if (await this.hasColumn(queryRunner, 'activities', 'showDetailTab')) {
      await queryRunner.query('ALTER TABLE `activities` DROP COLUMN `showDetailTab`')
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
