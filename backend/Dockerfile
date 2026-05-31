# 栖缘社后端服务 Dockerfile
# 基于 Node.js 18 Alpine 镜像构建

FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖（包括开发依赖，用于编译 TypeScript）
RUN npm install

# 复制源代码
COPY . .

# 编译 TypeScript
RUN npm run build

# 生产阶段镜像
FROM node:18-alpine AS production

# 安装 dumb-init 用于优雅地处理进程信号
RUN apk add --no-cache dumb-init

# 设置工作目录
WORKDIR /app

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# 复制编译产物
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# 创建上传目录和日志目录
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nestjs:nodejs /app/uploads /app/logs

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 使用 dumb-init 启动应用
CMD ["dumb-init", "node", "dist/main.js"]
