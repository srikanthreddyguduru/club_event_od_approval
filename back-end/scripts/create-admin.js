import 'dotenv/config';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';

const rl = readline.createInterface({ input, output });
try {
  await connectDB();
  const name = await rl.question('Admin name: ');
  const email = (await rl.question('Admin email: ')).trim().toLowerCase();
  const password = await rl.question('Admin password (min 10 characters): ');
  if (!name.trim() || !email.includes('@') || password.length < 10) throw new Error('Valid name/email and a 10-character password are required.');
  const exists = await User.exists({ role: 'admin' });
  if (exists) throw new Error('An admin account already exists. Add subsequent staff through the admin user API.');
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name: name.trim(), email, passwordHash, role: 'admin' });
  console.log('Admin account created.');
} finally {
  rl.close();
  await mongoose.connection.close();
}
