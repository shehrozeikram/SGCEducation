const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Section = require('../models/Section');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function checkSectionLinks() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const total = await Admission.countDocuments({ academicYear: '2026-2027' });
  const missingSection = await Admission.countDocuments({ 
    academicYear: '2026-2027',
    $or: [{ section: { $exists: false } }, { section: null }]
  });

  console.log(`Total 2026-2027 Admissions: ${total}`);
  console.log(`Missing Section Link: ${missingSection}`);
  
  // Sample of missing
  if (missingSection > 0) {
     const sample = await Admission.findOne({ 
        academicYear: '2026-2027', 
        section: null 
     }).populate('class');
     console.log('Sample Missing Section Record:', sample ? {
       name: sample.personalInfo.name,
       class: sample.class ? sample.class.name : 'No Class',
       id: sample._id
     } : 'None');
  }

  await mongoose.disconnect();
}

checkSectionLinks();
