import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRefreshTokenVersion1756000000000 implements MigrationInterface {
  name = 'AddRefreshTokenVersion1756000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 刷新令牌版本：仅用于 refresh token 单次轮换，独立于 tokenVersion（幂等，存在则跳过）
    if (!(await this.hasColumn(queryRunner, 'users', 'refresh_token_version'))) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD COLUMN `refresh_token_version` int NOT NULL DEFAULT 0',
      )
    }
    if (!(await this.hasColumn(queryRunner, 'admin_users', 'refresh_token_version'))) {
      await queryRunner.query(
        'ALTER TABLE `admin_users` ADD COLUMN `refresh_token_version` int NOT NULL DEFAULT 0',
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'admin_users', 'refresh_token_version')) {
      await queryRunner.query(
        'ALTER TABLE `admin_users` DROP COLUMN `refresh_token_version`',
      )
    }
    if (await this.hasColumn(queryRunner, 'users', 'refresh_token_version')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `refresh_token_version`')
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
