'use strict'
const task = require('../task');

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

  fastify.get('/article/pv', async function (request, reply) {
    const { id } = request.query;
    if (!id) {
      return reply.code(400).send({ error: '缺少id参数' });
    }
    try {
      const result = await fastify.mongo.db.collection('article').findOneAndUpdate(
        { _id: new fastify.mongo.ObjectId(id) },
        { $inc: { pv: 1 } },
        { returnDocument: 'after' }
      );
      if (!result) {
        return reply.code(404).send({ error: '未找到文章' });
      }
      return { success: true, id: result._id, pv: result.pv };
    } catch (error) {
      return reply.code(500).send({ error: '更新失败' });
    }
  })

  fastify.get('/task', async function (request, reply) {
    task(fastify)
  })
}
