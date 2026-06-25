import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVoiceDurationToUser1751000000004 implements MigrationInterface {
  name = 'AddVoiceDurationToUser1751000000004'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`voiceDuration\` int NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        DROP COLUMN \`voiceDuration\`
    `)
  }
}
