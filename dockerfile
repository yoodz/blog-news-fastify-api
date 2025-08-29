# 使用官方 Node.js 轻量版镜像
FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

# 拷贝依赖文件，先装依赖（利用缓存）
COPY package*.json ./
RUN npm ci --omit=dev

# 拷贝源码
COPY . .

# Fastify 监听端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
