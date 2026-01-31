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
const { rssUpdate, dailyVisitReport } = require('@tasks');
const fastifyCors = require('@fastify/cors');

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

  cron.schedule('0 8 * * *', async () => dailyVisitReport(app), {
    scheduled: true,
    named: 'dailyVisitReport',
    timezone: "Asia/Shanghai"
  });

  app.register(fastifyCors, {
    origin: (origin, cb) => {
      // 开发调试阶段或者其他项目的开发环境，直接允许
      if (!origin || process.env.NODE_ENV === 'development' || origin?.includes('localhost') || origin?.includes('afunny.top') || origin?.includes('goagix.com')) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // allowedHeaders: ['Content-Type', 'Authorization'],
    // credentials: true // 如果需要携带cookie等凭证
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

  app.register(fastifyMongo, {
    url: 'mongodb://admin:Abc123456@192.168.31.236:27017/blog-news?authSource=admin',
    forceClose: true
  });
}

module.exports.options = options
