'use strict';

const { hashPassword, verifyPassword, generateToken } = require('@utils/auth');
const dayjs = require('dayjs');

module.exports = async function (fastify, opts) {

  /**
   * 用户登录接口
   * 对应 p-web 的 POST /api/login/account
   */
  fastify.post('/user/login', async function (request, reply) {
    try {
      const { username, password, type } = request.body;

      if (!username || !password) {
        return reply.code(400).send({
          error: '用户名和密码不能为空',
          statusCode: 400
        });
      }

      // 查找用户
      const user = await fastify.mongo.db.collection('users').findOne({
        username,
        deleted: 0
      });

      if (!user) {
        return reply.code(400).send({
          error: '用户名或密码错误',
          statusCode: 400
        });
      }

      // 验证密码
      const isPasswordValid = await verifyPassword(password, user.password);

      if (!isPasswordValid) {
        return reply.code(400).send({
          error: '用户名或密码错误',
          statusCode: 400
        });
      }

      // 检查用户状态
      if (user.status !== 1) {
        return reply.code(403).send({
          error: '用户已被禁用',
          statusCode: 403
        });
      }

      // 生成 token
      const token = generateToken({
        userId: user._id.toString(),
        username: user.username,
        access: user.access || 'user'
      });

      // 更新最后登录时间
      await fastify.mongo.db.collection('users').updateOne(
        { _id: user._id },
        { $set: { lastLoginAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } }
      );

      // 返回登录结果（兼容 p-web 格式）
      return {
        status: 'ok',
        type: type || 'account',
        currentAuthority: user.access || 'user',
        token,
        data: {
          userId: user._id.toString(),
          username: user.username,
          name: user.name || username,
          avatar: user.avatar,
          email: user.email,
          access: user.access || 'user'
        }
      };

    } catch (error) {
      fastify.log.error('登录失败:', error);
      return reply.code(500).send({
        error: '登录失败，请重试',
        statusCode: 500
      });
    }
  });

  /**
   * 用户注册接口
   */
  fastify.post('/user/register', async function (request, reply) {
    try {
      const { username, password, email, name } = request.body;

      if (!username || !password) {
        return reply.code(400).send({
          error: '用户名和密码不能为空',
          statusCode: 400
        });
      }

      // 检查用户名是否已存在
      const existingUser = await fastify.mongo.db.collection('users').findOne({
        username,
        deleted: 0
      });

      if (existingUser) {
        return reply.code(400).send({
          error: '用户名已存在',
          statusCode: 400
        });
      }

      // 检查邮箱是否已存在
      if (email) {
        const existingEmail = await fastify.mongo.db.collection('users').findOne({
          email,
          deleted: 0
        });

        if (existingEmail) {
          return reply.code(400).send({
            error: '邮箱已被使用',
            statusCode: 400
          });
        }
      }

      // 加密密码
      const hashedPassword = await hashPassword(password);

      // 创建用户
      const result = await fastify.mongo.db.collection('users').insertOne({
        username,
        password: hashedPassword,
        email: email || '',
        name: name || username,
        access: 'user',
        status: 1,
        deleted: 0,
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        lastLoginAt: null
      });

      // 生成 token
      const token = generateToken({
        userId: result.insertedId.toString(),
        username,
        access: 'user'
      });

      return reply.code(201).send({
        success: true,
        message: '注册成功',
        token,
        data: {
          userId: result.insertedId.toString(),
          username,
          name: name || username,
          access: 'user'
        }
      });

    } catch (error) {
      fastify.log.error('注册失败:', error);
      return reply.code(500).send({
        error: '注册失败，请重试',
        statusCode: 500
      });
    }
  });

  /**
   * 获取当前用户信息接口
   * 对应 p-web 的 GET /api/currentUser
   */
  fastify.get('/currentUser', async function (request, reply) {
    try {
      // 从认证 hook 中获取用户信息
      const user = request.user;

      if (!user) {
        return reply.code(401).send({
          error: '未登录',
          statusCode: 401
        });
      }

      // 从数据库获取完整用户信息
      const fullUser = await fastify.mongo.db.collection('users').findOne(
        { _id: new fastify.mongo.ObjectId(user.userId) }
      );

      if (!fullUser || fullUser.deleted === 1) {
        return reply.code(404).send({
          error: '用户不存在',
          statusCode: 404
        });
      }

      return {
        success: true,
        data: {
          userid: fullUser._id.toString(),
          username: fullUser.username,
          name: fullUser.name || fullUser.username,
          avatar: fullUser.avatar,
          email: fullUser.email,
          signature: fullUser.signature,
          title: fullUser.title,
          group: fullUser.group,
          tags: fullUser.tags || [],
          notifyCount: fullUser.notifyCount || 0,
          unreadCount: fullUser.unreadCount || 0,
          country: fullUser.country,
          access: fullUser.access || 'user',
          geographic: fullUser.geographic,
          address: fullUser.address,
          phone: fullUser.phone
        }
      };

    } catch (error) {
      fastify.log.error('获取用户信息失败:', error);
      return reply.code(500).send({
        error: '获取用户信息失败',
        statusCode: 500
      });
    }
  });

  /**
   * 退出登录接口
   * 对应 p-web 的 POST /api/login/outLogin
   */
  fastify.post('/user/outLogin', async function (request, reply) {
    try {
      // JWT 是无状态的，客户端删除 token 即可
      // 如果需要强制失效，可以实现 token 黑名单机制

      return {
        success: true,
        message: '退出成功'
      };

    } catch (error) {
      fastify.log.error('退出登录失败:', error);
      return reply.code(500).send({
        error: '退出登录失败',
        statusCode: 500
      });
    }
  });

  /**
   * 获取验证码接口（Mock 实现）
   * 对应 p-web 的 GET /api/login/captcha
   */
  fastify.get('/user/captcha', async function (request, reply) {
    const { phone } = request.query;

    // Mock 实现：固定返回 1234 作为验证码
    // 实际生产环境应该发送短信验证码

    return {
      success: true,
      data: '1234', // 固定验证码，仅供开发测试
      message: phone ? `验证码已发送至 ${phone}` : '验证码已生成'
    };
  });

  /**
   * 修改用户信息接口
   */
  fastify.put('/user/update', async function (request, reply) {
    try {
      const user = request.user;

      if (!user) {
        return reply.code(401).send({
          error: '未登录',
          statusCode: 401
        });
      }

      const { name, avatar, email, signature, title, phone } = request.body;

      // 构建更新数据
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (email !== undefined) updateData.email = email;
      if (signature !== undefined) updateData.signature = signature;
      if (title !== undefined) updateData.title = title;
      if (phone !== undefined) updateData.phone = phone;
      updateData.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');

      // 更新用户信息
      const result = await fastify.mongo.db.collection('users').findOneAndUpdate(
        { _id: new fastify.mongo.ObjectId(user.userId) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return reply.code(404).send({
          error: '用户不存在',
          statusCode: 404
        });
      }

      return {
        success: true,
        message: '更新成功',
        data: {
          userid: result._id.toString(),
          username: result.username,
          name: result.name,
          avatar: result.avatar,
          email: result.email,
          signature: result.signature,
          title: result.title,
          phone: result.phone
        }
      };

    } catch (error) {
      fastify.log.error('更新用户信息失败:', error);
      return reply.code(500).send({
        error: '更新用户信息失败',
        statusCode: 500
      });
    }
  });

  /**
   * 修改密码接口
   */
  fastify.post('/user/changePassword', async function (request, reply) {
    try {
      const user = request.user;

      if (!user) {
        return reply.code(401).send({
          error: '未登录',
          statusCode: 401
        });
      }

      const { oldPassword, newPassword } = request.body;

      if (!oldPassword || !newPassword) {
        return reply.code(400).send({
          error: '旧密码和新密码不能为空',
          statusCode: 400
        });
      }

      // 获取用户完整信息
      const fullUser = await fastify.mongo.db.collection('users').findOne(
        { _id: new fastify.mongo.ObjectId(user.userId) }
      );

      if (!fullUser) {
        return reply.code(404).send({
          error: '用户不存在',
          statusCode: 404
        });
      }

      // 验证旧密码
      const isPasswordValid = await verifyPassword(oldPassword, fullUser.password);

      if (!isPasswordValid) {
        return reply.code(400).send({
          error: '旧密码错误',
          statusCode: 400
        });
      }

      // 加密新密码
      const hashedPassword = await hashPassword(newPassword);

      // 更新密码
      await fastify.mongo.db.collection('users').updateOne(
        { _id: fullUser._id },
        {
          $set: {
            password: hashedPassword,
            passwordChangedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
          }
        }
      );

      return {
        success: true,
        message: '密码修改成功'
      };

    } catch (error) {
      fastify.log.error('修改密码失败:', error);
      return reply.code(500).send({
        error: '修改密码失败',
        statusCode: 500
      });
    }
  });

  /**
   * 获取用户列表接口（管理员）
   */
  fastify.get('/user/list', async function (request, reply) {
    try {
      const user = request.user;

      if (!user || user.access !== 'admin') {
        return reply.code(403).send({
          error: '权限不足',
          statusCode: 403
        });
      }

      const { page = 1, pageSize = 10, keyword, status, access } = request.query;
      const skip = (page - 1) * pageSize;
      const limit = parseInt(pageSize);

      // 构建查询条件
      const query = { deleted: 0 };

      if (keyword) {
        query.$or = [
          { username: { $regex: keyword, $options: 'i' } },
          { name: { $regex: keyword, $options: 'i' } },
          { email: { $regex: keyword, $options: 'i' } }
        ];
      }

      if (status !== undefined) {
        query.status = parseInt(status);
      }

      if (access) {
        query.access = access;
      }

      // 查询用户列表
      const result = await fastify.mongo.db.collection('users')
        .find(query, {
          projection: { password: 0 } // 不返回密码
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await fastify.mongo.db.collection('users').countDocuments(query);

      return {
        success: true,
        data: result,
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          total
        }
      };

    } catch (error) {
      fastify.log.error('获取用户列表失败:', error);
      return reply.code(500).send({
        error: '获取用户列表失败',
        statusCode: 500
      });
    }
  });
};
