'use strict'

const dayjs = require('dayjs');

module.exports = async function (fastify, opts) {

  fastify.get('/track-visit', async function (request, reply) {
    try {
      // 假设slug通过查询参数传递
      const { slug = '/' } = request.query;

      // 使用fastify.mongo获取集合
      const collection = fastify.mongo.db.collection('visits');

      // 更新访问量
      await collection.updateOne(
        { slug },
        { $inc: { count: 1 } }, // 增加访问量
        { upsert: true }        // 如果不存在则创建
      );

      // 写入详细访问记录（用于统计）
      const logsCollection = fastify.mongo.db.collection('visits_logs');
      const now = dayjs().format('YYYY-MM-DD HH:mm');

      // 获取访问者信息
      const ip = request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress;
      const userAgent = request.headers['user-agent'] || '';
      const referer = request.headers['referer'] || '';
      const acceptLanguage = request.headers['accept-language'] || '';

      // 判断是否为爬虫
      const botPatterns = /bot|crawler|spider|scraper|curl|wget|python|go-http|java|httpclient/i;
      const isBot = botPatterns.test(userAgent);

      await logsCollection.insertOne({
        slug,
        minuteKey: now,
        visitor: {
          ip,
          userAgent,
          referer,
          acceptLanguage,
          isBot
        }
      });

      let resultCount;
      const formattedObject = {};

      if (slug === '/') {
        // 获取所有访问量数据
        const resultCountList = await collection.find({}).toArray();

        resultCountList.forEach(item => {
          formattedObject[item.slug] = item.count;
        });
      } else {
        // 获取特定slug的访问量
        resultCount = await collection.findOne({ slug });
      }

      // 返回成功响应
      return reply
        .code(200)
        .header('Content-Type', 'application/json')
        .send({
          slug,
          count: resultCount ? resultCount.count : 0,
          formattedObject
        });

    } catch (err) {
      // 返回错误响应
      return reply
        .code(500)
        .header('Content-Type', 'application/json')
        .send({ error: err.message });
    }
  });
}
