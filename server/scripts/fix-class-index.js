// Script to drop the old duplicate index from Classes collection
// Run this with: node server/scripts/fix-class-index.js

const mongoose = require('mongoose');
require('dotenv').config();

async function fixClassIndex() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sgceducation';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoUri);

    const db = mongoose.connection.db;
    const collection = db.collection('classes');

    // Get all indexes
    console.log('\nCurrent indexes on classes collection:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(' -', JSON.stringify(index.key), index.name);
    });

    // Drop the old index with department
    try {
      await collection.dropIndex('code_1_department_1_academicYear_1');
      console.log('\n✓ Successfully dropped old index: code_1_department_1_academicYear_1');
    } catch (err) {
      if (err.code === 27 || err.message.includes('index not found')) {
        console.log('\n✓ Index code_1_department_1_academicYear_1 does not exist (already removed)');
      } else {
        throw err;
      }
    }

    // Verify final indexes
    console.log('\nFinal indexes on classes collection:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(index => {
      console.log(' -', JSON.stringify(index.key), index.name);
    });

    console.log('\n✓ Index fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing index:', error);
    process.exit(1);
  }
}

fixClassIndex();
