'use strict'

const { dailyVisitReport } = require('@tasks');

module.exports = async function (fastify, opts) {

  fastify.get('/test-daily-report', async function (request, reply) {
    try {
      // 异步执行，不阻塞响应
      dailyVisitReport(fastify);

      return reply
        .code(200)
        .header('Content-Type', 'application/json')
        .send({
          success: true,
          message: '访问统计报告已开始生成，请查看控制台日志'
        });

    } catch (err) {
      fastify.log.error('测试报告生成失败:', err);
      return reply
        .code(500)
        .header('Content-Type', 'application/json')
        .send({ error: err.message });
    }
  });
}
