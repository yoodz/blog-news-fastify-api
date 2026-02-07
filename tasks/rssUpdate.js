const { parserFeedUrl } = require('@utils/feedUtil');
const dayjs = require('dayjs');
const { triggerDeploy, sendBarkNotification } = require('@utils/notify');

/**
 * 发送 RSS 更新结果通知
 * @param {Number} successCount - 成功数量
 * @param {Number} failCount - 失败数量
 * @param {Number} totalArticles - 新文章数量
 * @param {Array} failedSources - 失败源列表
 * @param {Array} newArticles - 新增文章列表 [{title, link, sourceTitle, sourceUrl}]
 */
async function sendRssUpdateReport(successCount, failCount, totalArticles, failedSources, newArticles) {
  // 如果没有新文章，不发送通知
  if (totalArticles === 0) {
    console.log(`[RSS更新] 无新文章，跳过推送通知`);
    return;
  }

  let message = `📰 RSS更新报告\n\n`;
  message += `⏰ ${dayjs().format('YYYY-MM-DD HH:mm')}\n`;
  message += `✅ 成功: ${successCount} | ❌ 失败: ${failCount} | 📄 新文章: ${totalArticles}\n\n`;

  if (newArticles.length > 0) {
    message += `📝 新增文章 (${newArticles.length}篇):\n`;
    newArticles.forEach((article, index) => {
      message += `${index + 1}. ${article.title}\n`;
      message += `   🔗 ${article.link}\n`;
      message += `   📰 来源: ${article.sourceTitle}\n`;
      if (article.sourceUrl) {
        message += `   🌐 ${article.sourceUrl}\n`;
      }
    });
    message += `\n`;
  }

  if (failedSources.length > 0) {
    message += `🔴 失败源 (${failedSources.length}个):\n`;
    failedSources.forEach((item, index) => {
      message += `${index + 1}. ${item.title || '未知'}\n`;
      message += `   ${item.url}\n`;
      message += `   ❌ ${item.error}\n`;
    });
  } else {
    message += `🎉 全部成功！`;
  }

  await sendBarkNotification('📰 RSS更新完成', message);
}

/**
 * RSS 更新任务
 * 每 5 分钟执行一次
 * @param {Object} app - Fastify app instance
 */
const rssUpdate = async (app) => {
  const startTime = Date.now();
  console.log(`[RSS更新] 任务开始 - ${dayjs().format('YYYY-MM-DD HH:mm')}`);

  try {
    // 获取启用的 RSS 源
    const rssSources = await app.mongo.db.collection('rss')
      .find({ deleted: 0, auditStatus: 1, init: 1 })
      .toArray();

    if (!rssSources?.length) {
      console.log('[RSS更新] 没有需要更新的 RSS 地址');
      return;
    }

    const rssUrls = rssSources.map(item => item.rssUrl);
    console.log(`[RSS更新] 开始获取 ${rssUrls.length} 个 RSS 源`);

    // 并发解析 RSS
    const { result, requsetStatus, errors } = await parserFeedUrl(rssUrls, 5, app);

    // 统计结果
    let successCount = 0;
    let failCount = 0;
    let totalArticles = 0;
    const failedSources = []; // 失败的 RSS 源
    const newArticles = []; // 新增文章列表

    // 处理每个 RSS 源的结果
    for (let i = 0; i < rssSources.length; i++) {
      const source = rssSources[i];
      const isSuccess = requsetStatus[i];
      const articles = result[i];

      if (isSuccess) {
        successCount++;
        if (articles?.length) {
          await app.mongo.db.collection('article').insertMany(articles, { ordered: false });
          totalArticles += articles.length;
          console.log(`[RSS更新] ${source.rssUrl} 成功获取 ${articles.length} 篇新文章`);

          // 收集新增文章信息
          articles.forEach(article => {
            newArticles.push({
              title: article.title,
              link: article.link,
              sourceTitle: source.title,
              sourceUrl: source.rssUrl
            });
          });
        } else {
          console.log(`[RSS更新] ${source.rssUrl} 无新文章`);
        }
      } else {
        failCount++;
        failedSources.push({
          title: source.title,
          url: source.rssUrl,
          error: errors[i] || '未知错误'
        });
        console.error(`[RSS更新] ${source.rssUrl} 获取失败: ${errors[i]}`);
      }
    }

    // 发送执行结果通知
    await sendRssUpdateReport(successCount, failCount, totalArticles, failedSources, newArticles);

    // 更新最后执行时间
    await app.mongo.db.collection('config').updateOne(
      { key: 'update_at' },
      { $set: { value: dayjs().format('YYYY-MM-DD HH:mm') } }
    );

    // 触发部署
    await triggerDeploy();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[RSS更新] 任务完成 - 成功: ${successCount}, 失败: ${failCount}, 新文章: ${totalArticles}, 耗时: ${duration}s`);

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[RSS更新] 任务失败 - 耗时: ${duration}s, 错误:`, error);
  }
};

module.exports = rssUpdate;
