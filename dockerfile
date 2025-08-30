FROM node:20-alpine AS runner

ENV TZ=Asia/Shanghai

ENV NODE_ENV=production
WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 先复制依赖清单，加速缓存
COPY package.json pnpm-lock.yaml* ./

# 装依赖（只装 prod）
RUN pnpm install --frozen-lockfile --prod

# 再复制源码
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
