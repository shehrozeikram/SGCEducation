const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const BankAccount = require('./models/BankAccount');

const check = async () => {
  try {
    const accounts = await BankAccount.find({}).lean();
    console.log(JSON.stringify(accounts, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

check();
