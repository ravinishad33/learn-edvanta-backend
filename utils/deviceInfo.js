const UAParser = require("ua-parser-js");

const getDeviceInfo = (req) => {
  // Get IP address
  const ipAddress =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    req.ip;

  // Parse device info from User-Agent
  const parser = new UAParser(req.headers["user-agent"]);
  const deviceInfo = parser.getResult();
  const deviceName = `${deviceInfo.browser.name || "Unknown Browser"} on ${deviceInfo.os.name || "Unknown OS"}`;

  return { ipAddress, deviceName };
};

module.exports = { getDeviceInfo};