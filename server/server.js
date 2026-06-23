const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');
const createSuperAdmin = require('./utils/createSuperAdmin');
const seedRoles = require('./utils/seedRoles');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app = express();

// Connect to MongoDB
const mongoose = require('mongoose'); // Ensure mongoose is imported

// Connect to MongoDB
connectDB().then(async () => {
  // Create default roles if don't exist
  await seedRoles();
  // Create super admin if doesn't exist
  await createSuperAdmin();

  // === DB MIGRATION: FIX DUPLICATE INDEXES ===
  // Check for the incorrect global unique index on applicationNumber and drop it
  try {
    const admissionsCols = await mongoose.connection.db.listCollections({ name: 'admissions' }).toArray();
    if (admissionsCols.length > 0) {
      const indexes = await mongoose.connection.db.collection('admissions').indexes();
      const needsDrop = indexes.find(idx => idx.name === 'applicationNumber_1');
      
      if (needsDrop) {
        console.log('⚠️  Found incorrect global unique index "applicationNumber_1". Dropping it to fix cross-institution imports...');
        await mongoose.connection.db.collection('admissions').dropIndex('applicationNumber_1');
        console.log('✅ Index dropped successfully. Application numbers act unique per institution now.');
      } else {
        console.log('✅ Database indexes verified for admissions.');
      }
    }

    const studentsCols = await mongoose.connection.db.listCollections({ name: 'students' }).toArray();
    if (studentsCols.length > 0) {
      const indexes = await mongoose.connection.db.collection('students').indexes();
      const needsDrop = indexes.find(idx => idx.name === 'enrollmentNumber_1');
      
      if (needsDrop) {
        console.log('⚠️  Found incorrect global unique index "enrollmentNumber_1" on students. Dropping it to fix cross-institution enrollments...');
        await mongoose.connection.db.collection('students').dropIndex('enrollmentNumber_1');
        console.log('✅ Student enrollmentNumber unique index dropped successfully.');
      } else {
        console.log('✅ Database indexes verified for students.');
      }
    }
  } catch (idxError) {
    console.error('❌ Index migration check failed:', idxError.message);
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Serve uploaded files statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

const PORT = process.env.PORT || 5000;

// Routes
app.use('/api', require('./routes'));

// Legacy routes (will be deprecated)
app.use('/api/auth', require('./routes/v1/auth.routes'));
app.use('/api/user', require('./routes/v1/user.routes'));

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API v1: http://localhost:${PORT}/api/v1`);
});

module.exports = app;
