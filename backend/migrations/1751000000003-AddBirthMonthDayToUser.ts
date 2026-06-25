import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBirthMonthDayToUser1751000000003 implements MigrationInterface {
  name = 'AddBirthMonthDayToUser1751000000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`birthMonth\` tinyint NULL,
        ADD COLUMN \`birthDay\` tinyint NULL
    `)
    // 现有用户统一设置出生月日为 5月1日（避免 null 值导致 DTO 验证失败）
    await queryRunner.query(`
      UPDATE \`users\` SET \`birthMonth\` = 5, \`birthDay\` = 1 WHERE \`birthMonth\` IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        DROP COLUMN \`birthMonth\`,
        DROP COLUMN \`birthDay\`
    `)
  }
}
