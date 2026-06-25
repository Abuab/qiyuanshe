import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBirthMonthDayToUser1751000000003 implements MigrationInterface {
  name = 'AddBirthMonthDayToUser1751000000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`birthMonth\` tinyint NULL,
        ADD COLUMN \`birthDay\` tinyint NULL
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
