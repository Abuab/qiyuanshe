# 栖缘社后端服务 Dockerfile
# 基于 Node.js 20 Alpine 镜像构建，多阶段构建

FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖（包括开发依赖，用于编译 TypeScript）
RUN npm ci

# 复制源代码
COPY . .

# 编译 TypeScript
RUN npm run build

# 删除开发依赖，减小生产镜像体积
RUN npm prune --omit=dev

# 生产阶段镜像
FROM node:20-alpine AS production

# 安装 curl（健康检查）、su-exec（启动脚本切换用户）、字体包（svg-captcha）和 tzdata（时区）
RUN apk add --no-cache curl su-exec fontconfig ttf-dejavu tzdata

# 设置工作目录
WORKDIR /app

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# 复制编译产物
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# 创建上传目录和日志目录（包括 cert 子目录）
RUN mkdir -p /app/uploads/cert /app/logs && \
    chown -R nestjs:nodejs /app/uploads /app/logs

# 复制启动脚本（必须以 root 运行，脚本内部切换到 nestjs）
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 启动脚本：以 root 身份创建目录并授权 → 切换 nestjs 用户 → 启动应用
ENTRYPOINT ["/docker-entrypoint.sh"]
