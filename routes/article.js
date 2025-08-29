'use strict'
const  task = require('../task');

module.exports = async function (fastify, opts) {

  fastify.get('/article', async function (request, reply) {
    try {
      const result = await fastify.mongo.db.collection('article')
        .find()
        .sort({ pubDate: -1 })
        .toArray()

      const totalRss = await fastify.mongo.db.collection('rss').countDocuments()

      const config = await fastify.mongo.db.collection('config')
        .find()
        .toArray()
      return {
        success: true,
        config: config[0],
        result,
        totalRss
      }
    } catch (error) {
      fastify.log.error('查询活跃用户错误:', error)
      return reply.code(500).send({ error: '查询失败' })
    }
  })

  fastify.get('/triggerDeploy', async function (request, reply) {
    triggerDeploy()
  })

  fastify.get('/triggerDeploy', async function (request, reply) {
    task()
  })
}
