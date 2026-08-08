import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddActivityHeaderFields1753000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE activities
        ADD COLUMN headerType VARCHAR(20) DEFAULT 'poster',
        ADD COLUMN compressedCover VARCHAR(500) NULL,
        ADD COLUMN headerConfig JSON NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE activities
        DROP COLUMN headerType,
        DROP COLUMN compressedCover,
        DROP COLUMN headerConfig
    `)
  }
}
