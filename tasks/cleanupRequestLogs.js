/**
 * 清理旧请求日志任务
 * 定期清理超过保留天数的请求日志
 */

async function cleanupRequestLogs(fastify) {
  try {
    const retentionDays = parseInt(process.env.REQUEST_LOG_RETENTION_DAYS || '30', 10);

    if (!fastify.requestLogs) {
      console.error('requestLogs decorator not available');
      return;
    }

    const result = await fastify.requestLogs.cleanupOldLogs(retentionDays);

    console.log(`[cleanupRequestLogs] Cleaned up ${result.deletedCount} old logs (older than ${retentionDays} days)`);

    // 可选：发送清理完成通知
    // await notify(`清理完成: 删除了 ${result.deletedCount} 条旧日志`);
  } catch (error) {
    console.error('[cleanupRequestLogs] Error:', error);
  }
}

module.exports = cleanupRequestLogs;
