const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Section = require('../models/Section');
const Class = require('../models/Class');
const Institution = require('../models/Institution');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function createDefaultSections() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Find admissions with missing section
    const missingSectionAdmissions = await Admission.find({
      academicYear: '2026-2027',
      $or: [{ section: { $exists: false } }, { section: null }]
    });

    console.log(`Found ${missingSectionAdmissions.length} admissions still missing section.`);
    
    // Group by class
    const classGroups = {};
    for (const admission of missingSectionAdmissions) {
       if (!admission.class) continue;
       const classId = admission.class.toString();
       if (!classGroups[classId]) classGroups[classId] = [];
       classGroups[classId].push(admission);
    }
    
    console.log(`\nProcessing ${Object.keys(classGroups).length} unique classes...`);

    let sectionsCreated = 0;
    let admissionsUpdated = 0;
    
    for (const classId of Object.keys(classGroups)) {
       // Check if class exists
       const classDoc = await Class.findById(classId);
       if (!classDoc) {
         console.log(`Class ${classId} not found. Skipping.`);
         continue;
       }
       
       // Check if ANY section exists
       let section = await Section.findOne({ class: classId });
       
       if (!section) {
         // Create default 'Section A'
         console.log(`Creating default 'Section A' for Class '${classDoc.name}'...`);
         section = await Section.create({
            name: 'Section A',
            code: 'SEC-A-' + classDoc.code, // Unique-ish
            class: classId,
            institution: classDoc.institution,
            capacity: 50,
            createdBy: classDoc.createdBy // Inherit or undefined
         });
         sectionsCreated++;
       }
       
       // Assign all admissions in this group to this section
       const admissionIds = classGroups[classId].map(a => a._id);
       const result = await Admission.updateMany(
         { _id: { $in: admissionIds } },
         { $set: { section: section._id } }
       );
       
       admissionsUpdated += result.modifiedCount;
    }

    console.log(`\nSummary:`);
    console.log(`Default Sections Created: ${sectionsCreated}`);
    console.log(`Admissions Linked: ${admissionsUpdated}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createDefaultSections();
