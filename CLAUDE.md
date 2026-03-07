# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A blog news aggregation API built with Fastify that fetches articles from RSS feeds, manages content, and tracks visitor statistics. Features include RSS source management, automated article collection, visit tracking, and image hosting via UpYun.

## Development Commands

```bash
# Install dependencies
pnpm install

# Development mode (hot reload on port 3333)
npm run dev

# Production mode
npm start

# Run tests
npm test
```

## Project Architecture

### Entry Points
- **[app.js](app.js)** - Main application entry, registers plugins, routes, and scheduled tasks
- **[server.js](server.js)** - HTTP server setup with pino-pretty logging

### Path Aliases
```javascript
@utils -> ./utils
@tasks -> ./tasks
```

### Plugin System
All plugins in `plugins/` are auto-loaded via `@fastify/autoload`:

- **[requestLogger.js](plugins/requestLogger.js)** - Logs all requests to MongoDB `request_logs` collection with IP, timing, errors
- **[authHook.js](plugins/authHook.js)** - JWT authentication hook, injects `request.user` for protected routes
- **[support.js](plugins/support.js)** - Fastify default support plugin
- **[sensible.js](plugins/sensible.js)** - @fastify/sensible wrapper

### Routes Structure
All routes are auto-loaded and prefixed with `/blogNewsApi`:

- **[root.js](routes/root.js)** - Health check at `/blogNewsApi/healthy`
- **[article.js](routes/article.js)** - Article CRUD, PV tracking
- **[rss.js](routes/rss.js)** - RSS source management (add/update/delete, with soft/hard delete)
- **[track-visit.js](routes/track-visit.js)** - Page visit tracking to `visits` and `visits_logs` collections
- **[track-visit-stats.js](routes/track-visit-stats.js)** - Visit statistics with time filtering
- **[user.js](routes/user.js)** - User authentication (login/register)
- **[images.js](routes/images.js)** - Image upload/management via UpYun CDN

### Scheduled Tasks (node-cron)
All tasks in `tasks/` run on Asia/Shanghai timezone:

- **rssUpdate** - Runs every 5 minutes, fetches articles from enabled RSS feeds
- **dailyVisitReport** - Runs daily at 6 AM, generates visit statistics
- **cleanupRequestLogs** - Runs daily at 2 AM, removes logs older than 30 days

### Utilities
- **[feedUtil.js](utils/feedUtil.js)** - RSS parsing with `rss-parser`, date filtering
- **[auth.js](utils/auth.js)** - JWT token generation/verification, bcrypt password hashing
- **[notify.js](utils/notify.js)** - Bark push notifications
- **[message.js](utils/message.js)** - Message utilities

## Database Collections

- **rss** - RSS sources (title, rssUrl, auditStatus, deleted)
- **article** - Fetched articles (link, title, pubDate, pv, like, rssUrl, hostname)
- **visits** - Page visit counters (slug, count)
- **visits_logs** - Detailed visit logs with timestamp, visitor info, bot detection
- **request_logs** - HTTP request logs (auto-populated by requestLogger plugin)
- **images** - Uploaded image metadata (UpYun integration)
- **users** - User accounts
- **config** - System configuration (e.g., last RSS update time)

## Environment Variables

Required in `.env`:

```bash
# Server
NODE_ENV=development|production
PORT=3000

# MongoDB
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_USER=username
MONGODB_PASSWORD=password
MONGODB_DATABASE=blog-news

# JWT
JWT_SECRET=your-secret-key

# Cloudflare Pages deployment webhook (optional)
CLOUDFLARE_URL=https://api.cloudflare.com/...

# Bark notifications (optional)
BARK=https://api.day.app/...

# UpYun CDN (for images)
UPYUN_BUCKET=bucket-name
UPYUN_OPERATOR=operator
UPYUN_PASSWORD=password
UPYUN_DOMAIN=https://your-domain.upyun.com
UPYUN_PROTOCOL=https

# Request log retention (default: 30 days)
REQUEST_LOG_RETENTION_DAYS=30
```

## Authentication

Routes requiring authentication must include JWT token in `Authorization` header:
```
Authorization: Bearer <token>
```

Public routes (no auth required):
- `/blogNewsApi/healthy`
- `/blogNewsApi/user/login`
- `/blogNewsApi/user/register`
- `/blogNewsApi/article` (GET only)
- `/blogNewsApi/track-visit`
- `/blogNewsApi/track-visit-stats`

## Testing

Uses Node.js built-in test runner (`node:test`). Tests in `test/` mirror the `routes/` and `plugins/` structure. See [test/helper.js](test/helper.js) for app building utilities.

## Deployment

Uses Docker with [docker-compose.yml](docker-compose.yml) for development and [docker-compose.prod.yml](docker-compose.prod.yml) for production. Alternatively, PM2 configuration is in [ecosystem.config.js](ecosystem.config.js).

Production deployment:
```bash
docker-compose -f docker-compose.prod.yml pull && \
docker-compose -f docker-compose.prod.yml down && \
docker-compose -f docker-compose.prod.yml up -d
```

## Key Patterns

- **Soft delete**: Use `deleted: 0/1` flag instead of removing documents
- **Date handling**: Uses `dayjs` for all date operations
- **IP extraction**: `requestLogger.js` handles X-Forwarded-For, X-Real-IP headers
- **Error logging**: 500 errors include stack trace in request_logs
- **Bot detection**: Automatic in visit tracking via User-Agent analysis
