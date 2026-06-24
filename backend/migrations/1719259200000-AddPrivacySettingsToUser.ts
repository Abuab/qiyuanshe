import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPrivacySettingsToUser1719259200000 implements MigrationInterface {
  name = 'AddPrivacySettingsToUser1719259200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`showBasicProfile\` tinyint NOT NULL DEFAULT 1,
        ADD COLUMN \`delegateToPlatform\` tinyint NOT NULL DEFAULT 0
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        DROP COLUMN \`showBasicProfile\`,
        DROP COLUMN \`delegateToPlatform\`
    `)
  }
}
