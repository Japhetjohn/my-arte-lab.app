const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 second timeout for initial connection
      socketTimeoutMS: 45000, // 45 second socket timeout
      // Scale connection pool based on environment
      // 500 concurrent users need ~50-100 connections (10% rule)
      maxPoolSize: isProduction ? 100 : 20, // 100 in prod, 20 in dev
      minPoolSize: isProduction ? 10 : 2,   // 10 in prod, 2 in dev
      maxConnecting: 20, // Max simultaneous connection attempts
      maxIdleTimeMS: 60000, // Close idle connections after 60s
      waitQueueTimeoutMS: 10000, // Max wait time for connection from pool
      retryWrites: true, // Retry failed writes
      retryReads: true, // Retry failed reads
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    mongoose.connection.on('error', (err) => {
      console.error(` MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(' MongoDB disconnected. Attempting to reconnect...');
    });

    return conn;
  } catch (error) {
    console.error(` MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDatabase;
