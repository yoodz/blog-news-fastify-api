'use strict'
const upyun = require('upyun');
const dayjs = require('dayjs');
const sharp = require('sharp');

// 又拍云配置
const UPYUN_BUCKET = process.env.UPYUN_BUCKET || '';
const UPYUN_OPERATOR = process.env.UPYUN_OPERATOR || '';
const UPYUN_PASSWORD = process.env.UPYUN_PASSWORD || '';
const UPYUN_DOMAIN = process.env.UPYUN_DOMAIN || '';
const UPYUN_PROTOCOL = process.env.UPYUN_PROTOCOL || 'https';

// 创建又拍云客户端
const upyunClient = new upyun.Client(new upyun.Service(UPYUN_BUCKET, UPYUN_OPERATOR, UPYUN_PASSWORD));

// 生成唯一文件名（带年月路径）
const generateFilename = (originalName) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split('.').pop();
  return `${year}/${month}/${timestamp}_${random}.${ext}`;
};

// 构建完整的图片 URL
const buildImageUrl = (filename) => {
  // 如果 UPYUN_DOMAIN 已包含协议，直接使用
  if (UPYUN_DOMAIN.startsWith('http://') || UPYUN_DOMAIN.startsWith('https://')) {
    return `${UPYUN_DOMAIN}/${filename}`;
  }
  // 否则添加协议前缀
  return `${UPYUN_PROTOCOL}://${UPYUN_DOMAIN}/${filename}`;
};

module.exports = async function (fastify, opts) {
  // 注册 multipart 插件用于文件上传
  fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 10, // 最多 10 个文件
    },
  });

  // 上传图片
  fastify.post('/images/upload', async function (request, reply) {
    try {
      // 获取表单字段和文件
      const fields = {};
      let fileBuffer = null;
      let fileInfo = null;

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          // 立即读取文件内容到 buffer（重要：必须在迭代时消耗流）
          fileInfo = {
            filename: part.filename,
            mimetype: part.mimetype,
          };
          fileBuffer = await part.toBuffer();
        } else {
          fields[part.fieldname] = part.value;
        }
      }

      if (!fileBuffer) {
        return reply.code(400).send({ error: '请选择要上传的文件' });
      }

      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(fileInfo.mimetype)) {
        return reply.code(400).send({ error: '只支持 JPG、PNG、GIF、WebP 格式的图片' });
      }

      // 生成文件名
      const filename = generateFilename(fileInfo.filename);

      // 使用 sharp 进行图片压缩（在上传到又拍云之前）
      let processedBuffer = fileBuffer;
      try {
        const image = sharp(fileBuffer);
        const metadata = await image.metadata();

        // 如果图片宽度超过 1920px，进行缩放
        if (metadata.width && metadata.width > 1920) {
          processedBuffer = await image
            .resize(1920, null, {
              withoutEnlargement: true,
              fit: 'inside',
            })
            .toBuffer();
        }

        // 对 JPEG/WebP 格式进行质量压缩
        if (fileInfo.mimetype.includes('jpeg') || fileInfo.mimetype.includes('jpg')) {
          processedBuffer = await sharp(processedBuffer)
            .jpeg({ quality: 92, progressive: true })
            .toBuffer();
        } else if (fileInfo.mimetype.includes('webp')) {
          processedBuffer = await sharp(processedBuffer)
            .webp({ quality: 92 })
            .toBuffer();
        } else if (fileInfo.mimetype.includes('png')) {
          // PNG 使用 adaptive quantization 进行压缩
          processedBuffer = await sharp(processedBuffer)
            .png({ compressionLevel: 9, adaptiveFiltering: true })
            .toBuffer();
        }
      } catch (error) {
        fastify.log.warn('图片压缩失败，使用原始文件:', error.message);
        processedBuffer = fileBuffer;
      }

      // 上传到又拍云（使用压缩后的 buffer）
      const upyunResult = await upyunClient.putFile(filename, processedBuffer, {
        'Content-Type': fileInfo.mimetype,
      });

      if (!upyunResult) {
        throw new Error('上传到又拍云失败');
      }

      // 构建图片 URL
      const url = buildImageUrl(filename);

      // 获取图片尺寸（使用压缩后的图片）
      const metadata = await sharp(processedBuffer).metadata();

      // 保存到数据库（使用压缩后的大小）
      const imageData = {
        filename,
        originalFilename: fileInfo.filename,
        url,
        name: fields.name || fileInfo.filename,
        description: fields.description || '',
        size: processedBuffer.length,
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || fileInfo.filename.split('.').pop(),
        mimeType: fileInfo.mimetype,
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        deleted: 0,
      };

      const result = await fastify.mongo.db.collection('images').insertOne(imageData);

      return {
        success: true,
        data: {
          _id: result.insertedId,
          ...imageData,
        },
      };
    } catch (error) {
      fastify.log.error('上传图片失败:', error);
      return reply.code(500).send({ error: error.message || '上传失败' });
    }
  });

  // 获取图片列表（支持分页、筛选）
  fastify.get('/images', async function (request, reply) {
    try {
      const { page = 1, pageSize = 20, filename, name } = request.query;
      const skip = (page - 1) * pageSize;
      const limit = parseInt(pageSize);

      // 构建查询条件
      const query = { deleted: 0 };
      if (filename) {
        query.filename = { $regex: filename, $options: 'i' };
      }
      if (name) {
        query.name = { $regex: name, $options: 'i' };
      }

      const result = await fastify.mongo.db.collection('images')
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await fastify.mongo.db.collection('images').countDocuments(query);

      return {
        success: true,
        data: result,
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          total,
        },
      };
    } catch (error) {
      fastify.log.error('查询图片列表错误:', error);
      return reply.code(500).send({ error: '查询失败' });
    }
  });

  // 获取单个图片详情
  fastify.get('/images/:id', async function (request, reply) {
    try {
      const { id } = request.params;

      const result = await fastify.mongo.db.collection('images').findOne({
        _id: new fastify.mongo.ObjectId(id),
        deleted: 0,
      });

      if (!result) {
        return reply.code(404).send({ error: '图片不存在' });
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      fastify.log.error('查询图片详情错误:', error);
      return reply.code(500).send({ error: '查询失败' });
    }
  });

  // 更新图片信息
  fastify.put('/images/:id', async function (request, reply) {
    try {
      const { id } = request.params;
      const { name, description } = request.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      updateData.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');

      const result = await fastify.mongo.db.collection('images').findOneAndUpdate(
        { _id: new fastify.mongo.ObjectId(id), deleted: 0 },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        return reply.code(404).send({ error: '图片不存在' });
      }

      return {
        success: true,
        data: result.value,
      };
    } catch (error) {
      fastify.log.error('更新图片信息错误:', error);
      return reply.code(500).send({ error: '更新失败' });
    }
  });

  // 删除图片（软删除）
  fastify.delete('/images/:id', async function (request, reply) {
    try {
      const { id } = request.params;

      console.log('[Single Delete] Deleting image:', id);

      // 先获取图片信息
      const image = await fastify.mongo.db.collection('images').findOne({
        _id: new fastify.mongo.ObjectId(id),
      });

      if (!image) {
        console.log('[Single Delete] Image not found:', id);
        return reply.code(404).send({ error: '图片不存在' });
      }

      console.log('[Single Delete] Found image:', { filename: image.filename, url: image.url });

      // 先删除又拍云上的文件
      try {
        console.log('[Single Delete] Deleting file from Upyun:', image.filename);
        const removeResult = await upyunClient.deleteFile(image.filename);
        console.log('[Single Delete] Upyun delete result:', removeResult);

        if (!removeResult) {
          throw new Error('Failed to delete file from Upyun');
        }
      } catch (error) {
        console.error('[Single Delete] Failed to delete from Upyun:', error.message);
        return reply.code(500).send({ error: '删除又拍云文件失败: ' + error.message });
      }

      // 删除成功后，软删除数据库记录
      const result = await fastify.mongo.db.collection('images').findOneAndUpdate(
        { _id: new fastify.mongo.ObjectId(id) },
        { $set: { deleted: 1, deletedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') } },
        { returnDocument: 'after' }
      );

      console.log('[Single Delete] Database updated');

      return {
        success: true,
        message: '删除成功',
      };
    } catch (error) {
      fastify.log.error('删除图片错误:', error);
      return reply.code(500).send({ error: '删除失败' });
    }
  });

  // 批量删除图片
  fastify.delete('/images/batch', async function (request, reply) {
    try {
      const { ids } = request.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.code(400).send({ error: '请提供要删除的图片ID列表' });
      }

      const objectIds = ids.map((id) => new fastify.mongo.ObjectId(id));

      // 获取要删除的图片信息
      const images = await fastify.mongo.db.collection('images')
        .find({ _id: { $in: objectIds } })
        .toArray();

      console.log('[Batch Delete] Found images:', images.length, images.map(i => ({ filename: i.filename, url: i.url })));

      // 先删除又拍云上的文件，记录成功删除的文件ID
      const successfullyDeletedIds = [];
      console.log('[Batch Delete] Starting to delete files from Upyun...');

      for (const image of images) {
        try {
          console.log('[Batch Delete] Deleting file:', image.filename);
          const removeResult = await upyunClient.deleteFile(image.filename);
          if (removeResult) {
            successfullyDeletedIds.push(image._id);
            console.log('[Batch Delete] Delete success:', image.filename);
          } else {
            console.error('[Batch Delete] Delete failed (returned false):', image.filename);
          }
        } catch (error) {
          console.error('[Batch Delete] Failed to delete file:', image.filename, error.message);
          fastify.log.error('删除又拍云文件失败:', image.filename, error);
        }
      }
      console.log('[Batch Delete] Upyun deletion complete, success:', successfullyDeletedIds.length);

      // 只更新成功删除又拍云文件的数据库记录
      if (successfullyDeletedIds.length > 0) {
        const result = await fastify.mongo.db.collection('images').updateMany(
          { _id: { $in: successfullyDeletedIds } },
          {
            $set: {
              deleted: 1,
              deletedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            },
          }
        );
        console.log('[Batch Delete] Database update result:', result.modifiedCount);
      }

      return {
        success: true,
        message: `成功删除 ${successfullyDeletedIds.length} 张图片`,
      };
    } catch (error) {
      fastify.log.error('批量删除图片错误:', error);
      return reply.code(500).send({ error: '批量删除失败' });
    }
  });
};
