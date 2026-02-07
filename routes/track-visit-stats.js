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

      // 按日期分组统计（每天一条记录，包含该天所有文章的访问详情）
      pipeline.push(
        {
          $group: {
            _id: {
              $substr: ['$minuteKey', 0, 10]  // 提取日期部分 YYYY-MM-DD
            },
            totalVisits: { $sum: 1 },
            articles: {
              $push: {
                article: '$slug',
                visits: 1
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            totalVisits: 1,
            articles: 1
          }
        },
        {
          $sort: { date: 1 }
        }
      );

      // 执行聚合查询
      const result = await logsCollection.aggregate(pipeline).toArray();

      // 对每天的文章进行聚合（相同文章的访问量合并）
      const processedResult = result.map(day => {
        const articleMap = new Map();

        day.articles.forEach((item) => {
          const article = item.article || '未知页面';
          articleMap.set(article, (articleMap.get(article) || 0) + item.visits);
        });

        return {
          date: day.date,
          totalVisits: day.totalVisits,
          articles: Array.from(articleMap.entries())
            .map(([article, visits]) => ({ article, visits }))
            .sort((a, b) => b.visits - a.visits)
        };
      });

      return reply
        .code(200)
        .header('Content-Type', 'application/json')
        .send({
          success: true,
          data: processedResult
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
