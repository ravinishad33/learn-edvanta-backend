const os = require("os");

// In-memory store for last N query times
const queryTimes = [];
const MAX_LOGS = 100; // only keep last 100 queries

const logQueryTime = (durationMs) => {
  queryTimes.push(durationMs);
  if (queryTimes.length > MAX_LOGS) queryTimes.shift(); // remove oldest
};

const getAvgQueryTime = () => {
  if (!queryTimes.length) {
    return { avgQueryTime: 0, queryTimePercent: 0 };
  }

  const sum = queryTimes.reduce((acc, t) => acc + t, 0);
  const avgQueryTime = Math.round(sum / queryTimes.length);

  //   const maxQueryTime = 200;
  // const minQueryTime = Math.min(...queryTimes);
  const maxQueryTime = Math.max(...queryTimes, 1);


  // threshold for 100% slow
  let queryTimePercent = ((avgQueryTime / maxQueryTime) * 100);

  // Cap at 100%
  if (queryTimePercent > 100) queryTimePercent = 100;

  return {
    avgQueryTime, // in ms
    queryTimePercent: `${queryTimePercent.toFixed(1)}`, // formatted string
  };
};




// get cpu usage details 
const getCpuUsage = async (delay = 100) => {
  const start = os.cpus();

  await new Promise(resolve => setTimeout(resolve, delay));

  const end = os.cpus();

  let idleDiff = 0;
  let totalDiff = 0;

  for (let i = 0; i < start.length; i++) {
    const startTotal = Object.values(start[i].times).reduce((a, b) => a + b);
    const endTotal = Object.values(end[i].times).reduce((a, b) => a + b);

    totalDiff += endTotal - startTotal;
    idleDiff += end[i].times.idle - start[i].times.idle;
  }

  const usage = 100 - Math.floor((idleDiff / totalDiff) * 100);

  return `${usage}`;
};








// system logs 
const systemLogs = [];
const MAX_LOGTASKS = 3;

const addSystemLog = (task) => {
  systemLogs.unshift({
    task,
    time: new Date()
  });

  if (systemLogs.length > MAX_LOGTASKS) {
    systemLogs.pop();
  }
};




module.exports = { logQueryTime, getAvgQueryTime, getCpuUsage, addSystemLog };