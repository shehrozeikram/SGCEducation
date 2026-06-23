const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/sgc-education');
  console.log('Connected to DB');

  const Admission = require('./server/models/Admission');
  const Student = require('./server/models/Student');

  const enrolledAdmissions = await Admission.find({status: 'enrolled'});
  console.log('Enrolled admissions:', enrolledAdmissions.length);

  const admissionsWithStudentId = enrolledAdmissions.filter(a => a.studentId);
  console.log('Enrolled admissions with studentId:', admissionsWithStudentId.length);

  const activeStudents = await Student.find({isActive: true});
  console.log('Active students:', activeStudents.length);

  const inactiveStudents = await Student.find({isActive: false});
  console.log('Inactive students:', inactiveStudents.length);

  const allStudents = await Student.countDocuments();
  console.log('All students:', allStudents);

  const activeEnrolledStudents = await Student.find({ isActive: true, admission: { $in: admissionsWithStudentId.map(a => a._id) } });
  console.log('Active students linked to enrolled admissions:', activeEnrolledStudents.length);
  
  process.exit(0);
}

test().catch(console.error);
