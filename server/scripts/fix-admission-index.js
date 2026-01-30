// Script to fix the applicationNumber index in Admissions collection
// Run this with: node server/scripts/fix-admission-index.js

const mongoose = require('mongoose');
require('dotenv').config();

async function fixAdmissionIndex() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sgceducation';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoUri);

    const db = mongoose.connection.db;
    const collection = db.collection('admissions');

    // Get all indexes
    console.log('\nCurrent indexes on admissions collection:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(' -', JSON.stringify(index.key), index.name);
    });

    // Drop the old unique index on applicationNumber alone
    try {
      await collection.dropIndex('applicationNumber_1');
      console.log('\n✓ Successfully dropped old index: applicationNumber_1');
    } catch (err) {
      if (err.code === 27 || err.message.includes('index not found')) {
        console.log('\n✓ Index applicationNumber_1 does not exist (already removed)');
      } else {
        throw err;
      }
    }

    // Create the new compound unique index
    try {
      await collection.createIndex(
        { applicationNumber: 1, institution: 1 },
        { unique: true, name: 'applicationNumber_1_institution_1' }
      );
      console.log('✓ Created new compound index: applicationNumber_1_institution_1');
    } catch (err) {
      if (err.code === 85 || err.message.includes('already exists')) {
        console.log('✓ Compound index already exists');
      } else {
        throw err;
      }
    }

    // Verify final indexes
    console.log('\nFinal indexes on admissions collection:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(index => {
      console.log(' -', JSON.stringify(index.key), index.name);
    });

    console.log('\n✓ Index fix completed successfully!');
    console.log('\nNow you can import students with the same admission number across different institutions!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing index:', error);
    process.exit(1);
  }
}

fixAdmissionIndex();
