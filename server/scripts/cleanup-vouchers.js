/**
 * ONE-TIME CLEANUP SCRIPT
 * Purpose: Removes orphaned FeeVouchers and StudentFees for cancelled or deleted admissions.
 * Instructions: 
 * 1. Upload this file to /server/scripts/cleanup-vouchers.js
 * 2. Run: node scripts/cleanup-vouchers.js
 */
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');

// Models
const Admission = require('../models/Admission');
const Student = require('../models/Student');
const FeeVoucher = require('../models/FeeVoucher');
const StudentFee = require('../models/StudentFee');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const runCleanup = async () => {
  await connectDB();
  console.log('--- Starting Voucher & Fee Cleanup ---');

  try {
    // 1. Cleanup by Status: Find all admissions marked as 'cancelled'
    const cancelledAdmissions = await Admission.find({ status: 'cancelled' });
    console.log(`Found ${cancelledAdmissions.length} admissions with status 'cancelled'`);

    for (const admission of cancelledAdmissions) {
      const voucherQuery = { $or: [{ admission: admission._id }] };
      if (admission.studentId) voucherQuery.$or.push({ student: admission.studentId });
      
      const vResult = await FeeVoucher.deleteMany(voucherQuery);
      const fResult = await StudentFee.deleteMany({ student: admission.studentId });
      
      if (vResult.deletedCount > 0 || fResult.deletedCount > 0) {
        console.log(`Cleaned up for Admission ${admission.applicationNumber || admission._id}: ${vResult.deletedCount} vouchers, ${fResult.deletedCount} fees.`);
      }
    }

    // 2. Cleanup Orphans: Find vouchers/fees pointing to non-existent students or admissions
    console.log('Checking for orphaned records...');
    
    const allVouchers = await FeeVoucher.find({});
    for (const v of allVouchers) {
      if (v.admission) {
        const exists = await Admission.exists({ _id: v.admission });
        if (!exists) {
          await FeeVoucher.deleteOne({ _id: v._id });
          console.log(`Deleted orphaned voucher ${v.voucherNumber} (missing admission)`);
        }
      }
    }

    const allFees = await StudentFee.find({});
    for (const f of allFees) {
      if (f.student) {
        const exists = await Student.exists({ _id: f.student });
        if (!exists) {
          await StudentFee.deleteOne({ _id: f._id });
          console.log(`Deleted orphaned fee assignment for student ID ${f.student}`);
        }
      }
    }

    console.log('--- Cleanup Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup Error:', err);
    process.exit(1);
  }
};

runCleanup();
