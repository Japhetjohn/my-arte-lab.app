#!/usr/bin/env node
/**
 * Fix invalid creator categories in the database
 * Maps invalid categories to valid ones and sets empty categories to 'other'
 * 
 * Run: node scripts/fixCategories.js
 * Dry run (preview only): DRY_RUN=1 node scripts/fixCategories.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const DRY_RUN = process.env.DRY_RUN === '1';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment');
  process.exit(1);
}

// Mapping of invalid → valid categories
const CATEGORY_MAPPING = {
  'photographer': 'photography',
  'videographer': 'video',
  'designer': 'design',
  'illustrator': 'design',
  'writer': 'writing',
  'developer': 'programming',
  'coder': 'programming',
  'marketer': 'marketing',
  'musician': 'music',
  'video editor': 'video',
  'photo editor': 'photography',
  'graphic designer': 'design',
  'web developer': 'programming',
  'app developer': 'programming',
  'content writer': 'writing',
  'copywriter': 'writing',
  'social media': 'marketing',
  'seo': 'marketing',
};

const VALID_CATEGORIES = [
  'photography', 'design', 'music', 'video', 'writing',
  'marketing', 'programming', 'business', 'other'
];

async function fixCategories() {
  try {
    console.log(DRY_RUN ? '📋 DRY RUN MODE (no changes will be made)\n' : '🔧 FIX MODE (changes will be saved)\n');
    console.log('🔌 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const User = require('../src/models/User');

    // 1. Find all creators with invalid or empty categories
    const allCreators = await User.find(
      { role: 'creator' },
      { firstName: 1, lastName: 1, email: 1, category: 1 }
    ).lean();

    let fixedCount = 0;
    let skippedCount = 0;
    const changes = [];

    for (const creator of allCreators) {
      const currentCat = creator.category;
      let newCat = currentCat;
      let reason = '';

      // Empty/null/undefined → 'other'
      if (!currentCat || currentCat === '') {
        newCat = 'other';
        reason = 'empty/null';
      }
      // Invalid category → map or default to 'other'
      else if (!VALID_CATEGORIES.includes(currentCat)) {
        newCat = CATEGORY_MAPPING[currentCat.toLowerCase()] || 'other';
        reason = `invalid "${currentCat}"`;
      }
      // Valid → skip
      else {
        skippedCount++;
        continue;
      }

      changes.push({
        name: `${creator.firstName} ${creator.lastName}`,
        email: creator.email,
        from: currentCat || '(empty)',
        to: newCat,
        reason
      });

      if (!DRY_RUN) {
        await User.updateOne(
          { _id: creator._id },
          { $set: { category: newCat } }
        );
      }
      fixedCount++;
    }

    // Print results
    console.log(`📊 Results:`);
    console.log(`  Total creators checked: ${allCreators.length}`);
    console.log(`  ✅ Already valid: ${skippedCount}`);
    console.log(`  ${DRY_RUN ? '🔍 Would fix' : '🔧 Fixed'}: ${fixedCount}\n`);

    if (changes.length > 0) {
      console.log('📝 Changes:');
      console.log('─'.repeat(60));
      for (const c of changes) {
        console.log(`  ${c.name} (${c.email})`);
        console.log(`    ${c.from} → ${c.to} (${c.reason})`);
      }
      console.log('─'.repeat(60));
    }

    if (DRY_RUN && fixedCount > 0) {
      console.log(`\n💡 To apply these fixes, run without DRY_RUN=1`);
    }

    console.log('\n✅ Done!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixCategories();
