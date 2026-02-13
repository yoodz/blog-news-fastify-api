# Blog News Fastify API

一个基于 Fastify 框架的博客新闻聚合 API 服务，支持 RSS 源管理、文章采集、访问统计等功能。

## 功能特性

### RSS 管理
- 新增/删除 RSS 源（支持软删除和硬删除）
- RSS 源列表查询（支持分页、筛选、排序）
- RSS 源审核状态管理
- 自动解析 RSS 源元数据（标题、描述、图标等）

### 文章管理
- 自动采集并存储 RSS 文章
- 文章浏览量（PV）统计
- 按发布时间倒序获取文章列表

### 访问统计
- 页面访问量追踪
- 访问日志记录（包含 IP、User-Agent、Referer 等）
- 按日期统计访问数据
- 爬虫识别与过滤
- 每日访问报告（定时任务）

### 定时任务
- **RSS 更新任务**: 每 5 分钟执行一次，自动更新所有启用的 RSS 源
- **每日访问报告**: 每天早上 6 点执行，生成前一天的访问统计报告

## 技术栈

- **框架**: [Fastify](https://fastify.dev/) - 高性能 Node.js Web 框架
- **数据库**: [MongoDB](https://www.mongodb.com/) - 使用 `@fastify/mongodb` 插件
- **RSS 解析**: [rss-parser](https://www.npmjs.com/package/rss-parser)
- **定时任务**: [node-cron](https://www.npmjs.com/package/node-cron)
- **日期处理**: [dayjs](https://day.js.org/)

## 项目结构

```
blog-news-fastify-api/
├── app.js              # 应用入口
├── package.json
├── routes/             # 路由目录
│   ├── root.js         # 根路由（健康检查）
│   ├── article.js      # 文章相关路由
│   ├── rss.js          # RSS 源管理路由
│   ├── track-visit.js  # 访问追踪路由
│   └── track-visit-stats.js  # 访问统计路由
├── tasks/              # 定时任务目录
│   ├── index.js
│   ├── rssUpdate.js    # RSS 更新任务
│   └── dailyVisitReport.js  # 每日访问报告任务
└── utils/              # 工具函数目录
    ├── feedUtil.js     # RSS 解析工具
    ├── message.js      # 消息通知
    └── notify.js       # Bark 通知
```

## 快速开始

### 安装依赖

```bash
npm install
# 或
pnpm install
```

### 环境配置

创建 `.env` 文件并配置以下变量：

```env
NODE_ENV=development
```

### 配置 MongoDB

在 [app.js](app.js) 中配置 MongoDB 连接：

```javascript
app.register(fastifyMongo, {
  url: 'mongodb://username:password@host:port/database?authSource=admin',
  forceClose: true
});
```

### 启动服务

```bash
# 开发模式（支持热重载）
npm run dev

# 生产模式
npm start
```

服务默认运行在 `http://localhost:3333`

## API 文档

所有 API 路由都带有 `/blogNewsApi` 前缀。

### 健康检查

```
GET /blogNewsApi/healthy
```

### RSS 源管理

#### 获取 RSS 列表
```
GET /blogNewsApi/rss
```

查询参数：
- `page` - 页码（默认: 1）
- `pageSize` - 每页数量（默认: 10）
- `auditStatus` - 审核状态（0/1）
- `deleted` - 删除状态（0/1）
- `title` - 标题模糊搜索
- `rssUrl` - RSS 地址模糊搜索
- `sortField` - 排序字段
- `sortOrder` - 排序方向（ascend/descend）

#### 新增 RSS
```
POST /blogNewsApi/rss
```

请求体：
```json
{
  "rssUrl": "https://example.com/rss",
  "title": "示例RSS源"
}
```

#### 更新 RSS
```
PUT /blogNewsApi/rss/:id
```

#### 删除 RSS（软删除）
```
DELETE /blogNewsApi/rss/:id
```

#### 彻底删除 RSS
```
DELETE /blogNewsApi/rss/:id/hard
```

### 文章管理

#### 获取文章列表
```
GET /blogNewsApi/article
```

#### 增加文章浏览量
```
GET /blogNewsApi/article/pv?id={articleId}
```

### 访问统计

#### 追踪访问
```
GET /blogNewsApi/track-visit?slug={pageSlug}
```

#### 访问统计
```
GET /blogNewsApi/track-visit-stats
```

查询参数：
- `slug` - 页面标识
- `startTime` - 开始时间（格式: YYYY-MM-DD HH:mm）
- `endTime` - 结束时间（格式: YYYY-MM-DD HH:mm）

## 定时任务

### RSS 更新任务
- **执行频率**: 每 5 分钟
- **时区**: Asia/Shanghai
- **功能**:
  - 解析所有启用的 RSS 源
  - 采集新文章并存入数据库
  - 更新 RSS 源元数据
  - 发送更新结果通知（通过 Bark）

### 每日访问报告
- **执行频率**: 每天早上 6 点
- **时区**: Asia/Shanghai
- **功能**: 生成前一天的访问统计报告

## 开发

### 运行测试

```bash
npm test
```

### 目录别名

项目配置了以下路径别名：

```javascript
@utils -> ./utils
@tasks -> ./tasks
```

## 线上部署

```bash
docker-compose pull && docker-compose down && docker-compose up -d
```

部署前请确保：
1. MongoDB 数据库已配置
2. `NODE_ENV=production`
3. 修改 CORS 配置中的白名单域名

## 许可证

ISC
