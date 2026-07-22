import { Injectable, OnModuleInit, ForbiddenException } from '@nestjs/common'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { SensitiveWordFilter } from './sensitive-word.filter'

/**
 * 统一内容安全过滤服务
 *
 * 基于 DFA（Trie 树）多模式匹配，O(N) 时间复杂度。
 * 用于用户自定义发言内容（昵称、个性签名、帖子、评论等）的敏感词检测。
 */
@Injectable()
export class ContentFilterService implements OnModuleInit {
  private filter = new SensitiveWordFilter()

  /** 硬编码兜底敏感词库 */
  private static readonly FALLBACK_KEYWORDS: string[] = [
    '傻逼', '傻B', '煞笔', 'SB', 'sb', 'Sb', 'sB',
    '尼玛', '你妈', 'nmb', 'NMB', 'cnm', 'CNM', '草泥马', '艹你', '操你',
    '去死', '去你妈', '滚蛋', '滚犊子',
    '贱人', '婊子', '骚货', '荡妇', '破鞋',
    '垃圾', '废物', '白痴', '脑残', '智障', '弱智', '神经病',
    '狗日的', '日了狗', '他妈的', '特么的', '你妈的', '靠',
    '妈的', '妈蛋', '卧槽', '我操', '我艹', '次奥',
    '畜生', '禽兽', '猪狗不如', '不是人', '狗屁',
    '龟孙子', '王八蛋', '王八', '混蛋',
    '赌博', '博彩', '赌场', '下注', '押注', '赔率', '六合彩', '时时彩', '百家乐',
    '炸金花', '德州扑克', '赌球', '外围',
    '裸聊', '约炮', '嫖娼', '卖淫', '色情', '成人',
    '一夜情', '援交', '包养', '外围女', '大保健',
    '毒品', '冰毒', '海洛因', '大麻', '枪支', '假钞', '洗钱', '诈骗', '传销',
    '高利贷', '套现', '盗刷',
    '加微信', '加我微信', '加VX', '加我VX', '加我vx', '加vx', '加 WX', '加 wx',
    '微商', '刷单', '兼职日结', '扫码', '二维码',
    '加Q', '加q', '加我Q', '加我q', '加QQ', '加qq', '加我QQ', '加我qq',
    '加群', '进群', 'V我', 'v我',
    '台独', '藏独', '疆独', '港独', '法轮功',
  ]

  async onModuleInit() {
    await this.loadSensitiveWords()
  }

  private async loadSensitiveWords(): Promise<void> {
    try {
      const candidateDirs = [
        resolve(process.cwd(), 'config/sensitive-words'),
        resolve(__dirname, '../../../config/sensitive-words'),
        resolve(__dirname, '../../../../config/sensitive-words'),
      ]
      const wordsDir = candidateDirs.find(dir => existsSync(dir))
      if (wordsDir) {
        const txtFiles = readdirSync(wordsDir).filter(f => f.endsWith('.txt'))
        if (txtFiles.length > 0) {
          const wordSet = new Set<string>()
          for (const file of txtFiles) {
            try {
              const raw = readFileSync(resolve(wordsDir, file), 'utf-8')
              raw.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .forEach(word => wordSet.add(word))
            } catch { /* 单个文件读取失败跳过 */ }
          }
          if (wordSet.size > 0) {
            this.filter.build(Array.from(wordSet))
            console.log(`[ContentFilterService] 敏感词库加载完成，共 ${wordSet.size} 个词`)
            return
          }
        }
      }
    } catch (e: any) {
      console.warn('[ContentFilterService] 敏感词库加载失败，使用硬编码兜底:', e?.message)
    }
    this.filter.build(ContentFilterService.FALLBACK_KEYWORDS)
    console.log('[ContentFilterService] 使用硬编码敏感词库兜底')
  }

  /**
   * 检查文本是否包含敏感词
   * @returns 命中的第一个敏感词，未命中返回 null
   */
  check(text: string): string | null {
    if (!text) return null
    return this.filter.check(text)
  }

  /**
   * 检查文本，命中敏感词时抛出 ForbiddenException
   * @param text 待检查文本
   * @param fieldName 字段名称（用于错误提示）
   */
  checkAndThrow(text: string, fieldName: string): void {
    if (!text) return
    const hit = this.check(text)
    if (hit) {
      throw new ForbiddenException(`${fieldName}包含违规内容，请修改后重试`)
    }
  }
}
