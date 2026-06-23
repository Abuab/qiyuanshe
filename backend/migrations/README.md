# 数据库 Migration 管理

## 重要警告

**生产环境 必须 使用 Migration 管理 schema 变更，严禁 依赖 `DB_SYNC=true`！**

`synchronize: true` 在 TypeORM 初始化时会自动同步实体定义到数据库（包括删表、删列），这在生产环境中可能导致**数据丢失**。Migration 让你手写每一步 DDL，精确控制变更内容。

## 环境要求

- Node.js >= 18
- ts-node（已安装）
- TypeORM CLI（随 typeorm 包安装）

## 命令参考

```bash
# 1. 创建新的 Migration 文件
npx typeorm-ts-node-commonjs migration:create backend/migrations/{MigrationName}

# 示例：创建一个修改 VipOrder 金额字段的 Migration
npx typeorm-ts-node-commonjs migration:create backend/migrations/ChangeAmountToCents

# 2. 运行待执行的 Migration（按顺序执行 migration 文件中的 up 方法）
npx typeorm-ts-node-commonjs migration:run -d backend/src/config/data-source.ts

# 3. 回滚最近一次 Migration（执行最近一次 migration 文件中的 down 方法）
npx typeorm-ts-node-commonjs migration:revert -d backend/src/config/data-source.ts

# 4. 查看 Migration 状态（哪些已执行，哪些待执行）
npx typeorm-ts-node-commonjs migration:show -d backend/src/config/data-source.ts
```

## Migration 文件编写规范

每个 Migration 文件必须实现 `MigrationInterface` 接口，包含 `up` 和 `down` 两个方法：

```typescript
import { MigrationInterface, QueryRunner } from "typeorm"

export class ChangeAmountToCents1680000000000 implements MigrationInterface {
    name = 'ChangeAmountToCents1680000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 正向变更：修改 vip_orders 表的 amount 字段类型
        await queryRunner.query(`
            ALTER TABLE vip_orders 
            MODIFY COLUMN amount BIGINT NOT NULL COMMENT '支付金额（分）'
        `)
        await queryRunner.query(`
            ALTER TABLE vip_orders 
            MODIFY COLUMN refund_amount BIGINT NULL COMMENT '退款金额（分）'
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 回滚变更：恢复为 decimal 类型
        await queryRunner.query(`
            ALTER TABLE vip_orders 
            MODIFY COLUMN amount DECIMAL(10,2) NOT NULL COMMENT '支付金额（元）'
        `)
        await queryRunner.query(`
            ALTER TABLE vip_orders 
            MODIFY COLUMN refund_amount DECIMAL(10,2) NULL COMMENT '退款金额'
        `)
    }
}
```

## 注意事项

1. **每次部署前**先运行 `migration:run` 确保 schema 与代码一致。
2. **每个 Migration 的 `down` 方法必须实现**，确保出问题时可以回滚。
3. Migration 文件一旦执行，**不要修改**该文件的 `up`/`down` 方法。如需进一步变更，创建新的 Migration。
4. 在执行 ALTER TABLE 前，**建议先备份数据库**。
5. 数据迁移（如 `amount DECIMAL → BIGINT` 需要乘以 100 转换已有数据）应在 Migration 的 `up` 中完成，写在结构变更语句之前。

## 数据库配置

Migration 使用的数据库连接配置位于 `backend/src/config/data-source.ts`，该文件复用 `backend/src/config/database.ts` 的配置参数，确保与 NestJS 应用使用一致的数据库连接信息。
