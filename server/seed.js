require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

(async () => {
  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    console.log('⏳ Checking if admin exists...');
    const existing = await Admin.findOne({ username: process.env.ADMIN_USERNAME });

    if (existing) {
      console.log(`ℹ️  Admin "${process.env.ADMIN_USERNAME}" already exists — skipping.`);
      console.log('💡 If you want to reset, delete it from MongoDB and run again.');
    } else {
      console.log('⏳ Creating admin user...');
      await Admin.create({
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD
      });
      console.log('✅ Admin created successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   Username: ${process.env.ADMIN_USERNAME}`);
      console.log(`   Password: ${process.env.ADMIN_PASSWORD}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔐 Login at: http://localhost:5000/admin.html');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error('\n💡 Common issues:');
    console.error('   1. MongoDB is not running');
    console.error('   2. MONGODB_URI in .env is wrong');
    console.error('   3. Admin.js model file missing in models/ folder\n');
    process.exit(1);
  }
})();