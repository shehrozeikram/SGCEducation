const mongoose = require('mongoose');
const Admission = require('../models/Admission');

async function checkAdmissionDates() {
  try {
    await mongoose.connect('mongodb://localhost:27017/school_management');
    console.log('Connected to database');

    // Get a sample of admissions to check what fields are populated
    const sampleAdmissions = await Admission.find()
      .limit(5)
      .select('admissionEffectiveDate admissionDate createdAt personalInfo.name applicationNumber')
      .lean();

    console.log('\n=== Sample Admissions ===');
    sampleAdmissions.forEach((adm, index) => {
      console.log(`\n${index + 1}. ${adm.personalInfo?.name || 'N/A'} (${adm.applicationNumber})`);
      console.log(`   admissionEffectiveDate: ${adm.admissionEffectiveDate || 'NOT SET'}`);
      console.log(`   admissionDate: ${adm.admissionDate || 'NOT SET'}`);
      console.log(`   createdAt: ${adm.createdAt || 'NOT SET'}`);
    });

    // Count how many have each field populated
    const total = await Admission.countDocuments();
    const withEffectiveDate = await Admission.countDocuments({ admissionEffectiveDate: { $exists: true, $ne: null } });
    const withAdmissionDate = await Admission.countDocuments({ admissionDate: { $exists: true, $ne: null } });

    console.log('\n=== Statistics ===');
    console.log(`Total admissions: ${total}`);
    console.log(`With admissionEffectiveDate: ${withEffectiveDate} (${Math.round(withEffectiveDate/total*100)}%)`);
    console.log(`With admissionDate: ${withAdmissionDate} (${Math.round(withAdmissionDate/total*100)}%)`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAdmissionDates();
