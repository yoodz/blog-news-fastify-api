const dayjs = require('dayjs');
const { sendBarkNotification } = require('@utils/notify');

/**
 * 每日访问统计报告任务
 * 每天早上 8 点执行
 * @param {Object} app - Fastify app instance
 */
const dailyVisitReport = async (app) => {
  try {
    console.log('开始统计访问记录');
    const logsCollection = app.mongo.db.collection('visits_logs');

    // 获取昨天的日期范围
    const yesterday = dayjs().subtract(1, 'day');
    const startDate = yesterday.startOf('day').format('YYYY-MM-DD HH:mm');
    const endDate = yesterday.endOf('day').format('YYYY-MM-DD HH:mm');

    // 统计总访问量
    const totalCount = await logsCollection.countDocuments({
      minuteKey: { $gte: startDate, $lte: endDate }
    });

    // 统计非爬虫访问量（isBot 不为 true）
    const humanCount = await logsCollection.countDocuments({
      minuteKey: { $gte: startDate, $lte: endDate },
      $or: [
        { 'visitor.isBot': false },
        { 'visitor.isBot': { $exists: false } },
        { 'visitor.isBot': null }
      ]
    });

    // 统计爬虫访问量（isBot 为 true）
    const botCount = await logsCollection.countDocuments({
      minuteKey: { $gte: startDate, $lte: endDate },
      'visitor.isBot': true
    });

    // 按页面统计访问量（区分真人和爬虫）
    const pageStats = await logsCollection.aggregate([
      {
        $match: { minuteKey: { $gte: startDate, $lte: endDate } }
      },
      {
        $group: {
          _id: {
            slug: '$slug',
            isBot: { $ifNull: ['$visitor.isBot', false] }
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.slug',
          humanCount: {
            $sum: {
              $cond: [{ $eq: ['$_id.isBot', false] }, '$count', 0]
            }
          },
          botCount: {
            $sum: {
              $cond: [{ $eq: ['$_id.isBot', true] }, '$count', 0]
            }
          }
        }
      },
      {
        $sort: { humanCount: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();

    // 构建推送消息
    let message = `📅 ${yesterday.format('YYYY-MM-DD')} 访问统计\n\n`;
    message += `👥 总访问: ${totalCount} 次\n`;
    message += `🧑‍💻 真实访问: ${humanCount} 次\n`;
    message += `🤖 爬虫访问: ${botCount} 次\n\n`;
    message += `📊 热门页面 Top 10:\n`;

    pageStats.forEach((item, index) => {
      const slug = item._id === '/' ? '首页' : item._id;
      message += `${index + 1}. ${slug}: 🧑${item.humanCount} 🤖${item.botCount}\n`;
    });

    await sendBarkNotification('📊 每日访问报告', message);
    console.log('访问统计报告发送完成');
  } catch (error) {
    console.error('访问统计报告生成失败:', error);
  }
};

module.exports = dailyVisitReport;
