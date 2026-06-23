const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Student = require('../models/Student');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function syncEnrolledStudents() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all admissions that are marked as 'enrolled' in 2026-2027
    const enrolledAdmissions = await Admission.find({
      status: 'enrolled',
      academicYear: '2026-2027'
    }).lean();

    console.log(`Found ${enrolledAdmissions.length} admissions marked as 'enrolled'.`);

    // Check which ones have Student records
    const admissionIds = enrolledAdmissions.map(a => a._id);
    const existingStudents = await Student.find({ admission: { $in: admissionIds } }).select('admission').lean();
    
    const existingAdmissionIds = new Set(existingStudents.map(s => s.admission.toString()));
    
    const missingStudents = enrolledAdmissions.filter(a => !existingAdmissionIds.has(a._id.toString()));
    
    console.log(`Missing Student records for ${missingStudents.length} enrolled admissions.`);

    if (missingStudents.length > 0) {
      console.log('Creating missing Student records...');
      
      const User = require('../models/User'); // Ensure User model is loaded

      let successes = 0;
      let errorsCount = 0;
      
      console.log('Starting sync process...');

      for (const val of missingStudents) {
         try {
            // 1. Create or Find User
            const email = val.contactInfo?.email;
            const generatedEmail = `${val.applicationNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}.${val._id.toString()}@no-email.system`;
            const userEmail = email || generatedEmail;

            let user = await User.findOne({ email: userEmail });
           
           if (!user) {
             user = await User.create({
               name: val.personalInfo?.name || 'Student',
               email: userEmail,
               password: Math.random().toString(36).slice(-8),
               role: 'student',
               institution: val.institution,
               // Add fewer fields to minimize validation errors
             });
           }
           
           // 2. Create Student
           await Student.create({
             user: user._id,
             institution: val.institution,
             admission: val._id,
             studentId: val.studentId, 
             enrollmentNumber: val.applicationNumber, 
             rollNumber: val.rollNumber,
             admissionDate: val.createdAt || new Date(),
             academicYear: val.academicYear,
             program: val.program || 'General',
             status: 'active', // Correct status
             isActive: true,
             createdBy: user._id, // Self-created or system
             personalDetails: {
               // Map fields safely
               nationality: val.personalInfo?.nationality || 'Pakistani',
               category: val.personalInfo?.category || 'General'
             },
             guardianInfo: val.guardianInfo
           });
           
           // 3. Update Admission to link student? (Already done implicitly by finding it, but good to be sure)
           // Actually Admission.studentId is a reference. 
           // We should update it if we want the link to be bidirectional, but for now Student->Admission is enough for the graph.
           
           successes++;
           if (successes % 50 === 0) console.log(`Processed ${successes} students...`);

         } catch(e) {
           errorsCount++;
           console.log(`Failed for Admission ${val._id}: ${e.message}`);
         }
      }
      
      console.log(`Finished. Success: ${successes}, Failed: ${errorsCount}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

syncEnrolledStudents();
