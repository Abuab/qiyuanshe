const isDev = process.env.NODE_ENV !== 'production'

class Logger {
  private tag = '[栖缘社]'

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

// 生产环境禁用 log/info/debug，保留 warn/error
if (!isDev) {
  console.log = () => {}
  console.info = () => {}
  console.debug = () => {}
}
