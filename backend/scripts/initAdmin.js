import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

import sequelize from '../config/database.js';
import '../models/index.js';
import User from '../models/User.js';

const createSuperAdmin = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Connected to database');

    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@swdef.com';
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await User.findOne({ where: { email: adminEmail } });

    if (existingAdmin) {
      existingAdmin.role = 'admin';
      existingAdmin.password = adminPassword;
      await existingAdmin.save();
      console.log('Super admin updated successfully!');
      console.log('   Email:', existingAdmin.email);
      console.log('   Role:', existingAdmin.role);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Super Admin',
      email: adminEmail,
      password: adminPassword,
      provider: 'email',
      role: 'admin'
    });

    console.log('Super admin created successfully!');
    console.log('   Email:', admin.email);
    console.log('   Password:', adminPassword);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createSuperAdmin();
