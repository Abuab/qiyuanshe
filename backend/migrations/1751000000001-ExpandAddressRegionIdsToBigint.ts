import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

/**
 * 将 address_region 表的 id 和 parentId 列从 INT 扩展为 BIGINT
 *
 * 背景：街道数据的 12 位行政区划代码超过 INT 最大值（2147483647），
 * 需要用 BIGINT 存储。同时统一 parentId 为 BIGINT 以保持一致性。
 *
 * 运行：npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts
 */
export class ExpandAddressRegionIdsToBigint1751000000001 implements MigrationInterface {
  name = 'ExpandAddressRegionIdsToBigint1751000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // MySQL INT → BIGINT 转换安全，不会丢失数据
    await queryRunner.changeColumn(
      'address_region',
      'id',
      new TableColumn({
        name: 'id',
        type: 'bigint',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      }),
    )

    await queryRunner.changeColumn(
      'address_region',
      'parentId',
      new TableColumn({
        name: 'parentId',
        type: 'bigint',
        default: 0,
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 安全检查：确认表中没有超出 INT 范围的数据
    const [rows] = await queryRunner.query(
      'SELECT COUNT(*) as cnt FROM address_region WHERE id > 2147483647',
    )
    if (Number(rows.cnt) > 0) {
      throw new Error(
        '无法回滚：表中存在超出 INT 范围的街道数据，请先删除 level=4 的街道数据',
      )
    }

    await queryRunner.changeColumn(
      'address_region',
      'id',
      new TableColumn({
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      }),
    )

    await queryRunner.changeColumn(
      'address_region',
      'parentId',
      new TableColumn({
        name: 'parentId',
        type: 'int',
        default: 0,
      }),
    )
  }
}
