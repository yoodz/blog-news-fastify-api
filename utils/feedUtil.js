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

/**
 * 
 * @param inXDay 在 inXDay 以内
 * @returns 
 */
async function parserFeedUrl(validUrls, inXDay = 1, app) {
    // const url = 'https://hadb.me/atom.xml'
    // const url = 'https://innei.in/feed'
    if (!validUrls?.length) return { result: [], requsetStatus: [] }
    const result = [];
    // 记录多个rss地址的初始化状态
    const requsetStatus = Array.from({ length: validUrls.length }).fill(false);
    for (let index = 0; index < validUrls.length; index++) {
        const url = validUrls[index];

        const articles = await app.mongo.db.collection('article').find({ rssUrl: url }).project({
            link: 1,           // 包含 url 字段
        }).toArray();
        const currentResut = []
        try {
            let feed = await parser.parseURL(url);
            requsetStatus[index] = true;
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
        } catch (error) {
            console.error(`获取文章失败, ${url} - ${JSON.stringify(error)}`);
            continue
        }
        result[index] = currentResut
    }
    return { result, requsetStatus }
}
module.exports = parserFeedUrl