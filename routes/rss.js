'use strict'
const task = require('../task');

module.exports = async function (fastify, opts) {

  // 新增 RSS
  fastify.post('/rss', async function (request, reply) {
    try {
      const rssData = request.body;

      const { title, rssUrl } = rssData || {}
      if (!title || !rssUrl) {
        return reply.code(400).send({ error: '缺少必要字段' });
      }
      const data = {
        title,
        rssUrl,
        deleted: 0,
        auditStatus: 0,
        init: 0
      }
      const result = await fastify.mongo.db.collection('rss').insertOne(data);
      return {
        success: true,
        insertedId: result.insertedId
      }
    } catch (error) {
      fastify.log.error('新增RSS错误:', error)
      return reply.code(500).send({ error: '新增失败' })
    }
  })

  // 获取 RSS 列表
  fastify.get('/rss', async function (request, reply) {
    try {
      const result = await fastify.mongo.db.collection('rss')
        .find()
        .sort({ pubDate: -1 })
        .toArray()

      return {
        success: true,
        result
      }
    } catch (error) {
      fastify.log.error('查询rss错误:', error)
      return reply.code(500).send({ error: '查询失败' })
    }
  })
}
