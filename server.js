// server.js
'use strict'
const fastify = require('fastify')({
  bodyLimit: 50 * 1024 * 1024, // 50MB - 支持大文件上传
  logger: {
    level: 'info',
    transport: {
      target: 'pino/file',
      options: {
        destination: 1
      }
    },
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() }
      },
      log: (object) => {
        const { req, res, responseTime, err, ...rest } = object
        let msg = rest.msg || ''
        let ip = '-'

        if (req) {
          // 获取真实 IP（优先从 headers 获取）
          ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
            || req.headers?.['x-real-ip']
            || req.ip
            || '-'
          msg += ` ${req.method} ${req.url}`
        }
        if (res) {
          msg += ` ${res.statusCode}`
        }
        if (responseTime) {
          msg += ` ${responseTime}ms`
        }
        const result = { ...rest, msg, ip }
        if (err) {
          result.err = {
            type: err.type,
            message: err.message,
            stack: err.stack
          }
        }
        return result
      }
    },
    serializers: {
      req: () => undefined,
      res: () => undefined
    },
    timestamp: () => {
      const now = new Date()
      const offset = 8 * 60 // UTC+8 (东八区)
      const localTime = new Date(now.getTime() + offset * 60000)
      return localTime.toISOString().replace('T', ' ').replace('Z', '')
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
