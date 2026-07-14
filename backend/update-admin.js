require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function updateAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    let admin = await User.findOne({ role: 'admin' });
    
    if (admin) {
      console.log(`Found existing admin: ${admin.email}`);
      admin.email = process.env.ADMIN_EMAIL || 'supportjdkart@gmail.com';
      if (process.env.ADMIN_PASSWORD) {
        admin.password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      }
      // Also ensure they have the right loginProvider if they want to login via local password
      admin.loginProvider = 'local';
      
      await admin.save();
      console.log(`✅ Admin updated successfully! New Email: ${admin.email}`);
    } else {
      console.log('No admin found. Restart the server and the seeder will create one.');
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

updateAdmin();
