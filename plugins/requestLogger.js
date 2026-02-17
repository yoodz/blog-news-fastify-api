'use strict';

const fp = require('fastify-plugin');

/**
 * 请求日志插件
 * 记录每个请求的详细信息到 MongoDB
 */
module.exports = fp(async function (fastify, opts) {
  const collection = fastify.mongo.db.collection('request_logs');

  // 在请求开始时记录时间戳
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now();
  });

  // 添加 onResponse hook 在响应发送后记录日志
  fastify.addHook('onResponse', async (request, reply) => {
    try {
      // 计算响应时间（毫秒）
      const responseTime = request.startTime ? Date.now() - request.startTime : 0;

      // 获取真实 IP 地址
      const getClientIp = (req) => {
        const xForwardedFor = req.headers['x-forwarded-for'];
        const xRealIp = req.headers['x-real-ip'];

        if (xForwardedFor) {
          // x-forwarded-for 可能包含多个 IP，取第一个
          const ips = xForwardedFor.split(',').map(ip => ip.trim());
          const firstIp = ips[0];
          // 排除内网 IP
          if (firstIp && firstIp !== '::1' && firstIp !== '127.0.0.1' && !firstIp.startsWith('192.168.') && !firstIp.startsWith('10.') && !firstIp.startsWith('172.16.')) {
            return firstIp;
          }
        }

        if (xRealIp && xRealIp !== '::1' && xRealIp !== '127.0.0.1') {
          return xRealIp;
        }

        // 使用 fastify 的 ip 属性
        if (req.ip && req.ip !== '::1' && req.ip !== '127.0.0.1') {
          return req.ip;
        }

        // 最后使用 socket 地址
        const socketIp = req.socket.remoteAddress;
        if (socketIp === '::1') {
          return '127.0.0.1'; // 统一为 IPv4 格式
        }
        return socketIp || '-';
      };

      const logEntry = {
        timestamp: new Date(),
        method: request.method || 'UNKNOWN',
        url: request.url || '-',
        path: request.routerPath || request.raw.url || '-',
        query: request.query || {},
        statusCode: reply.statusCode || 0,
        responseTime: responseTime,
        ip: getClientIp(request),
        userAgent: request.headers['user-agent'] || '-',
        // 用户信息（如果有）
        userId: request.user?.userId || null,
        username: request.user?.username || null,
      };

      // 异步写入日志，不阻塞响应
      collection.insertOne(logEntry).catch(err => {
        fastify.log.error({ err: err.message, stack: err.stack }, 'Failed to log request');
      });
    } catch (error) {
      fastify.log.error({ error: error.message, stack: error.stack }, 'Error in request logger');
    }
  });

  // 获取请求日志的装饰方法
  fastify.decorate('requestLogs', {
    /**
     * 获取请求日志列表
     * @param {object} options - 查询选项
     * @returns {Promise<Array>} 日志列表
     */
    async getLogs(options = {}) {
      const {
        page = 1,
        pageSize = 50,
        userId,
        method,
        path,
        statusCode,
        startDate,
        endDate,
      } = options;

      const query = {};
      if (userId) query.userId = userId;
      if (method) query.method = method;
      if (path) query.path = { $regex: path, $options: 'i' };
      if (statusCode) query.statusCode = statusCode;
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const skip = (page - 1) * pageSize;
      const [logs, total] = await Promise.all([
        collection.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(pageSize)
          .toArray(),
        collection.countDocuments(query)
      ]);

      return {
        logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    },

    /**
     * 获取日志统计信息
     * @param {object} options - 查询选项
     * @returns {Promise<object>} 统计信息
     */
    async getStats(options = {}) {
      const { startDate, endDate } = options;

      const matchStage = {};
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = new Date(startDate);
        if (endDate) matchStage.timestamp.$lte = new Date(endDate);
      }

      // 简化统计查询 - 使用 find 而不是复杂的聚合
      const logs = await collection.find(matchStage).limit(10000).toArray();

      const totalRequests = logs.length;
      const avgResponseTime = totalRequests > 0
        ? logs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / totalRequests
        : 0;

      const statusCodeCounts = {};
      const methodCounts = {};

      logs.forEach(log => {
        const code = log.statusCode;
        const method = log.method;

        statusCodeCounts[code] = (statusCodeCounts[code] || 0) + 1;
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      });

      return {
        totalRequests,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        statusCodeCounts,
        methodCounts
      };
    },

    /**
     * 清理旧日志
     * @param {number} days - 保留天数
     * @returns {Promise<object>} 删除结果
     */
    async cleanupOldLogs(days = 30) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await collection.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      return {
        deletedCount: result.deletedCount,
        cutoffDate
      };
    }
  });
}, {
  name: 'request-logger'
});
