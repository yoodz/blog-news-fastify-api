/**
 * 通知相关工具函数
 */

// 触发 Cloudflare 部署
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

// 发送 Bark 推送
async function sendBarkNotification(title, content) {
  try {
    const fetch = (await import('node-fetch')).default;
    const barkUrl = process.env.BARK_URL;
    if (!barkUrl) {
      console.log('BARK_URL 环境变量未配置，跳过推送');
      return;
    }
    const encodedTitle = encodeURIComponent(title);
    const encodedContent = encodeURIComponent(content);
    const url = `${barkUrl}/${encodedTitle}/${encodedContent}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    console.log('Bark 推送成功');
  } catch (err) {
    console.error('Bark 推送失败:', err);
  }
}

module.exports = {
  triggerDeploy,
  sendBarkNotification
};
