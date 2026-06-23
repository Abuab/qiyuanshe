/**
 * DFA（确定性有限自动机）敏感词过滤器
 *
 * 使用 Trie 树实现多模式匹配，时间复杂度 O(N)（N 为待检测文本长度），
 * 替换原有的线性遍历 O(N*M)（M 为词库大小），显著提升高并发场景性能。
 *
 * 特性：
 * - 大小写不敏感匹配
 * - 支持去除空格后检查（防止用空格绕过）
 * - 一次遍历返回所有命中词
 */

interface TrieNode {
  children: Map<number, TrieNode>
  isEnd: boolean
  word: string
}

export class SensitiveWordFilter {
  private root: TrieNode = { children: new Map(), isEnd: false, word: '' }
  private built = false

  /**
   * 构建 DFA 字典树
   * @param keywords 敏感词数组
   */
  build(keywords: string[]): void {
    this.root = { children: new Map(), isEnd: false, word: '' }
    for (const word of keywords) {
      if (!word) continue
      this.insert(word.toLowerCase(), word)
    }
    this.built = true
  }

  private insert(lower: string, original: string): void {
    let node = this.root
    for (let i = 0; i < lower.length; i++) {
      const charCode = lower.charCodeAt(i)
      if (!node.children.has(charCode)) {
        node.children.set(charCode, { children: new Map(), isEnd: false, word: '' })
      }
      node = node.children.get(charCode)!
    }
    node.isEnd = true
    node.word = original // 保留原始大小写形式，用于日志记录
  }

  /**
   * 检查文本是否包含敏感词。
   * 同时检查原文和去除所有空格后的文本。
   * @returns 命中的第一个敏感词，未命中返回 null
   */
  check(text: string): string | null {
    if (!this.built || !text) return null

    // 先检查原文
    const hit = this.matchOne(text)
    if (hit) return hit

    // 去除所有空格后检查（防止空格绕过）
    const stripped = text.replace(/\s+/g, '')
    if (stripped === text) return null
    return this.matchOne(stripped)
  }

  /**
   * 在文本中匹配第一个敏感词
   */
  private matchOne(text: string): string | null {
    const lower = text.toLowerCase()
    const n = lower.length

    for (let i = 0; i < n; i++) {
      let node: TrieNode | undefined = this.root
      for (let j = i; j < n; j++) {
        const charCode = lower.charCodeAt(j)
        node = node.children.get(charCode)
        if (!node) break
        if (node.isEnd) {
          return node.word
        }
      }
    }
    return null
  }

  /**
   * 返回文本中命中的全部敏感词（去重）。
   * 用于审核日志记录等需要完整命中信息的场景。
   */
  findAll(text: string): string[] {
    if (!this.built || !text) return []

    const hitSet = new Set<string>()

    // 检查原文
    this.matchAll(text, hitSet)

    // 检查去空格后的文本
    const stripped = text.replace(/\s+/g, '')
    if (stripped !== text) {
      this.matchAll(stripped, hitSet)
    }

    return Array.from(hitSet)
  }

  private matchAll(text: string, result: Set<string>): void {
    const lower = text.toLowerCase()
    const n = lower.length

    for (let i = 0; i < n; i++) {
      let node: TrieNode | undefined = this.root
      for (let j = i; j < n; j++) {
        const charCode = lower.charCodeAt(j)
        node = node.children.get(charCode)
        if (!node) break
        if (node.isEnd) {
          result.add(node.word)
        }
      }
    }
  }

  /** 词库中关键词数量 */
  get size(): number {
    return this.countNodes(this.root)
  }

  private countNodes(node: TrieNode): number {
    let count = node.isEnd ? 1 : 0
    for (const child of node.children.values()) {
      count += this.countNodes(child)
    }
    return count
  }
}
