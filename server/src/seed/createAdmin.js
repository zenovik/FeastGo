import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

// Usage: npm run seed:admin -- admin@feastgo.app supersecret "Admin Name"
async function run() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run seed:admin -- <email> <password> [name]');
    process.exit(1);
  }

  await connectDB(process.env.MONGO_URI);

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    existing.role = 'admin';
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`[seed:admin] updated existing user "${email}" to admin`);
  } else {
    await User.create({
      name: name || 'Admin',
      email: email.toLowerCase(),
      phone: `+1${Date.now()}`.slice(0, 15),
      role: 'admin',
      passwordHash,
    });
    console.log(`[seed:admin] created new admin "${email}"`);
  }

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed:admin] failed', err);
  process.exit(1);
});
