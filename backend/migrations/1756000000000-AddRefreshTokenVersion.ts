import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRefreshTokenVersion1756000000000 implements MigrationInterface {
  name = 'AddRefreshTokenVersion1756000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 刷新令牌版本：仅用于 refresh token 单次轮换，独立于 tokenVersion（幂等，存在则跳过）
    // 注意：与 tokenVersion 列命名保持一致（camelCase，未显式指定 name）
    if (!(await this.hasColumn(queryRunner, 'users', 'refreshTokenVersion'))) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD COLUMN `refreshTokenVersion` int NOT NULL DEFAULT 0',
      )
    }
    if (!(await this.hasColumn(queryRunner, 'admin_users', 'refreshTokenVersion'))) {
      await queryRunner.query(
        'ALTER TABLE `admin_users` ADD COLUMN `refreshTokenVersion` int NOT NULL DEFAULT 0',
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'admin_users', 'refreshTokenVersion')) {
      await queryRunner.query(
        'ALTER TABLE `admin_users` DROP COLUMN `refreshTokenVersion`',
      )
    }
    if (await this.hasColumn(queryRunner, 'users', 'refreshTokenVersion')) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `refreshTokenVersion`')
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
