#!/usr/bin/env node
/**
 * Check creator categories in the database
 * Run: node scripts/checkCategories.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment');
  process.exit(1);
}

// Valid categories from backend constants
const VALID_CATEGORIES = [
  'photography', 'design', 'music', 'video', 'writing',
  'marketing', 'programming', 'business', 'other'
];

async function checkCategories() {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const User = require('../src/models/User');

    // 1. Total creators
    const totalCreators = await User.countDocuments({ role: 'creator' });
    console.log(`📊 Total creators: ${totalCreators}\n`);

    // 2. Category counts (grouped by actual DB values)
    const categoryCounts = await User.aggregate([
      { $match: { role: 'creator' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📁 Category distribution (raw DB values):');
    console.log('─'.repeat(40));
    
    let validCount = 0;
    let invalidCount = 0;
    const invalidCategories = [];

    for (const cat of categoryCounts) {
      const isValid = VALID_CATEGORIES.includes(cat._id);
      const status = isValid ? '✅' : '❌ INVALID';
      console.log(`  ${status} ${cat._id || '(empty)'}: ${cat.count}`);
      
      if (isValid) {
        validCount += cat.count;
      } else {
        invalidCount += cat.count;
        invalidCategories.push({ name: cat._id, count: cat.count });
      }
    }
    console.log('─'.repeat(40));
    console.log(`  Valid: ${validCount} | Invalid: ${invalidCount}\n`);

    // 3. Show invalid categories in detail
    if (invalidCategories.length > 0) {
      console.log('⚠️  Invalid categories found:');
      for (const inv of invalidCategories) {
        console.log(`   - "${inv.name}": ${inv.count} creator(s)`);
        // Show sample users
        const samples = await User.find(
          { role: 'creator', category: inv.name },
          { firstName: 1, lastName: 1, email: 1, category: 1 }
        ).limit(3).lean();
        for (const s of samples) {
          console.log(`       → ${s.firstName} ${s.lastName} (${s.email})`);
        }
      }
      console.log('');
    }

    // 4. Creators with no category
    const noCategory = await User.countDocuments({
      role: 'creator',
      $or: [
        { category: '' },
        { category: null },
        { category: { $exists: false } }
      ]
    });
    console.log(`🚫 Creators with no category: ${noCategory}\n`);

    // 5. Suggested fixes
    console.log('🔧 Suggested mapping for invalid categories:');
    const suggestedMappings = {
      'photographer': 'photography',
      'videographer': 'video',
      'designer': 'design',
      'illustrator': 'design',
      'writer': 'writing',
      'developer': 'programming',
      'coder': 'programming',
    };
    
    for (const inv of invalidCategories) {
      const suggestion = suggestedMappings[inv.name] || 'other';
      console.log(`  "${inv.name}" → "${suggestion}" (${inv.count} users)`);
    }

    console.log('\n✅ Done!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCategories();
