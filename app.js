'use strict'

const path = require('node:path')
const AutoLoad = require('@fastify/autoload')
const cron = require('node-cron');
const fastifyMongo = require('@fastify/mongodb');
const Tasks = require('./task')
const fastifyCors = require('@fastify/cors');

// Pass --options via CLI arguments in command to enable these options.
const options = {}

module.exports = async function (app, opts) {
  // Place here your custom code!
  // Do not touch the following lines
  cron.schedule('0 6 * * *', async () => Tasks(app), {
    scheduled: true,
    named: 'myCronJob',
    timezone: "Asia/Shanghai"
  });

  app.register(fastifyCors, {
    origin: ['https://www.afunny.top', 'http://localhost:5173'],
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
}, { prefix: '/blogNewApi' });

  app.register(fastifyMongo, {
    url: 'mongodb://admin:Abc123456@192.168.31.236:27017/blog-news?authSource=admin',
    forceClose: true
  });
}

module.exports.options = options
