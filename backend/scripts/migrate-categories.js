/**
 * Silent Migration: Creator Categories
 * 
 * This script maps old category IDs to the new category structure.
 * Run this on the server using: node scripts/migrate-categories.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Project = require('../src/models/Project');

const CATEGORY_MAP = {
  // Old ID -> New ID
  'design': 'graphic_design',
  'video': 'videography',
  'writing': 'content_creation',
  'marketing': 'ugc_creators',
  'programming': 'other', // Suggesting 'other' or a manual check if none fit perfectly
  'business': 'other',
  'music': 'other',
  'illustration': 'graphic_design'
};

async function migrate() {
  try {
    console.log('🚀 Starting Category Migration...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to Database');

    // 1. Migrate Users
    const users = await User.find({ role: 'creator', category: { $exists: true } });
    console.log(`🔍 Found ${users.length} creators to check...`);

    let userUpdates = 0;
    for (const user of users) {
      let changed = false;
      const newCategories = user.category.map(cat => {
        if (CATEGORY_MAP[cat]) {
          changed = true;
          return CATEGORY_MAP[cat];
        }
        return cat;
      });

      if (changed) {
        user.category = newCategories;
        await user.save({ validateBeforeSave: false }); // Skip validation for legacy cases
        userUpdates++;
      }
    }
    console.log(`✅ Successfully updated ${userUpdates} user profiles.`);

    // 2. Migrate Projects
    const projects = await Project.find({ category: { $in: Object.keys(CATEGORY_MAP) } });
    console.log(`🔍 Found ${projects.length} projects to update...`);

    let projectUpdates = 0;
    for (const project of projects) {
      const newCat = CATEGORY_MAP[project.category];
      if (newCat) {
        project.category = newCat;
        await project.save({ validateBeforeSave: false });
        projectUpdates++;
      }
    }
    console.log(`✅ Successfully updated ${projectUpdates} projects.`);

    console.log('🎉 Migration Finished Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Failed:', error);
    process.exit(1);
  }
}

migrate();
