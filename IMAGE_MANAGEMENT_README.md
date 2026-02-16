# 图片管理功能配置说明

## 前端部分（p-web）

### 已实现的功能

1. **菜单配置** - 在左侧菜单添加了"图片管理"菜单项
   - 文件: `config/routes.ts`
   - 国际化: `src/locales/zh-CN/menu.ts`, `src/locales/en-US/menu.ts`

2. **图片管理页面** - 完整的图片管理功能
   - 文件: `src/pages/image/Manage.tsx`
   - 功能: 图片列表、分页、搜索、预览、删除、批量删除

3. **图片上传组件** - 支持压缩和预览
   - 文件: `src/pages/image/components/ImageUploadModal.tsx`
   - 功能: 多图片上传、压缩、预览、进度显示

4. **图片 API 服务** - 前端 API 封装
   - 文件: `src/services/image.ts`

## 后端部分（blog-news-fastify-api）

### 已实现的功能

1. **图片管理 API 路由**
   - 文件: `routes/images.js`
   - 接口:
     - `POST /blogNewsApi/images/upload` - 上传图片
     - `GET /blogNewsApi/images` - 获取图片列表（支持分页和搜索）
     - `GET /blogNewsApi/images/:id` - 获取图片详情
     - `PUT /blogNewsApi/images/:id` - 更新图片信息
     - `DELETE /blogNewsApi/images/:id` - 删除图片（软删除）
     - `DELETE /blogNewsApi/images/batch` - 批量删除图片

### 需要安装的依赖

在后端项目目录下运行以下命令安装依赖：

```bash
npm install @fastify/multipart sharp upyun-sdk
```

### 又拍云配置

1. 在又拍云官网注册账号并创建服务
2. 获取以下信息：
   - `BUCKET`: 服务名称（bucket 名称）
   - `OPERATOR`: 操作员名称
   - `PASSWORD`: 操作员密码
   - `DOMAIN`: CDN 加速域名（如：xxx.test.upcdn.net）

3. 在 `.env` 文件中配置又拍云信息：

```bash
# 又拍云配置
UPYUN_BUCKET=your-bucket-name
UPYUN_OPERATOR=your-operator-name
UPYUN_PASSWORD=your-operator-password
UPYUN_DOMAIN=your-bucket-domain.test.upcdn.net
UPYUN_PROTOCOL=https
```

### 依赖说明

- `@fastify/multipart`: 处理文件上传
- `sharp`: 图片处理库（获取图片尺寸、格式等元数据）
- `upyun-sdk`: 又拍云官方 SDK

### API 使用示例

#### 上传图片

```javascript
const formData = new FormData();
formData.append('file', fileObject);
formData.append('name', '图片名称');
formData.append('category', 'article');
formData.append('description', '图片描述');

fetch('/blogNewsApi/images/upload', {
  method: 'POST',
  body: formData,
});
```

#### 获取图片列表

```javascript
fetch('/blogNewsApi/images?page=1&pageSize=20&category=article')
  .then(res => res.json())
  .then(data => console.log(data));
```

#### 删除图片

```javascript
fetch('/blogNewsApi/images/1234567890', {
  method: 'DELETE',
});
```

### 数据库结构

图片数据存储在 MongoDB 的 `images` 集合中：

```javascript
{
  _id: ObjectId,
  filename: String,           // 存储文件名
  originalFilename: String,   // 原始文件名
  url: String,                // 图片完整 URL
  name: String,               // 图片名称
  category: String,           // 分类：article/avatar/banner/other
  description: String,        // 描述
  size: Number,               // 文件大小（字节）
  width: Number,              // 图片宽度
  height: Number,             // 图片高度
  format: String,             // 图片格式
  mimeType: String,           // MIME 类型
  createdAt: String,          // 创建时间
  updatedAt: String,          // 更新时间
  deleted: Number,            // 软删除标记：0-未删除，1-已删除
  deletedAt: String           // 删除时间
}
```

## 注意事项

1. **又拍云配置** - 使用前请确保已正确配置又拍云信息
2. **文件大小限制** - 上传文件大小限制为 10MB，可在 `routes/images.js` 中修改
3. **图片格式** - 支持上传 JPG、PNG、GIF、WebP 格式的图片
4. **软删除** - 删除操作为软删除，不会从又拍云删除实际文件，需要手动清理
