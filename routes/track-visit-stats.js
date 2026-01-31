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

      // 按分钟分组统计
      pipeline.push(
        {
          $group: {
            _id: '$minuteKey',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      );

      // 执行聚合查询
      const result = await logsCollection.aggregate(pipeline).toArray();

      // 格式化结果
      const formattedResult = {};
      let total = 0;
      result.forEach(item => {
        formattedResult[item._id] = item.count;
        total += item.count;
      });

      return reply
        .code(200)
        .header('Content-Type', 'application/json')
        .send({
          success: true,
          result: formattedResult,
          total
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
