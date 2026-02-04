const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Student = require('../models/student.model');
const Admission = require('../models/admission.model');
const StudentFee = require('../models/studentFee.model');
const User = require('../models/user.model');

/**
 * Comprehensive cleanup script for deleted students
 * Removes orphaned admissions and related data
 */

async function cleanupDeletedStudents() {
  try {
    console.log('🔧 Starting comprehensive student cleanup...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to database\n');

    // STEP 1: Find all admissions that don't have corresponding students
    console.log('📋 STEP 1: Finding orphaned admissions...');
    const allAdmissions = await Admission.find({});
    const orphanedAdmissions = [];

    for (const admission of allAdmissions) {
      const studentExists = await Student.findOne({ admission: admission._id });
      if (!studentExists) {
        orphanedAdmissions.push(admission._id);
      }
    }

    console.log(`   Found ${orphanedAdmissions.length} orphaned admissions\n`);

    // STEP 2: Delete orphaned admissions
    if (orphanedAdmissions.length > 0) {
      console.log('🗑️  STEP 2: Deleting orphaned admissions...');
      const deleteResult = await Admission.deleteMany({ _id: { $in: orphanedAdmissions } });
      console.log(`   Deleted ${deleteResult.deletedCount} orphaned admission records\n`);
    }

    // STEP 3: Find students marked as inactive or deleted
    console.log('📋 STEP 3: Finding inactive/deleted students...');
    const inactiveStudents = await Student.find({ 
      $or: [
        { isActive: false },
        { status: 'deleted' },
        { status: 'inactive' }
      ]
    });
    console.log(`   Found ${inactiveStudents.length} inactive/deleted students\n`);

    // STEP 4: Delete related data for inactive students
    if (inactiveStudents.length > 0) {
      const inactiveStudentIds = inactiveStudents.map(s => s._id);
      const inactiveUserIds = inactiveStudents.map(s => s.user).filter(Boolean);
      const inactiveAdmissionIds = inactiveStudents.map(s => s.admission).filter(Boolean);

      console.log('🗑️  STEP 4: Deleting related data for inactive students...');
      
      // Delete StudentFee records
      const feeDeleteResult = await StudentFee.deleteMany({ student: { $in: inactiveStudentIds } });
      console.log(`   Deleted ${feeDeleteResult.deletedCount} StudentFee records`);

      // Delete Admission records
      const admissionDeleteResult = await Admission.deleteMany({ _id: { $in: inactiveAdmissionIds } });
      console.log(`   Deleted ${admissionDeleteResult.deletedCount} Admission records`);

      // Delete User records (be careful - only delete if they're students)
      const userDeleteResult = await User.deleteMany({ 
        _id: { $in: inactiveUserIds },
        role: 'student'
      });
      console.log(`   Deleted ${userDeleteResult.deletedCount} User records`);

      // Delete Student records
      const studentDeleteResult = await Student.deleteMany({ _id: { $in: inactiveStudentIds } });
      console.log(`   Deleted ${studentDeleteResult.deletedCount} Student records\n`);
    }

    // STEP 5: Find students whose users have been deleted
    console.log('📋 STEP 5: Finding students with deleted users...');
    const studentsWithUsers = await Student.find({}).populate('user');
    const studentsWithDeletedUsers = studentsWithUsers.filter(s => !s.user);
    
    console.log(`   Found ${studentsWithDeletedUsers.length} students with deleted users\n`);

    // STEP 6: Delete students with deleted users
    if (studentsWithDeletedUsers.length > 0) {
      console.log('🗑️  STEP 6: Deleting students with deleted users...');
      const orphanedStudentIds = studentsWithDeletedUsers.map(s => s._id);
      const orphanedAdmissionIds = studentsWithDeletedUsers.map(s => s.admission).filter(Boolean);

      // Delete StudentFees
      const feeDeleteResult2 = await StudentFee.deleteMany({ student: { $in: orphanedStudentIds } });
      console.log(`   Deleted ${feeDeleteResult2.deletedCount} StudentFee records`);

      // Delete Admissions
      const admissionDeleteResult2 = await Admission.deleteMany({ _id: { $in: orphanedAdmissionIds } });
      console.log(`   Deleted ${admissionDeleteResult2.deletedCount} Admission records`);

      // Delete Students
      const studentDeleteResult2 = await Student.deleteMany({ _id: { $in: orphanedStudentIds } });
      console.log(`   Deleted ${studentDeleteResult2.deletedCount} Student records\n`);
    }

    // STEP 7: Summary
    console.log('📊 CLEANUP SUMMARY:');
    const remainingStudents = await Student.countDocuments({});
    const remainingAdmissions = await Admission.countDocuments({});
    const remainingFees = await StudentFee.countDocuments({});
    
    console.log(`   Students remaining: ${remainingStudents}`);
    console.log(`   Admissions remaining: ${remainingAdmissions}`);
    console.log(`   StudentFees remaining: ${remainingFees}`);
    
    console.log('\n✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the cleanup
cleanupDeletedStudents()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });
