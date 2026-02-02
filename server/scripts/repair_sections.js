const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Section = require('../models/Section');
const Class = require('../models/Class');
const Institution = require('../models/Institution');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function autoAssignSections() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find admissions with missing section in 2026-2027
    const missingSectionAdmissions = await Admission.find({
      academicYear: '2026-2027',
      $or: [{ section: { $exists: false } }, { section: null }]
    });

    console.log(`Found ${missingSectionAdmissions.length} admissions with missing section.`);

    let fixedCount = 0;
    let ambiguousCount = 0;

    for (const admission of missingSectionAdmissions) {
      if (!admission.class) {
        console.log(`Skipping Admission ${admission._id} (No Class assigned)`);
        continue;
      }

      // Find sections for this class
      const sections = await Section.find({ class: admission.class });

      if (sections.length === 1) {
        // Unambiguous: Only one section exists, assign it!
        admission.section = sections[0]._id;
        await admission.save();
        fixedCount++;
        // console.log(`Assigned Section '${sections[0].name}' to Admission ${admission._id}`);
      } else if (sections.length > 1) {
        // Ambiguous: Check if there's a section named 'A' or 'Red' (common defaults)
        const defaultSection = sections.find(s => ['a', 'red', 'green', 'blue', 'one'].includes(s.name.toLowerCase()));
        
        if (defaultSection) {
             admission.section = defaultSection._id;
             await admission.save();
             fixedCount++;
             // console.log(`Assigned Default Section '${defaultSection.name}' to Admission ${admission._id}`);
        } else {
             ambiguousCount++;
             // console.log(`Ambiguous: Class has ${sections.length} sections (${sections.map(s=>s.name).join(', ')}). Skipping.`);
        }
      } else {
        console.log(`No sections found for Class ${admission.class}. Cannot assign.`);
      }
    }

    console.log(`\nSummary:`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Ambiguous/Skipped: ${ambiguousCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

autoAssignSections();
