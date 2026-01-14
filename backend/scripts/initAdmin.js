import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sw-def');
    console.log('✅ Connected to MongoDB');

    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@swdef.com';
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('ℹ️  Super admin already exists:', adminEmail);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Super Admin',
      email: adminEmail,
      password: adminPassword,
      provider: 'email',
      role: 'admin'
    });

    console.log('✅ Super admin created successfully!');
    console.log('   Email:', admin.email);
    console.log('   Password:', adminPassword);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createSuperAdmin();
