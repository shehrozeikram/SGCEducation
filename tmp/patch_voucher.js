const fs = require('fs');
const file = 'c:/laragon/www/SGCEducation/server/services/fee.service.js';
let content = fs.readFileSync(file, 'utf8');

// Normalize line endings for matching
const normalized = content.replace(/\r\n/g, '\n');

// From JSON output, exact indentation:
// "                // Use the parsed due date object\n                feeToUpdate = new StudentFee({\n                  institution:" etc.
// That's 16 spaces before "// Use..." and before "feeToUpdate", 18 spaces before fields, 16 spaces before "});"

const oldBlock = `                // Use the parsed due date object\n                feeToUpdate = new StudentFee({\n                  institution: latestFee.institution,\n                  student: latestFee.student,\n                  feeStructure: latestFee.feeStructure,\n                  class: latestFee.class,\n                  feeHead: latestFee.feeHead,\n                  baseAmount: latestFee.baseAmount,\n                  discountAmount: latestFee.discountAmount,\n                  discountType: latestFee.discountType,\n                  discountReason: latestFee.discountReason,\n                  finalAmount: latestFee.finalAmount,\n                  paidAmount: 0,\n                  remainingAmount: latestFee.finalAmount,\n                  status: 'pending',\n                  dueDate: dueDateObj,\n                  academicYear: latestFee.academicYear,\n                  isActive: true,\n                  createdBy: currentUser._id,\n                  vouchers: []\n                });`;

if (!normalized.includes(oldBlock)) {
  console.log('STILL NOT FOUND');
  const idx = normalized.indexOf('baseAmount: latestFee.baseAmount');
  console.log('Raw segment JSON:', JSON.stringify(normalized.substring(idx - 250, idx + 700)));
  process.exit(1);
}

const newBlock = `                // IMPORTANT: Use finalAmount as the new baseAmount for the cloned record.\n                // When a fee increase is applied via updateFeeStructure (discountOperation='increase'),\n                // the student's effective fee is stored in finalAmount, NOT baseAmount (which retains\n                // the original class-level fee from the global FeeStructure).\n                // Copying baseAmount here would revert the increase on every voucher clone cycle.\n                var effectiveBaseAmount = latestFee.finalAmount;\n                // Use the parsed due date object\n                feeToUpdate = new StudentFee({\n                  institution: latestFee.institution,\n                  student: latestFee.student,\n                  feeStructure: latestFee.feeStructure,\n                  class: latestFee.class,\n                  feeHead: latestFee.feeHead,\n                  baseAmount: effectiveBaseAmount,\n                  discountAmount: 0,\n                  discountType: 'amount',\n                  discountOperation: 'decrease',\n                  discountReason: latestFee.discountReason,\n                  finalAmount: effectiveBaseAmount,\n                  paidAmount: 0,\n                  remainingAmount: effectiveBaseAmount,\n                  status: 'pending',\n                  dueDate: dueDateObj,\n                  academicYear: latestFee.academicYear,\n                  isActive: true,\n                  createdBy: currentUser._id,\n                  vouchers: []\n                });`;

const patched = normalized.replace(oldBlock, newBlock);
fs.writeFileSync(file, patched.replace(/\n/g, '\r\n'), 'utf8');
console.log('SUCCESS: fee.service.js patched correctly');
