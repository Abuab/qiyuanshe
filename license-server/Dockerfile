FROM node:20-slim

WORKDIR /app

# 先装依赖，利用 Docker 缓存
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

RUN mkdir -p /app/data

ENV NODE_ENV=production

EXPOSE 3002

CMD ["node", "src/server.js"]
