// services/systemLogService.js

const systemLogs = [];
const MAX_LOGTASKS = 3;

// Add or update log
const upsertSystemLog = (task) => {
  const existing = systemLogs.find(log => log.task === task);

  if (existing) {
    existing.time = new Date();
  } else {
    systemLogs.unshift({
      task,
      time: new Date()
    });

    // Keep only latest 3
    if (systemLogs.length > MAX_LOGTASKS) {
      systemLogs.pop();
    }
  }
};

// Remove log if condition becomes false
const removeSystemLog = (task) => {
  const index = systemLogs.findIndex(log => log.task === task);
  if (index !== -1) {
    systemLogs.splice(index, 1);
  }
};

// Format time
const formatTimeAgo = (date) => {
  const diff = Math.floor((Date.now() - date) / 1000);

  if (diff < 60) return `${diff} sec ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

// Get formatted logs
const getSystemLogs = () => {
  return systemLogs.map(log => ({
    task: log.task,
    time: formatTimeAgo(log.time)
  }));
};

module.exports = {
  upsertSystemLog,
  removeSystemLog,
  getSystemLogs
};