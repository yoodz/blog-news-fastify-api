/**
 * 创建 blog-news 数据库专用用户
 * 运行: node scripts/createMongoUser.js
 *
 * 注意：需要使用 admin 用户连接到 MongoDB
 */

require('dotenv').config();
const fastify = require('fastify')();
const fastifyMongo = require('@fastify/mongodb');

const adminUrl = `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/admin?authSource=${process.env.MONGODB_AUTH_SOURCE}`;

async function createUser() {
  try {
    // 使用 admin 连接
    await fastify.register(fastifyMongo, {
      url: adminUrl,
      forceClose: true
    });

    await fastify.ready();
    console.log('已连接到 MongoDB (admin)');

    const db = fastify.mongo.db;

    // 切换到 blog-news 数据库并创建用户
    const blogNewsDb = fastify.mongo.client.db('blog-news');

    const result = await blogNewsDb.command({
      createUser: 'blog_user',
      pwd: 'BlogNews2024!',
      roles: [
        { role: 'readWrite', db: 'blog-news' }
      ]
    });

    console.log('✅ 用户创建成功！');
    console.log('用户名: blog_user');
    console.log('密码: BlogNews2024!');
    console.log('权限: readWrite on blog-news');
    console.log('\n请在 .env 中更新以下配置：');
    console.log('MONGODB_USER=blog_user');
    console.log('MONGODB_PASSWORD=BlogNews2024!');
    console.log('# MONGODB_AUTH_SOURCE 可以移除此行，因为用户在 blog-news 库中');

  } catch (error) {
    if (error.code === 51003) {
      console.error('❌ 用户已存在');
      console.log('如需重新创建，请先删除旧用户。可以使用以下 MongoDB 命令：');
      console.log('use blog-news');
      console.log('db.dropUser("blog_user")');
    } else {
      console.error('❌ 创建用户失败:', error.message);
    }
  } finally {
    await fastify.close();
  }
}

createUser();
