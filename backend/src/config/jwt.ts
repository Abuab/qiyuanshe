export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'qiyuanshe-jwt-secret-key-2024',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
}
