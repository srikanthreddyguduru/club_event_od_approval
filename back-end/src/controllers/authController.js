import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DEPARTMENTS, ROLES } from '../constants/workflow.js';
import User from '../models/User.js';
import { HttpError } from '../utils/httpError.js';

export async function login(req, res) {
  const email = String(req.body.email || '').toLowerCase().trim();
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.active || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) throw new HttpError(401, 'Email or password is incorrect.');
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h', issuer: 'club-event-od-api', audience: 'club-event-od-client' });
  res.json({ data: { token, user: publicUser(user) } });
}

export function me(req, res) { res.json({ data: { user: publicUser(req.user) } }); }

function publicUser(user) {
  const { _id, name, email, role, department, classSection, studentId } = user;
  return { id: _id, name, email, role, department, classSection, studentId };
}

export async function createUser(req, res) {
  const { name, email, password, role, department, classSection, studentId } = req.body;
  if (!name || !email || !password || !role) throw new HttpError(400, 'Name, email, password, and role are required.');
  if (!ROLES.includes(role)) throw new HttpError(400, 'Unsupported role.');
  if (role !== 'admin' && !DEPARTMENTS.includes(department)) throw new HttpError(400, 'A supported department is required for this role.');
  if (role === 'student' && !classSection) throw new HttpError(400, 'Student classSection is required.');
  if (role === 'class_incharge' && !classSection) throw new HttpError(400, 'Class In-charge classSection is required for reviewer assignment.');
  if (password.length < 10) throw new HttpError(400, 'Password must be at least 10 characters.');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, role, department, classSection, studentId });
  res.status(201).json({ data: { user: publicUser(user) } });
}

export async function listUsers(req, res) {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.classSection) filter.classSection = req.query.classSection;
  const users = await User.find(filter).select('-passwordHash').sort({ name: 1 }).limit(500);
  res.json({ data: { users } });
}

export async function updateUser(req, res) {
  const updates = {};
  for (const field of ['name', 'email', 'role', 'department', 'classSection', 'studentId', 'active']) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  if (req.body.password) {
    if (req.body.password.length < 10) throw new HttpError(400, 'Password must be at least 10 characters.');
    updates.passwordHash = await bcrypt.hash(req.body.password, 12);
  }
  if (updates.role && !ROLES.includes(updates.role)) throw new HttpError(400, 'Unsupported role.');
  if (updates.department && !DEPARTMENTS.includes(updates.department)) throw new HttpError(400, 'Unsupported department.');
  const user = await User.findById(req.params.id).select('+passwordHash');
  if (!user) throw new HttpError(404, 'User not found.');
  for (const [key, value] of Object.entries(updates)) user[key] = value;
  await user.save();
  res.json({ data: { user: publicUser(user) } });
}
