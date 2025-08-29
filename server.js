// server.js
'use strict'
const fastify = require('fastify')({ logger: true })
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
