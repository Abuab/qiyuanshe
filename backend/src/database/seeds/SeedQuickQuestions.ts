/**
 * 快捷问题预设数据初始化脚本
 *
 * 功能：创建预设分类和快捷问题，用于 AI 聊天界面的快捷提问入口
 * 使用 SELECT-then-INSERT 防重复（name/content 无唯一约束，不能依赖 INSERT IGNORE）
 * 可重复执行不产生脏数据
 *
 * 运行方式：
 *   cd backend
 *   npx ts-node src/database/seeds/SeedQuickQuestions.ts
 *
 * 或通过 npm script：
 *   在 package.json 中添加 "seed:quick-questions": "npx ts-node src/database/seeds/SeedQuickQuestions.ts"
 */
import { DataSource } from 'typeorm'
import { Logger } from '@nestjs/common'
import { join } from 'path'

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: join(__dirname, '..', '..', '..', '..', '.env') })

// 预设分类及其快捷问题
const PRESET_DATA: { category: { name: string; sort: number }; questions: { content: string; sort: number }[] }[] = [
  {
    category: { name: '脱单攻略', sort: 1 },
    questions: [
      { content: '怎样才能快速脱单？', sort: 1 },
      { content: '第一次见面聊什么？', sort: 2 },
      { content: '如何提高匹配成功率？', sort: 3 },
      { content: '如何写吸引人的自我介绍？', sort: 4 },
      { content: '约会应该注意什么？', sort: 5 },
      { content: '怎么判断对方是否对我有意思？', sort: 6 },
      { content: '相亲时问什么问题比较好？', sort: 7 },
    ],
  },
  {
    category: { name: '平台介绍', sort: 2 },
    questions: [
      { content: '这个平台怎么用？', sort: 1 },
      { content: '如何完善个人资料？', sort: 2 },
      { content: '平台有哪些功能？', sort: 3 },
      { content: '什么是红娘牵线？', sort: 4 },
      { content: 'VIP 有什么特权？', sort: 5 },
      { content: '如何通过实名认证？', sort: 6 },
      { content: '脱单成功率怎么样？', sort: 7 },
    ],
  },
  {
    category: { name: '情感咨询', sort: 3 },
    questions: [
      { content: '恋爱中如何保持新鲜感？', sort: 1 },
      { content: '和相亲对象聊什么话题？', sort: 2 },
      { content: '异地恋怎么维持？', sort: 3 },
      { content: '如何化解恋爱中的矛盾？', sort: 4 },
      { content: '感觉对方冷淡了怎么办？', sort: 5 },
      { content: '被拒绝了怎么调整心态？', sort: 6 },
    ],
  },
]

const logger = new Logger('SeedQuickQuestions')

async function main() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'lingtong_match',
    entities: [],
  })

  await ds.initialize()
  logger.log('数据库已连接，开始初始化快捷问题预设数据...\n')

  let catCount = 0
  let qCount = 0

  for (const preset of PRESET_DATA) {
    // 先查分类是否已存在（name 无唯一约束，不能依赖 INSERT IGNORE）
    let catRows: any[] = await ds.query(
      `SELECT id FROM quick_question_categories WHERE name = ? AND isDeleted = 0`,
      [preset.category.name],
    )
    let categoryId = catRows[0]?.id

    if (!categoryId) {
      // 不存在则插入
      const catResult: any = await ds.query(
        `INSERT INTO quick_question_categories (name, sort, isEnabled, isDeleted, createdAt, updatedAt)
         VALUES (?, ?, 1, 0, NOW(), NOW())`,
        [preset.category.name, preset.category.sort],
      )
      categoryId = catResult.insertId
      catCount++
      logger.log(`  [新增分类] ${preset.category.name}`)
    }

    if (!categoryId) {
      logger.warn(`  [跳过] 分类 ${preset.category.name} 创建失败`)
      continue
    }

    // 插入该分类下的快捷问题
    for (const q of preset.questions) {
      // 先查问题是否已存在（content 无唯一约束，需手动去重）
      const existRows: any[] = await ds.query(
        `SELECT id FROM quick_questions WHERE content = ? AND categoryId = ? AND isDeleted = 0`,
        [q.content, categoryId],
      )
      if (existRows.length > 0) continue
      await ds.query(
        `INSERT INTO quick_questions (content, categoryId, sort, isEnabled, clickCount, isDeleted, createdAt, updatedAt)
         VALUES (?, ?, ?, 1, 0, 0, NOW(), NOW())`,
        [q.content, categoryId, q.sort],
      )
      qCount++
      logger.log(`    [新增问题] [${preset.category.name}] ${q.content}`)
    }
  }

  logger.log(`初始化完成：新增 ${catCount} 个分类，${qCount} 个快捷问题`)
  await ds.destroy()
}

main().catch((err) => {
  logger.error('种子数据初始化失败：', err)
  process.exit(1)
})
