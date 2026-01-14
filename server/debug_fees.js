const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const StudentFee = require('./models/StudentFee');
const FeeHead = require('./models/FeeHead');
const Student = require('./models/Student');
const Institution = require('./models/Institution');
const FeeStructure = require('./models/FeeStructure');
const Class = require('./models/Class');
const Section = require('./models/Section');
const Admission = require('./models/Admission');
const User = require('./models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sgceducation');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const debugFees = async () => {
  await connectDB();

  try {
    // Check for duplicates
    console.log('Scanning for duplicates...');
    
    // Aggregate to find duplicates: group by student and feeHead
    // Only where count > 1
    // frequenceType 'Monthly Fee/Annual Fee'
    
    const students = await Student.find({}, '_id user');
    
    for (const student of students) {
      const fees = await StudentFee.find({ student: student._id, isActive: true })
        .populate('feeHead', 'name frequencyType');

      // Group by feeHead name/id
      const headMap = {};
      fees.forEach(f => {
         const key = f.feeHead?._id.toString();
         if (!key) return;
         if (!headMap[key]) headMap[key] = [];
         headMap[key].push(f);
      });
      
      for (const [headId, feeList] of Object.entries(headMap)) {
         if (feeList.length > 1) {
            const headName = feeList[0].feeHead?.name;
            const freq = feeList[0].feeHead?.frequencyType;
            if (freq === 'Monthly Fee/Annual Fee') {
               const msg = `\nDuplicate found for User: ${student.user?.name || student._id}\n` +
                           `Head: ${headName} (${freq}) - Count: ${feeList.length}\n` +
                           feeList.map((f, idx) => 
                              `  [${idx}] ID: ${f._id} | Final: ${f.finalAmount} | Paid: ${f.paidAmount} | Status: ${f.status} | Vouchers: ${f.vouchers.length}\n` +
                              f.vouchers.map(v => `      V: ${v.month}/${v.year} No: ${v.voucherNumber}`).join('\n')
                           ).join('\n') + '\n';
                           
               console.log(msg);
               require('fs').appendFileSync('report.txt', msg);
            }
         }
      }
    }
    console.log('Scan complete.');

  } catch (err) {
    console.error(err);
    require('fs').writeFileSync('debug_error.log', err.stack);
  } finally {
    await mongoose.disconnect();
  }
};

debugFees();
