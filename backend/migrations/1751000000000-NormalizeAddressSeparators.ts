import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 将 users 表中 hometown 与 residence 字段的地址分隔符从斜杠 / 统一替换为逗号 ,
 * 同时兼容已升级的四级地址（省,市,区,街道）
 */
export class NormalizeAddressSeparators1751000000000 implements MigrationInterface {
  name = 'NormalizeAddressSeparators1751000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 将斜杠分隔的旧数据替换为逗号分隔
    await queryRunner.query(`
      UPDATE users SET hometown = REPLACE(hometown, '/', ',') WHERE hometown LIKE '%/%'
    `)
    await queryRunner.query(`
      UPDATE users SET residence = REPLACE(residence, '/', ',') WHERE residence LIKE '%/%'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回退：将逗号替换回斜杠（仅对三级地址生效，四级地址无法安全回退）
    await queryRunner.query(`
      UPDATE users SET hometown = REPLACE(hometown, ',', '/') WHERE hometown LIKE '%,%,%' AND hometown NOT LIKE '%,%,%,%'
    `)
    await queryRunner.query(`
      UPDATE users SET residence = REPLACE(residence, ',', '/') WHERE residence LIKE '%,%,%' AND residence NOT LIKE '%,%,%,%'
    `)
  }
}
