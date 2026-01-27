require('dotenv').config();
const mongoose = require('mongoose');
const Class = require('./models/Class');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const classes = await Class.find({name: {$in: ['Play Group', 'Cor.Mon', 'One']}}).populate('institution');
  console.log('Classes and their institutions:');
  classes.forEach(c => {
    console.log(`  ${c.name} -> ${c.institution ? c.institution.name : 'NO INSTITUTION'}`);
  });
  process.exit();
});
