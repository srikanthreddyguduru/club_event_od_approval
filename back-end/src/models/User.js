import mongoose from 'mongoose';
import { DEPARTMENTS, ROLES } from '../constants/workflow.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, required: true, default: 'student' },
  department: { type: String, enum: DEPARTMENTS, required: function () { return this.role !== 'admin'; } },
  classSection: { type: String, trim: true, maxlength: 40, required: function () { return this.role === 'class_incharge' || this.role === 'student'; } },
  studentId: { type: String, trim: true, sparse: true, unique: true },
  active: { type: Boolean, default: true }
}, { timestamps: true, optimisticConcurrency: true });

userSchema.index({ role: 1, department: 1, classSection: 1, active: 1 });
export default mongoose.model('User', userSchema);
