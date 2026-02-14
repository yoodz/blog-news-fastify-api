'use strict';

/**
 * 初始化管理员用户脚本
 * 运行: node scripts/initAdmin.js
 */

require('dotenv').config();
const fastify = require('fastify')();
const fastifyMongo = require('@fastify/mongodb');
const { hashPassword } = require('../utils/auth');
const dayjs = require('dayjs');

const MONGODB_URL = 'mongodb://admin:Abc123456@192.168.31.236:27017/blog-news?authSource=admin';

async function initAdmin() {
  try {
    // 注册 MongoDB 插件
    await fastify.register(fastifyMongo, {
      url: MONGODB_URL,
      forceClose: true
    });

    // 等待连接就绪
    await fastify.ready();
    console.log('已连接到 MongoDB');

    const db = fastify.mongo.db;

    // 检查管理员用户是否已存在
    const existingAdmin = await db.collection('users').findOne({
      username: 'admin',
      deleted: 0
    });

    if (existingAdmin) {
      console.log('管理员用户已存在，跳过创建');
      console.log('用户名: admin');
      return;
    }

    // 创建管理员用户
    const hashedPassword = await hashPassword('ant.design');

    const result = await db.collection('users').insertOne({
      username: 'admin',
      password: hashedPassword,
      name: '管理员',
      email: 'admin@example.com',
      access: 'admin',
      status: 1,
      deleted: 0,
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      lastLoginAt: null
    });

    console.log('管理员用户创建成功！');
    console.log('用户名: admin');
    console.log('密码: ant.design');
    console.log('用户ID:', result.insertedId);

  } catch (error) {
    console.error('初始化管理员失败:', error);
  } finally {
    await fastify.close();
  }
}

initAdmin();
