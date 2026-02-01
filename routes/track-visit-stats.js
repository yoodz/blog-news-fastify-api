'use strict'

const dayjs = require('dayjs');

module.exports = async function (fastify, opts) {

  fastify.get('/track-visit-stats', async function (request, reply) {
    try {
      const { slug, startTime, endTime } = request.query;

      const logsCollection = fastify.mongo.db.collection('visits_logs');

      // 构建聚合查询条件
      const matchConditions = {};

      // 按页面过滤
      if (slug) {
        matchConditions.slug = slug;
      }

      // 按时间范围过滤
      if (startTime || endTime) {
        matchConditions.minuteKey = {};
        if (startTime) {
          matchConditions.minuteKey.$gte = startTime;
        }
        if (endTime) {
          matchConditions.minuteKey.$lte = endTime;
        }
      }

      // 构建聚合管道
      const pipeline = [];

      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
      }

      // 按日期和文章分组统计
      pipeline.push(
        {
          $group: {
            _id: {
              date: '$minuteKey',
              article: '$slug'
            },
            visits: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            date: '$_id.date',
            article: '$_id.article',
            visits: 1
          }
        },
        {
          $sort: { date: 1, article: 1 }
        }
      );

      // 执行聚合查询
      const result = await logsCollection.aggregate(pipeline).toArray();

      return reply
        .code(200)
        .header('Content-Type', 'application/json')
        .send({
          success: true,
          data: result
        });

    } catch (err) {
      fastify.log.error('访问统计查询失败:', err);
      return reply
        .code(500)
        .header('Content-Type', 'application/json')
        .send({ error: err.message });
    }
  });
}
