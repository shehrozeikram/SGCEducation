const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const StudentFee = require('./server/models/StudentFee');
const FeeHead = require('./server/models/FeeHead');
const Student = require('./server/models/Student');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sgc_education');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const debugFees = async () => {
  await connectDB();

  try {
    // Find students with fees
    const studentsWithFees = await StudentFee.distinct('student');
    console.log(`Found ${studentsWithFees.length} students with fees.`);

    // Take first 3 students
    const targetStudents = studentsWithFees.slice(0, 3);

    for (const studentId of targetStudents) {
      const student = await Student.findById(studentId);
      console.log(`\n--- Student: ${student?.user?.name || studentId} ---`);

      const fees = await StudentFee.find({ student: studentId })
        .populate('feeHead', 'name frequencyType');

      fees.forEach(f => {
        console.log(`FeeID: ${f._id}`);
        console.log(`  Head: ${f.feeHead?.name} (${f.feeHead?.frequencyType})`);
        console.log(`  Amount: Final=${f.finalAmount}, Paid=${f.paidAmount}, Rem=${f.remainingAmount}`);
        console.log(`  Status: ${f.status}`);
        console.log(`  Vouchers: ${JSON.stringify(f.vouchers)}`);
        console.log(`  DueDate: ${f.dueDate}`);
        console.log('-----------------------------------');
      });
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

debugFees();
