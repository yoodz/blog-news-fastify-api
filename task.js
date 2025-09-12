const { parserFeedUrl } = require('./utils/feedUtil');
const dayjs = require('dayjs');


async function triggerDeploy() {
  try {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(process.env.CLOUDFLARE_URL, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log('触发部署成功:', data);
  } catch (err) {
    console.error('触发部署失败:', err);
  }
}

const Tasks = async (app) => {
  try {
    console.log('定时任务执行开始', 'task-21')
    const rssUrl = await app.mongo.db.collection('rss').find({ deleted: 0, auditStatus: 1, init: 1 }).toArray();

    if (!rssUrl?.length) {
      console.log('没有需要更新的rss地址')
      return
    }

    const validUrls = rssUrl?.map(item => item.rssUrl) || []
    const { result, requsetStatus } = await parserFeedUrl(validUrls, 5, app)
    for (let index = 0; index < requsetStatus.length; index++) {
      const element = requsetStatus[index];
      const { errorCount, rssUrl: _rssUrl } = rssUrl[index] || {}
      if (element) {
        if (result[index]?.length) {
          await app.mongo.db.collection('article').insertMany(
            result[index],
            { ordered: false } // 无序插入，遇到重复错误继续执行
          );
        }
      } else {
        console.log(` ${_rssUrl} 每天定时获取失败`);
      }
    }
    await app.mongo.db.collection('config').updateOne({ key: "update_at" }, { $set: { value: dayjs().format('YYYY-MM-DD HH:mm') } })
    triggerDeploy();
    console.log('定时任务执行完成', 'task-21')
  } catch (error) {
    console.log(error, 'task-53')
  }
}
module.exports = Tasks;
module.exports.triggerDeploy = triggerDeploy;