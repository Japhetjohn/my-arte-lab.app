const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 second timeout for initial connection
      socketTimeoutMS: 45000, // 45 second socket timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
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
