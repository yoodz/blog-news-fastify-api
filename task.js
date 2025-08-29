const parserFeedUrl = require('./utils/feedUtil');
const dayjs = require('dayjs');

const Tasks = async (app) => {
    const rssUrl = await app.mongo.db.collection('rss').find({ deleted: 0, auditStatus: 1, init: 1 }).toArray();

    if (!rssUrl?.length) {
        console.log('没有需要更新的rss地址')
        return
    }

    const validUrls = rssUrl?.map(item => item.rssUrl) || []
    console.log(validUrls, 'task-13')
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
            // await app.mongo.db.collection('rss').updateOne({ key: "update_at" }, { $set: { value: dayjs().format('YYYY-MM-DD HH:mm') } })
            // await updateRss({ rssUrl: _rssUrl, updateAt: dayjs().format('YYYY-MM-DD HH:mm') })
        } else {
            console.log(` ${_rssUrl} 每天定时获取失败`);

            // await updateRss({ rssUrl: _rssUrl, updateAt: dayjs().format('YYYY-MM-DD HH:mm'), errorCount: errorCount + 1 })
        }
    }
    await app.mongo.db.collection('config').updateOne({ key: "update_at" }, { $set: { value: dayjs().format('YYYY-MM-DD HH:mm') } })

}
module.exports = Tasks;