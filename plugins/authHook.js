'use strict';

const fp = require('fastify-plugin');
const { verifyToken, extractToken } = require('@utils/auth');

/**
 * 认证 Hook 插件
 * 用于验证用户身份并注入用户信息到请求对象
 */
module.exports = fp(async function (fastify, opts) {

  // 添加 onRequest hook 进行认证检查
  fastify.addHook('onRequest', async (request, reply) => {
    // 跳过不需要认证的路由
    const skipAuth = [
      '/blogNewsApi/healthy',
      '/blogNewsApi/user/login',
      '/blogNewsApi/user/register',
      '/blogNewsApi/user/captcha',
      '/blogNewsApi/article',
      '/blogNewsApi/track-visit',
      '/blogNewsApi/track-visit-stats',
    ];

    const url = request.url;
    const method = request.method;

    // GET 请求的 /blogNewsApi/article 不需要认证（只是获取文章列表）
    if (method === 'GET' && url.startsWith('/blogNewsApi/article')) {
      return;
    }

    // 检查是否需要跳过认证
    if (skipAuth.some(path => url.startsWith(path))) {
      return;
    }

    // 提取 token
    const token = extractToken(request.headers);

    if (!token) {
      return reply.code(401).send({
        error: '未提供认证令牌',
        statusCode: 401
      });
    }

    // 验证 token
    const decoded = verifyToken(token);

    if (!decoded) {
      return reply.code(401).send({
        error: '无效的认证令牌',
        statusCode: 401
      });
    }

    // 将用户信息注入到请求对象
    request.user = decoded;
  });

}, {
  name: 'auth-hook'
});

/**
 * 可选的认证装饰器
 * 用于在路由中单独启用认证
 */
module.exports.optionalAuth = fp(async function (fastify, opts) {
  fastify.decorateRequest('user', null);

  fastify.addHook('onRequest', async (request) => {
    const token = extractToken(request.headers);
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        request.user = decoded;
      }
    }
  });
}, {
  name: 'optional-auth-hook'
});
