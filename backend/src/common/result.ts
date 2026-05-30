export class Result<T = any> {
  code: number
  message: string
  data: T

  constructor(code: number, message: string, data?: T) {
    this.code = code
    this.message = message
    this.data = data
  }

  static success<T>(data?: T, message: string = 'success'): Result<T> {
    return new Result<T>(200, message, data)
  }

  static error(message: string, code: number = 500): Result<void> {
    return new Result<void>(code, message)
  }

  static unauthorized(message: string = '未授权'): Result<void> {
    return new Result<void>(401, message)
  }

  static forbidden(message: string = '权限不足'): Result<void> {
    return new Result<void>(403, message)
  }

  static notFound(message: string = '资源不存在'): Result<void> {
    return new Result<void>(404, message)
  }

  static badRequest(message: string = '请求参数错误'): Result<void> {
    return new Result<void>(400, message)
  }

  static serverError(message: string = '服务器内部错误'): Result<void> {
    return new Result<void>(500, message)
  }
}
