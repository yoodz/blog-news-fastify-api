'use strict'
const task = require('../task');
const Parser = require('rss-parser');
const { formatFeedItems } = require("../utils/feedUtil")

const parser = new Parser({
  customFields: {
    feed: ['foo'],
    item: ['bar']
  }
});
module.exports = async function (fastify, opts) {

  // 新增 RSS
  fastify.post('/rss', async function (request, reply) {
    try {
      const rssData = request.body;

      const { rssUrl } = rssData || {}
      if (!rssUrl) {
        return reply.code(400).send({ error: '缺少必要字段' });
      }

      if (rssUrl?.length > 50) {
        return reply.code(400).send({ error: '最大长度不超过50字符' });
      }

      const exists = await fastify.mongo.db.collection('rss').findOne({ rssUrl });
      if (exists) {
        return {
          success: true,
          repeat: true
        }
      }
      let feed = await parser.parseURL(rssUrl);
      const { image, title, description, lastBuildDate, generator } = feed || {}
      const articles = await formatFeedItems(fastify, feed, 999, rssUrl)
      const data = {
        title,
        rssUrl,
        image,
        description,
        lastBuildDate,
        generator,
        deleted: 0,
        auditStatus: 1,
        init: 1
      }
      await fastify.mongo.db.collection('article').insertMany(
        articles,
        { ordered: false } // 无序插入，遇到重复错误继续执行
      );
      await fastify.mongo.db.collection('rss').insertOne(data);
      return {
        success: true
      }
    } catch (error) {
      console.log(error, 'rss-50')
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
