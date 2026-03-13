const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('../config/database');

const listCollections = async () => {
  try {
    await connectDB();
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in DB:', collections.map(c => c.name));
    
    for (const coll of collections) {
        const count = await mongoose.connection.db.collection(coll.name).countDocuments();
        console.log(`- ${coll.name}: ${count}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('List collections failed:', error);
    process.exit(1);
  }
};

listCollections();
