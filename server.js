// server.js
'use strict'
const fastify = require('fastify')({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss.l', // 显示详细时间
        ignore: 'pid', // 忽略不需要的字段
        messageFormat: '[{time}] {msg}'
      }
    }
  }
})
const app = require('./app')

fastify.register(app)

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
