'use strict'
const Parser = require('rss-parser');
const { formatFeedItems } = require('@utils/feedUtil')
const dayjs = require('dayjs');
const { notify } = require('@utils/message')

const parser = new Parser({
  customFields: {
    feed: ['foo'],
    item: ['bar']
  }
});
module.exports = async function (fastify, opts) {

  // 新增 RSS
  fastify.post('/rss', async function (request, reply) {
    try {
      const rssData = request.body;
      const { rssUrl, title } = rssData || {}

      if (!rssUrl) {
        return reply.code(400).send({ error: '缺少必要字段' });
      }

      const exists = await fastify.mongo.db.collection('rss').findOne({ rssUrl });
      if (exists) {
        return {
          success: true,
          repeat: true
        }
      }

      // 直接入库返回
      await fastify.mongo.db.collection('rss').insertOne({
        rssUrl,
        title: title || rssUrl,
        deleted: 0,
        auditStatus: 1,
        init: 0,
        createAt: dayjs().format('YYYY-MM-DD HH:mm')
      });

      // 异步解析 RSS 并获取文章
      (async () => {
        try {
          const feed = await parser.parseURL(rssUrl);
          const { image, title, description, lastBuildDate, generator } = feed || {};

          // 更新 RSS 源信息
          await fastify.mongo.db.collection('rss').updateOne(
            { rssUrl },
            {
              $set: {
                title,
                image,
                description,
                lastBuildDate,
                generator
              }
            }
          );

          // 获取文章
          const articles = await formatFeedItems(fastify, feed, 999, rssUrl);
          if (articles.length > 0) {
            await fastify.mongo.db.collection('article').insertMany(
              articles,
              { ordered: false }
            );
          }

          // 更新 init 状态
          await fastify.mongo.db.collection('rss').updateOne(
            { rssUrl },
            { $set: { init: 1 } }
          );

          // notify({
          //   title: 'RSS 源添加成功',
          //   body: `${title} - 已获取 ${articles.length} 篇文章`
          // });
        } catch (error) {
          console.error('异步解析 RSS 失败:', rssUrl, error);
        }
      })();

      return {
        success: true
      }
    } catch (error) {
      console.error('新增RSS失败:', error);
      return reply.code(500).send({ error: '新增失败' })
    }
  })

  // 获取 RSS 列表（支持分页、筛选、排序）
  fastify.get('/rss', async function (request, reply) {
    try {
      const { page = 1, pageSize = 10, auditStatus, deleted, title, rssUrl, sortField, sortOrder } = request.query;
      const skip = (page - 1) * pageSize;
      const limit = parseInt(pageSize);

      // 构建查询条件
      const query = {};
      if (auditStatus !== undefined) {
        query.auditStatus = parseInt(auditStatus);
      }
      if (deleted !== undefined) {
        query.deleted = parseInt(deleted);
      }
      // 标题模糊搜索
      if (title) {
        query.title = { $regex: title, $options: 'i' };
      }
      // RSS 地址模糊搜索
      if (rssUrl) {
        query.rssUrl = { $regex: rssUrl, $options: 'i' };
      }

      // 构建排序条件
      let sort = { createAt: -1 }; // 默认按创建时间倒序
      if (sortField && sortOrder) {
        const order = sortOrder === 'ascend' ? 1 : -1;
        sort = { [sortField]: order };
      }

      const result = await fastify.mongo.db.collection('rss')
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray()

      const total = await fastify.mongo.db.collection('rss').countDocuments(query);

      return {
        success: true,
        data: result,
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          total
        }
      }
    } catch (error) {
      fastify.log.error('查询rss错误:', error)
      return reply.code(500).send({ error: '查询失败' })
    }
  })

  // 获取单个 RSS 详情
  fastify.get('/rss/:id', async function (request, reply) {
    try {
      const { id } = request.params;

      const result = await fastify.mongo.db.collection('rss').findOne({
        _id: new fastify.mongo.ObjectId(id)
      });

      if (!result) {
        return reply.code(404).send({ error: 'RSS 源不存在' });
      }

      return {
        success: true,
        data: result
      }
    } catch (error) {
      fastify.log.error('查询rss详情错误:', error)
      return reply.code(500).send({ error: '查询失败' })
    }
  })

  // 更新 RSS
  fastify.put('/rss/:id', async function (request, reply) {
    try {
      const { id } = request.params;
      const { title, description, auditStatus, deleted } = request.body;

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (auditStatus !== undefined) updateData.auditStatus = parseInt(auditStatus);
      if (deleted !== undefined) updateData.deleted = parseInt(deleted);

      const result = await fastify.mongo.db.collection('rss').findOneAndUpdate(
        { _id: new fastify.mongo.ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return reply.code(404).send({ error: 'RSS 源不存在' });
      }

      return {
        success: true,
        data: result
      }
    } catch (error) {
      fastify.log.error('更新rss错误:', error)
      return reply.code(500).send({ error: '更新失败' })
    }
  })

  // 删除 RSS（软删除）
  fastify.delete('/rss/:id', async function (request, reply) {
    try {
      const { id } = request.params;

      const result = await fastify.mongo.db.collection('rss').findOneAndUpdate(
        { _id: new fastify.mongo.ObjectId(id) },
        { $set: { deleted: 1 } },
        { returnDocument: 'after' }
      );

      if (!result) {
        return reply.code(404).send({ error: 'RSS 源不存在' });
      }

      return {
        success: true,
        message: '删除成功'
      }
    } catch (error) {
      fastify.log.error('删除rss错误:', error)
      return reply.code(500).send({ error: '删除失败' })
    }
  })

  // 彻底删除 RSS
  fastify.delete('/rss/:id/hard', async function (request, reply) {
    try {
      const { id } = request.params;

      const result = await fastify.mongo.db.collection('rss').deleteOne({
        _id: new fastify.mongo.ObjectId(id)
      });

      if (result.deletedCount === 0) {
        return reply.code(404).send({ error: 'RSS 源不存在' });
      }

      return {
        success: true,
        message: '彻底删除成功'
      }
    } catch (error) {
      fastify.log.error('彻底删除rss错误:', error)
      return reply.code(500).send({ error: '删除失败' })
    }
  })
}
