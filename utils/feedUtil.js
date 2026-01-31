const Parser = require('rss-parser');
const dayjs = require('dayjs');

const parser = new Parser({
    customFields: {
        feed: ['foo'],
        item: ['bar']
    }
});

/**
 * 
 * @param date 
 * @param inXDay 在 inXDay 以内
 * @returns 
 */
function isWithinXHours(date, inXDay = 1) {
    const now = dayjs(); // 当前时间
    const targetDate = dayjs(date); // 目标日期

    // 计算时间差（毫秒）
    const diffInMilliseconds = now.diff(targetDate);

    // 判断时间差是否在 24 小时内（24 小时 = 24 * 60 * 60 * 1000 毫秒）
    return Math.abs(diffInMilliseconds) <= inXDay * 24 * 60 * 60 * 1000;
}

async function formatFeedItems(app, feed, inXDay, url) {
    const currentResut = []
    try {

        const articles = await app.mongo.db.collection('article').find({ rssUrl: url }).project({
            link: 1,           // 包含 url 字段
        }).toArray();
        feed.items.forEach(item => {
            const { title = '', link = '', pubDate = '' } = item || {}
            if (isWithinXHours(pubDate, inXDay)) {
                const article = articles.find(item => item.link === link)
                if (article) return
                const urlFormat = new URL(link || '')
                currentResut.push({
                    title,
                    link,
                    rssUrl: url,
                    pubDate: dayjs(pubDate).format('YYYY-MM-DD HH:ss'),
                    hostname: urlFormat.hostname,
                    createAt: dayjs().valueOf(),
                    pv: 0,
                    like: 0
                })
            }
        });
        return currentResut
    } catch (error) {
        console.error(`获取文章失败, ${url} - ${JSON.stringify(error)}`, error);
        return []
    }
}

/**
 * 解析 RSS URL 列表
 * @param {Array} validUrls - RSS URL 数组
 * @param {Number} inXDay - 获取最近几天的文章
 * @param {Object} app - Fastify app 实例
 * @returns {Object} { result, requsetStatus, errors }
 */
async function parserFeedUrl(validUrls, inXDay = 1, app) {
    if (!validUrls?.length) return { result: [], requsetStatus: [], errors: [] }
    const result = [];
    const errors = [];
    // 记录多个rss地址的初始化状态
    const requsetStatus = Array.from({ length: validUrls.length }).fill(false);
    const promises = validUrls.map(async (url, index) => {
        try {
            const feed = await parser.parseURL(url);
            const currentResult = await formatFeedItems(app, feed, inXDay, url);
            requsetStatus[index] = true;
            return { index, result: currentResult };
        } catch (error) {
            const errorMsg = error.message || '未知错误';
            console.error(`获取文章失败, ${url} - ${errorMsg}`);
            requsetStatus[index] = false;
            errors[index] = errorMsg;
            return { index, error: errorMsg };
        }
    });

    const settledResults = await Promise.allSettled(promises);

    settledResults.forEach(settled => {
        if (settled.status === 'fulfilled') {
            const { index, result: currentResult } = settled.value;
            result[index] = currentResult;
        }
    });
    return { result, requsetStatus, errors }
}
module.exports = { parserFeedUrl, formatFeedItems }