'use strict';

module.exports = async function (fastify, opts) {

  /**
   * 获取请求日志列表
   * GET /blogNewsApi/request-logs
   */
  fastify.get('/request-logs', async function (request, reply) {
    try {
      const user = request.user;

      // 需要管理员权限
      if (!user || user.access !== 'admin') {
        return reply.code(403).send({
          error: '权限不足',
          statusCode: 403
        });
      }

      const {
        page = 1,
        pageSize = 50,
        userId,
        method,
        path,
        statusCode,
        startDate,
        endDate
      } = request.query;

      const options = {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      };

      if (userId) options.userId = userId;
      if (method) options.method = method;
      if (path) options.path = path;
      if (statusCode) options.statusCode = parseInt(statusCode);
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      const result = await fastify.requestLogs.getLogs(options);

      return {
        success: true,
        ...result
      };

    } catch (error) {
      fastify.log.error('获取请求日志失败:', error);
      return reply.code(500).send({
        error: '获取请求日志失败',
        statusCode: 500
      });
    }
  });

  /**
   * 获取请求日志统计
   * GET /blogNewsApi/request-logs/stats
   */
  fastify.get('/request-logs/stats', async function (request, reply) {
    try {
      const user = request.user;

      // 需要管理员权限
      if (!user || user.access !== 'admin') {
        return reply.code(403).send({
          error: '权限不足',
          statusCode: 403
        });
      }

      const { startDate, endDate } = request.query;
      const options = {};

      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      const stats = await fastify.requestLogs.getStats(options);

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      fastify.log.error('获取日志统计失败:', error);
      return reply.code(500).send({
        error: '获取日志统计失败',
        statusCode: 500
      });
    }
  });

  /**
   * 手动清理旧日志
   * POST /blogNewsApi/request-logs/cleanup
   */
  fastify.post('/request-logs/cleanup', async function (request, reply) {
    try {
      const user = request.user;

      // 需要管理员权限
      if (!user || user.access !== 'admin') {
        return reply.code(403).send({
          error: '权限不足',
          statusCode: 403
        });
      }

      const { days } = request.body;
      const retentionDays = days ? parseInt(days) : parseInt(process.env.REQUEST_LOG_RETENTION_DAYS || '30');

      const result = await fastify.requestLogs.cleanupOldLogs(retentionDays);

      return {
        success: true,
        message: `已清理 ${result.deletedCount} 条旧日志`,
        data: result
      };

    } catch (error) {
      fastify.log.error('清理日志失败:', error);
      return reply.code(500).send({
        error: '清理日志失败',
        statusCode: 500
      });
    }
  });
};
