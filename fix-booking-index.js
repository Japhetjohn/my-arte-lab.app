// MongoDB script to fix the idempotencyKey index issue
// Run this on the server: mongo myartelab fix-booking-index.js
// Or use: node fix-booking-index.js with Mongoose

const mongoose = require('mongoose');

async function fixIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('bookings');
    
    // Get current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(i => ({ name: i.name, key: i.key, sparse: i.sparse })));
    
    // Drop the problematic idempotencyKey_1 index if it exists
    const idempotencyIndex = indexes.find(i => i.name === 'idempotencyKey_1');
    if (idempotencyIndex) {
      console.log('Dropping idempotencyKey_1 index...');
      await collection.dropIndex('idempotencyKey_1');
      console.log('Index dropped successfully');
    }
    
    // Create new sparse index
    console.log('Creating new sparse index on idempotencyKey...');
    await collection.createIndex({ idempotencyKey: 1 }, { 
      unique: true, 
      sparse: true,
      name: 'idempotencyKey_1_sparse'
    });
    console.log('New sparse index created successfully');
    
    // Show final indexes
    const finalIndexes = await collection.indexes();
    console.log('Final indexes:', finalIndexes.map(i => ({ name: i.name, key: i.key, sparse: i.sparse })));
    
    await mongoose.disconnect();
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixIndex();
