# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm ci --only=production --ignore-scripts

# 生产阶段
FROM node:18-alpine

# 安装 PM2
RUN npm install -g pm2 && \
    apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# 复制 node_modules 和应用代码
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# 复制 PM2 配置文件
COPY ecosystem.config.js .

USER nodejs

EXPOSE 3000

# 使用 PM2 作为进程管理器
CMD ["pm2-runtime", "start", "ecosystem.config.js"]