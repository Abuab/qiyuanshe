# 栖缘社管理后台 Dockerfile
# 多阶段构建：构建阶段 -> 运行阶段

# ============ 构建阶段 ============
FROM node:18 AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV OUTPUT_DIR=dist

# 编译 Vue3 项目
RUN npm run build

# ============ 运行阶段 ============
FROM nginx:alpine AS production

# 复制自定义 nginx 配置（覆盖默认配置）
COPY nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制编译产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 创建 nginx 日志目录
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/log/nginx

# 安装 curl（用于健康检查）
RUN apk add --no-cache curl

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:80/index.html || exit 1

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
