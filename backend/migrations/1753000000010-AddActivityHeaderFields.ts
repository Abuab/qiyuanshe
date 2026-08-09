import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddActivityHeaderFields1753000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner, 'activities', 'headerType'))) {
      await queryRunner.query("ALTER TABLE `activities` ADD COLUMN `headerType` VARCHAR(20) DEFAULT 'poster'")
    }
    if (!(await this.hasColumn(queryRunner, 'activities', 'compressedCover'))) {
      await queryRunner.query('ALTER TABLE `activities` ADD COLUMN `compressedCover` VARCHAR(500) NULL')
    }
    if (!(await this.hasColumn(queryRunner, 'activities', 'headerConfig'))) {
      await queryRunner.query('ALTER TABLE `activities` ADD COLUMN `headerConfig` JSON NULL')
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'activities', 'headerConfig')) {
      await queryRunner.query('ALTER TABLE `activities` DROP COLUMN `headerConfig`')
    }
    if (await this.hasColumn(queryRunner, 'activities', 'compressedCover')) {
      await queryRunner.query('ALTER TABLE `activities` DROP COLUMN `compressedCover`')
    }
    if (await this.hasColumn(queryRunner, 'activities', 'headerType')) {
      await queryRunner.query('ALTER TABLE `activities` DROP COLUMN `headerType`')
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
