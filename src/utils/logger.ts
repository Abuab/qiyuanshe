const isDev = process.env.NODE_ENV !== 'production'

class Logger {
  private tag = '[App]'

  setTag(name: string) {
    this.tag = `[${name}]`
  }

  debug(...args: unknown[]) {
    if (isDev) console.log(this.tag, '[D]', ...args)
  }

  info(...args: unknown[]) {
    if (isDev) console.info(this.tag, '[I]', ...args)
  }

  warn(...args: unknown[]) {
    console.warn(this.tag, '[W]', ...args)
  }

  error(...args: unknown[]) {
    console.error(this.tag, '[E]', ...args)
  }
}

export const logger = new Logger()

// 初始化日志标签（默认值，后续可调用 setTag 更新）
// 生产环境禁用 log/info/debug，保留 warn/error
if (!isDev) {
  console.log = () => {}
  console.info = () => {}
  console.debug = () => {}
}
