if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for security. Please set a strong random secret.')
}

if (!process.env.ADMIN_JWT_SECRET) {
  throw new Error('ADMIN_JWT_SECRET environment variable is required for security. Please set a strong random secret different from JWT_SECRET.')
}

export const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
}

export const adminJwtConfig = {
  secret: process.env.ADMIN_JWT_SECRET,
  expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '24h',
}
