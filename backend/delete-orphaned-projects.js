const mongoose = require('mongoose');

async function deleteOrphanedProjects() {
  try {
    await mongoose.connect('mongodb+srv://japhetjohnk:5ppeVm6cT0KQNwP4@myartelab-new.dmjg1gv.mongodb.net/myartelab');
    console.log('✅ Connected to production MongoDB\n');

    const db = mongoose.connection.db;
    const projectsCollection = db.collection('projects');

    const beforeCount = await projectsCollection.countDocuments();
    console.log(`📊 Total projects before cleanup: ${beforeCount}`);

    // Delete ALL projects since we deleted all users
    const result = await projectsCollection.deleteMany({});

    console.log(`\n🗑️  Deleted ${result.deletedCount} orphaned projects`);

    const remaining = await projectsCollection.countDocuments();
    console.log(`📊 Remaining projects: ${remaining}`);

    console.log('\n✅ All orphaned projects deleted!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteOrphanedProjects();
