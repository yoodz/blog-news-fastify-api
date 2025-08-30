'use strict'

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
