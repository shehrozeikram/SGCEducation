const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './.env' });

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const BankAccount = require('./models/BankAccount');

const migrate = async () => {
  try {
    console.log('Starting migration...');
    const accounts = await BankAccount.find({});
    
    let migratedCount = 0;
    
    for (const account of accounts) {
      // Check if it has the old institution field (using the internal _doc object)
      const rawAccount = account._doc;
      if (rawAccount.institution && (!rawAccount.institutions || rawAccount.institutions.length === 0)) {
        await BankAccount.collection.updateOne(
          { _id: account._id },
          { 
            $set: { institutions: [rawAccount.institution] },
            $unset: { institution: "" } 
          }
        );
        migratedCount++;
        console.log(`Migrated account ${account._id}`);
      }
    }
    
    console.log(`Migration completed successfully! Migrated ${migratedCount} accounts.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
