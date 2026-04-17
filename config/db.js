const mongoose = require('mongoose');

let usedConnections = 0;
let maxPoolSize = 50; // default

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 50,
    });

    maxPoolSize = conn.connection.client.options.maxPoolSize;

    const client = mongoose.connection.getClient();

    client.on('connectionCreated', () => {
      usedConnections++;
    });

    client.on('connectionClosed', () => {
      usedConnections--;
      if (usedConnections < 0) usedConnections = 0;
    });

  console.log("connected to mongoose..")
  } catch (error) {
     console.log("mongoose connection error ",error.message)
    process.exit(1);
  }
};

const getPoolStats = () => {
  const poolPercent = maxPoolSize
    ? ((usedConnections / maxPoolSize) * 100).toFixed(1)
    : "0.0";

  return {
    usedConnections,
    maxPoolSize,
    poolPercent: `${poolPercent}`,
  };
};

module.exports = { connectDB, getPoolStats };