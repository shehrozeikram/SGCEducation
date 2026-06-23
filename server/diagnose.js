const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env file from server directory
const envPath = path.join(__dirname, '.env');
let mongoUri = 'mongodb://127.0.0.1:27017/sgceducation';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/MONGODB_URI=(.*)/);
  if (match && match[1]) {
    mongoUri = match[1].trim();
  }
}

console.log('Connecting to database:', mongoUri);

async function diagnose() {
  await mongoose.connect(mongoUri);
  console.log('Connected successfully!');

  // Require models and services
  const Admission = require('./models/Admission');
  const Student = require('./models/Student');
  const admissionService = require('./services/admission.service');

  const totalAdmissions = await Admission.countDocuments();
  const enrolledAdmissions = await Admission.find({ status: 'enrolled' });
  const enrolledAdmissionsWithStudentId = enrolledAdmissions.filter(a => a.studentId);
  const enrolledAdmissionsWithoutStudentId = enrolledAdmissions.filter(a => !a.studentId);

  const totalStudents = await Student.countDocuments();

  console.log('\n--- DIAGNOSTICS ---');
  console.log('Total Admissions in DB:', totalAdmissions);
  console.log('Enrolled Admissions:', enrolledAdmissions.length);
  console.log('Enrolled Admissions with studentId:', enrolledAdmissionsWithStudentId.length);
  console.log('Enrolled Admissions without studentId:', enrolledAdmissionsWithoutStudentId.length);
  console.log('Total Students in DB:', totalStudents);

  if (enrolledAdmissionsWithoutStudentId.length > 0) {
    console.log('\nAttempting to create student profile for all missing admissions...');
    let successCount = 0;
    let failCount = 0;
    
    // Let's run for all of them to find all failures and group them by error type
    const errorsMap = {};
    
    for (const admission of enrolledAdmissionsWithoutStudentId) {
      try {
        const mockUser = { _id: admission.createdBy || new mongoose.Types.ObjectId() };
        // Populate institution if it's a ref and needed
        if (admission.institution && typeof admission.institution === 'object') {
          // already populated or object
        } else if (admission.institution) {
          await admission.populate('institution');
        }
        
        const student = await admissionService._createStudentFromAdmission(admission, mockUser);
        successCount++;
      } catch (error) {
        failCount++;
        const errorKey = `${error.name}: ${error.message}`;
        if (!errorsMap[errorKey]) {
          errorsMap[errorKey] = {
            count: 0,
            samples: []
          };
        }
        errorsMap[errorKey].count++;
        if (errorsMap[errorKey].samples.length < 3) {
          errorsMap[errorKey].samples.push({
            id: admission._id,
            name: `${admission.firstName} ${admission.lastName}`,
            email: admission.email,
            applicationNumber: admission.applicationNumber,
            validationErrors: error.errors ? Object.keys(error.errors).map(k => `${k}: ${error.errors[k].message}`) : null
          });
        }
      }
    }
    
    console.log(`\nResults: ${successCount} successfully created, ${failCount} failed.`);
    if (failCount > 0) {
      console.log('\nFailed errors details:');
      for (const [key, details] of Object.entries(errorsMap)) {
        console.log(`\n- Error: ${key}`);
        console.log(`  Count: ${details.count}`);
        console.log(`  Samples:`);
        console.log(JSON.stringify(details.samples, null, 2));
      }
    }
  } else {
    console.log('No enrolled admissions found without studentId.');
  }

  process.exit(0);
}

diagnose().catch(err => {
  console.error('Unhandled diagnosis error:', err);
  process.exit(1);
});
