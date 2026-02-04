const mongoose = require('mongoose');

async function checkDataSources() {
  try {
    await mongoose.connect('mongodb://localhost:27017/school_management');
    console.log('Connected to database');

    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n=== Available Collections ===');
    collections.forEach(c => console.log(`- ${c.name}`));

    // Check StudentFee records
    const StudentFee = mongoose.model('StudentFee', new mongoose.Schema({}, { strict: false }));
    const totalStudentFees = await StudentFee.countDocuments();
    console.log(`\nTotal StudentFee records: ${totalStudentFees}`);

    if (totalStudentFees > 0) {
      const sampleFees = await StudentFee.find().limit(3).populate('student').lean();
      console.log('\n=== Sample StudentFee Records ===');
      sampleFees.forEach((fee, index) => {
        console.log(`\n${index + 1}. StudentFee ID: ${fee._id}`);
        console.log(`   student ref: ${fee.student?._id || fee.student || 'N/A'}`);
        console.log(`   student type: ${typeof fee.student}`);
        if (fee.student && typeof fee.student === 'object') {
          console.log(`   student.admission: ${fee.student.admission || 'N/A'}`);
        }
      });
    }

    // Check Student collection
    const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
    const totalStudents = await Student.countDocuments();
    console.log(`\nTotal Student records: ${totalStudents}`);

    if (totalStudents > 0) {
      const sampleStudents = await Student.find().limit(3).select('_id admission enrollmentNumber').lean();
      console.log('\n=== Sample Student Records ===');
      sampleStudents.forEach((student, index) => {
        console.log(`\n${index + 1}. Student ID: ${student._id}`);
        console.log(`   enrollmentNumber: ${student.enrollmentNumber || 'N/A'}`);
        console.log(`   admission ref: ${student.admission || 'N/A'}`);
      });
    }

    // Check Admission collection
    const Admission = mongoose.model('Admission', new mongoose.Schema({}, { strict: false }));
    const totalAdmissions = await Admission.countDocuments();
    console.log(`\nTotal Admission records: ${totalAdmissions}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDataSources();
