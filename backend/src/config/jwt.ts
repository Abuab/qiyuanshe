import * as crypto from 'crypto'

let _jwtSecret: string
let _adminJwtSecret: string

function getJwtSecret(): string {
  if (_jwtSecret) return _jwtSecret

  if (process.env.JWT_SECRET) {
    _jwtSecret = process.env.JWT_SECRET
    return _jwtSecret
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required for security in production. Please set a strong random secret.')
  }

  _jwtSecret = crypto.randomBytes(32).toString('hex')
  console.warn('[SECURITY WARNING] JWT_SECRET is not set. Using a randomly generated temporary key. This will cause all tokens to become invalid on server restart. DO NOT use in production!')
  return _jwtSecret
}

function getAdminJwtSecret(): string {
  if (_adminJwtSecret) return _adminJwtSecret

  if (process.env.ADMIN_JWT_SECRET) {
    _adminJwtSecret = process.env.ADMIN_JWT_SECRET
    return _adminJwtSecret
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_JWT_SECRET environment variable is required for security in production. Please set a strong random secret different from JWT_SECRET.')
  }

  _adminJwtSecret = crypto.randomBytes(32).toString('hex')
  console.warn('[SECURITY WARNING] ADMIN_JWT_SECRET is not set. Using a randomly generated temporary key. This will cause all admin tokens to become invalid on server restart. DO NOT use in production!')
  return _adminJwtSecret
}

export const jwtConfig = {
  get secret() { return getJwtSecret() },
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
}

export const adminJwtConfig = {
  get secret() { return getAdminJwtSecret() },
  expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '24h',
}
