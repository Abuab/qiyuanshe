# 使用完整镜像（含 python3/make/g++ 编译工具链），better-sqlite3 无匹配预编译包时需本地编译
FROM node:20

WORKDIR /app

# 国内镜像加速依赖下载与 node-gyp headers 获取
RUN npm config set registry https://registry.npmmirror.com \
    && npm config set disturl https://npmmirror.com/mirrors/node

# 先装依赖，利用 Docker 缓存
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

RUN mkdir -p /app/data

ENV NODE_ENV=production

EXPOSE 3002

CMD ["node", "src/server.js"]
