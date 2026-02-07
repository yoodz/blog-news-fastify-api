# 博客新闻 API 接口文档

**基础路径**: `/blogNewsApi`

---

## 目录

- [文章相关](#文章相关)
- [RSS 管理](#rss-管理)
- [访问统计](#访问统计)
- [系统接口](#系统接口)

---

## 文章相关

### GET /article - 获取文章列表

获取所有文章列表，按发布日期降序排列。

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "config": {
    "key": "update_at",
    "value": "2026-01-31 06:00"
  },
  "result": [
    {
      "_id": "656b8a1e2e1f4c001f8b4567",
      "title": "文章标题",
      "pubDate": "2026-01-31 10:00",
      "description": "文章描述",
      "link": "https://example.com/article",
      "hostname": "example.com",
      "rssUrl": "https://example.com/rss",
      "pv": 100,
      "like": 5,
      "createAt": 1738284000000
    }
  ],
  "totalRss": 5
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 操作是否成功 |
| config | object | 系统配置信息 |
| result | array | 文章列表数组 |
| totalRss | number | RSS 源总数 |

**错误响应**:
```json
{
  "error": "错误信息"
}
```

---

### GET /article/pv - 增加文章浏览量

增加指定文章的浏览量（PV）。

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 文章的 ObjectId |

**响应示例**:
```json
{
  "success": true,
  "id": "656b8a1e2e1f4c001f8b4567",
  "pv": 101
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 操作是否成功 |
| id | string | 文章 ID |
| pv | number | 更新后的浏览量 |

**错误响应**:
```json
{
  "error": "缺少 id 参数"
}
```

---

### GET /task - 手动触发 RSS 抓取任务

手动触发 RSS 更新任务，解析所有启用的 RSS 源并抓取最新文章。

**请求参数**: 无

**功能说明**:
- 从数据库获取所有启用的 RSS 源
- 解析每个 RSS 源获取最新文章
- 将新文章插入数据库（基于链接去重）
- 更新最后执行时间到 config 集合
- 触发 Cloudflare Pages 自动部署

**响应**: 无直接响应，执行后台任务

---

## RSS 管理

### POST /rss - 新增 RSS 源

新增 RSS 源地址，并自动抓取该源的文章。

**请求 Body**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| rssUrl | string | 是 | RSS 源地址 |

**请求示例**:
```bash
curl -X POST http://localhost:3000/blogNewsApi/rss \
  -H "Content-Type: application/json" \
  -d '{"rssUrl": "https://example.com/rss"}'
```

**响应示例**:
```json
{
  "success": true
}
```

或当 RSS 已存在时:
```json
{
  "success": true,
  "repeat": true
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 操作是否成功 |
| repeat | boolean | RSS 源是否已存在 |

**错误响应**:
```json
{
  "error": "缺少必要字段"
}
```

---

### GET /rss - 获取 RSS 源列表

获取 RSS 源列表，支持分页和筛选。

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 10 |
| auditStatus | number | 否 | 审核状态筛选 |
| deleted | number | 否 | 删除状态筛选（0:未删除, 1:已删除） |

**请求示例**:
```bash
# 获取第一页，每页 10 条
curl http://localhost:3000/blogNewsApi/rss?page=1&pageSize=10

# 只获取未删除且已启用的 RSS 源
curl http://localhost:3000/blogNewsApi/rss?deleted=0&auditStatus=1
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "656b8a1e2e1f4c001f8b4567",
      "title": "示例博客",
      "rssUrl": "https://example.com/rss",
      "image": "https://example.com/icon.jpg",
      "description": "这是一个技术博客",
      "lastBuildDate": "2026-01-31T10:00:00.000Z",
      "generator": "WordPress",
      "deleted": 0,
      "auditStatus": 1,
      "init": 1,
      "createAt": "2026-01-31 10:00"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 25
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 操作是否成功 |
| data | array | RSS 源列表数组 |
| pagination | object | 分页信息 |

**RSS 源字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | ObjectId | RSS 源 ID |
| title | string | RSS 标题 |
| rssUrl | string | RSS 地址 |
| image | string | 封面图片 |
| description | string | 描述信息 |
| lastBuildDate | string | 最后更新时间 |
| deleted | number | 是否删除（0:否, 1:是） |
| auditStatus | number | 审核状态（0:未审核, 1:已通过） |
| init | number | 是否初始化 |
| createAt | string | 创建时间 |

---

### GET /rss/:id - 获取 RSS 源详情

获取指定 ID 的 RSS 源详情。

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | RSS 源的 ObjectId |

**请求示例**:
```bash
curl http://localhost:3000/blogNewsApi/rss/656b8a1e2e1f4c001f8b4567
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "_id": "656b8a1e2e1f4c001f8b4567",
    "title": "示例博客",
    "rssUrl": "https://example.com/rss",
    "description": "这是一个技术博客",
    "deleted": 0,
    "auditStatus": 1
  }
}
```

**错误响应**:
```json
{
  "error": "RSS 源不存在"
}
```

---

### PUT /rss/:id - 更新 RSS 源

更新指定 RSS 源的信息。

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | RSS 源的 ObjectId |

**请求 Body**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | RSS 标题 |
| description | string | 否 | 描述信息 |
| auditStatus | number | 否 | 审核状态（0:未审核, 1:已通过） |
| deleted | number | 否 | 删除状态（0:未删除, 1:已删除） |

**请求示例**:
```bash
curl -X PUT http://localhost:3000/blogNewsApi/rss/656b8a1e2e1f4c001f8b4567 \
  -H "Content-Type: application/json" \
  -d '{"title": "新标题", "auditStatus": 1}'
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "_id": "656b8a1e2e1f4c001f8b4567",
    "title": "新标题",
    "auditStatus": 1
  }
}
```

**错误响应**:
```json
{
  "error": "RSS 源不存在"
}
```

---

### DELETE /rss/:id - 删除 RSS 源（软删除）

软删除指定 RSS 源（将 deleted 设为 1）。

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | RSS 源的 ObjectId |

**请求示例**:
```bash
curl -X DELETE http://localhost:3000/blogNewsApi/rss/656b8a1e2e1f4c001f8b4567
```

**响应示例**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

**错误响应**:
```json
{
  "error": "RSS 源不存在"
}
```

---

### DELETE /rss/:id/hard - 彻底删除 RSS 源

从数据库中彻底删除指定 RSS 源。

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | RSS 源的 ObjectId |

**请求示例**:
```bash
curl -X DELETE http://localhost:3000/blogNewsApi/rss/656b8a1e2e1f4c001f8b4567/hard
```

**响应示例**:
```json
{
  "success": true,
  "message": "彻底删除成功"
}
```

**错误响应**:
```json
{
  "error": "RSS 源不存在"
}
```

---

## 访问统计

### GET /track-visit - 记录页面访问

记录页面访问量并返回当前访问统计。

**请求参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| slug | string | 否 | "/" | 页面标识符 |

**响应示例**:
```json
{
  "slug": "/",
  "count": 100,
  "formattedObject": {
    "/": 100,
    "/about": 25,
    "/article/1": 50
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| slug | string | 当前请求的页面标识 |
| count | number | 当前页面的访问量 |
| formattedObject | object | 所有页面的访问量统计（查询根路径时返回） |

**功能说明**:
- 更新指定 slug 的访问计数
- 记录详细的访问日志（精确到分钟）到 `visits_logs` 集合
- 如果是根路径 "/"，返回所有页面的访问统计
- 如果是具体路径，返回该路径的访问统计

**错误响应**:
```json
{
  "error": "错误信息"
}
```

---

### GET /track-visit-stats - 获取访问统计详情

获取页面访问统计详情，按分钟聚合访问量。

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| slug | string | 否 | 页面标识符，过滤特定页面 |
| startTime | string | 否 | 开始时间，格式：`YYYY-MM-DD HH:mm` |
| endTime | string | 否 | 结束时间，格式：`YYYY-MM-DD HH:mm` |

**请求示例**:
```
GET /track-visit-stats?startTime=2026-01-31 10:00&endTime=2026-01-31 12:00
```

**响应示例**:
```json
{
  "success": true,
  "result": {
    "2026-01-31 10:00": 5,
    "2026-01-31 10:01": 8,
    "2026-01-31 10:02": 3,
    "2026-01-31 10:03": 12
  },
  "total": 28
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 操作是否成功 |
| result | object | 按分钟统计的访问量，键为时间字符串，值为访问次数 |
| total | number | 时间范围内的总访问次数 |

**功能说明**:
- 可选过滤特定页面（通过 slug 参数）
- 可选过滤时间范围（通过 startTime 和 endTime 参数）
- 将访问日志按分钟聚合统计
- 返回每分钟的访问次数和总计

**记录的访问者信息**:
- `ip` - 访问者 IP 地址
- `userAgent` - 浏览器用户代理
- `referer` - 来源页面
- `acceptLanguage` - 语言偏好
- `isBot` - 是否为爬虫（自动识别常见爬虫）

**错误响应**:
```json
{
  "error": "错误信息"
}
```

---

## 系统接口

### GET / - 根路径

API 根路径，用于健康检查。

**请求参数**: 无

**响应示例**:
```json
{
  "root": true
}
```

---

## 数据库集合说明

### visits 集合（访问统计）
```javascript
{
  slug: string,      // 页面标识
  count: number      // 访问次数
}
```

### visits_logs 集合（访问日志）
```javascript
{
  slug: string,      // 页面标识
  timestamp: Date,   // 访问时间戳
  minuteKey: string, // 分钟维度键（格式：YYYY-MM-DD HH:mm）
  visitor: {
    ip: string,          // 访问者 IP 地址
    userAgent: string,   // 用户代理（浏览器信息）
    referer: string,     // 来源页面
    acceptLanguage: string, // 语言偏好
    isBot: boolean       // 是否为爬虫
  }
}
```

### article 集合（文章）
```javascript
{
  link: string,      // 文章链接
  title: string,     // 标题
  pubDate: string,   // 发布日期
  pv: number,        // 页面浏览量
  like: number,      // 点赞数
  createAt: number,  // 创建时间戳
  rssUrl: string,    // 来源 RSS 地址
  hostname: string,  // 来源域名
  description: string // 文章描述
}
```

### rss 集合（RSS 源）
```javascript
{
  title: string,
  rssUrl: string,
  image: string,
  description: string,
  lastBuildDate: string,
  generator: string,
  deleted: number,
  auditStatus: number,
  init: number,
  createAt: string
}
```

---

## 建议的数据库索引

为了提升查询性能，建议创建以下索引：

```javascript
// visits_logs 集合索引
db.visits_logs.createIndex({ minuteKey: 1 })
db.visits_logs.createIndex({ slug: 1, timestamp: -1 })

// article 集合索引
db.article.createIndex({ link: 1 }, { unique: true })
db.article.createIndex({ pubDate: -1 })

// rss 集合索引
db.rss.createIndex({ rssUrl: 1 }, { unique: true })
```

---

## 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 资源未找到 |
| 500 | 服务器内部错误 |
