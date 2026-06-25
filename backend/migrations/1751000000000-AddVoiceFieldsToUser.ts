import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVoiceFieldsToUser1751000000000 implements MigrationInterface {
  name = 'AddVoiceFieldsToUser1751000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`voiceUrl\` varchar(500) NULL,
        ADD COLUMN \`voiceAuditStatus\` tinyint NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        DROP COLUMN \`voiceUrl\`,
        DROP COLUMN \`voiceAuditStatus\`
    `)
  }
}
