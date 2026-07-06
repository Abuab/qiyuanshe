/** 是否为占位昵称（未设置 / 系统默认） */
export function isPlaceholderNickname(nickname: string | null | undefined): boolean {
  if (!nickname) return true
  if (nickname.startsWith('昵称')) return true
  if (nickname === '用户' || nickname === '微信用户') return true
  return false
}

/** 计算用户对外展示名 */
export function getDisplayName(nickname: string | null | undefined, userId: string | null | undefined): string {
  if (isPlaceholderNickname(nickname)) {
    return userId ? `昵称${userId}` : '用户'
  }
  return nickname as string
}
