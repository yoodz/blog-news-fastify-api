'use strict'

// 配置路径别名
const moduleAlias = require('module-alias');
moduleAlias.addAliases({
  '@utils': __dirname + '/utils',
  '@tasks': __dirname + '/tasks',
});

require('dotenv').config();
const path = require('node:path')
const AutoLoad = require('@fastify/autoload')
const cron = require('node-cron');
const fastifyMongo = require('@fastify/mongodb');
const { rssUpdate, dailyVisitReport, cleanupRequestLogs } = require('@tasks');
const fastifyCors = require('@fastify/cors');
const fastifyJwt = require('@fastify/jwt');

// Pass --options via CLI arguments in command to enable these options.
const options = {}

module.exports = async function (app, opts) {
  // Place here your custom code!
  // Do not touch the following lines
  cron.schedule('0 6 * * *', async () => rssUpdate(app), {
    scheduled: true,
    named: 'rssUpdate',
    timezone: "Asia/Shanghai"
  });

  cron.schedule('0 6 * * *', async () => dailyVisitReport(app), {
    scheduled: true,
    named: 'dailyVisitReport',
    timezone: "Asia/Shanghai"
  });

  // 每天凌晨2点清理旧请求日志
  cron.schedule('0 2 * * *', async () => cleanupRequestLogs(app), {
    scheduled: true,
    named: 'cleanupRequestLogs',
    timezone: "Asia/Shanghai"
  });

  app.register(fastifyCors, {
    origin: (origin, cb) => {
      // 开发调试阶段或者其他项目的开发环境，直接允许
      if (!origin || process.env.NODE_ENV === 'development' || origin?.includes('localhost') || origin?.includes('afunny.top') || origin?.includes('goagix.com') || origin?.includes('192.168.31') || origin?.includes('127.0.0.1')) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  // 注册 JWT 插件
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'blog-news-secret-key-2024'
  });

  // 注册 MongoDB（必须在 plugins 之前，因为 requestLogger 需要）
  app.register(fastifyMongo, {
    url: 'mongodb://admin:Abc123456@192.168.31.236:27017/blog-news?authSource=admin',
    forceClose: true
  });

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  app.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts)
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  app.register(async function (prefixedApp) {
    prefixedApp.register(AutoLoad, {
      dir: path.join(__dirname, 'routes'),
      options: Object.assign({}, opts)
    });
  }, { prefix: '/blogNewsApi' }); // 全局路由前缀
}

module.exports.options = options
