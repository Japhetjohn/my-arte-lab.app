const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    // MongoDB connection options for better Atlas compatibility
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 second timeout for initial connection
      socketTimeoutMS: 45000, // 45 second socket timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      retryWrites: true, // Retry failed writes
      retryReads: true, // Retry failed reads
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(` MongoDB Connected: ${conn.connection.host}`);
    console.log(` Database: ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error(` MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(' MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log(' MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error(` MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      // In production, exit if we can't connect to the database
      process.exit(1);
    } else {
      // In development, log error but allow server to continue
      console.warn(' Continuing in development mode without database connection');
    }
  }
};

module.exports = connectDatabase;
