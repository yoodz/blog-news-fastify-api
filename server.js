const fastify = require('fastify')({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    file: '/app/logs/fastify.log',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          hostname: request.hostname,
          remoteAddress: request.ip,
          userAgent: request.headers['user-agent']
        };
      }
    }
  },
  trustProxy: true,
  connectionTimeout: 10000,
  requestTimeout: 30000,
  bodyLimit: 1048576, // 1MB
  caseSensitive: false,
  ignoreTrailingSlash: true
});

// 健康检查端点
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
});

// 优雅关闭处理
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, closing server...`);
    await fastify.close();
    process.exit(0);
  });
});

const start = async () => {
  try {
    await fastify.listen({
      port: process.env.PORT || 3000,
      host: process.env.HOST || '0.0.0.0'
    });
    
    fastify.log.info(`Server running at: ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();