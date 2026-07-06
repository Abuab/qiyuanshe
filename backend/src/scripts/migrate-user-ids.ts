import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { UserService } from '../user/user.service'
import { Repository } from 'typeorm'
import { User } from '../entities/User'

async function migrate() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const userRepo = app.get<Repository<User>>('UserRepository')
  const userService = app.get(UserService)

  const users = await userRepo.find({ where: { userId: null as any } })
  console.log(`共有 ${users.length} 个用户需要生成 userId`)

  let generated = 0
  let nicknameUpdated = 0

  for (const user of users) {
    const userId = await userService.generateUserId()
    user.userId = userId

    // 如果 nickname 为空或默认占位值，同步更新
    const isPlaceholder = !user.nickname ||
      user.nickname.startsWith('昵称') ||
      user.nickname === '用户' ||
      user.nickname === '微信用户'
    if (isPlaceholder) {
      user.nickname = `昵称${userId}`
      nicknameUpdated++
    }

    await userRepo.save(user)
    generated++
  }

  console.log(`迁移完成：共处理 ${users.length} 个用户，生成 ${generated} 个 userId，更新 ${nicknameUpdated} 个 nickname`)
  await app.close()
}

migrate().catch((err) => {
  console.error('迁移失败:', err)
  process.exit(1)
})
