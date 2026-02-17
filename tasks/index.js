const rssUpdate = require('./rssUpdate');
const dailyVisitReport = require('./dailyVisitReport');
const cleanupRequestLogs = require('./cleanupRequestLogs');

module.exports = {
  // 任务函数
  rssUpdate,
  dailyVisitReport,
  cleanupRequestLogs
};
