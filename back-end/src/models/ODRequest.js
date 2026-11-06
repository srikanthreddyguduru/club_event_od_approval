import mongoose from 'mongoose';
import { REQUEST_STATUSES } from '../constants/workflow.js';

const sessionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  courseCode: { type: String, trim: true, maxlength: 30 },
  courseName: { type: String, trim: true, maxlength: 120 },
  period: { type: String, trim: true, maxlength: 30 },
  attendanceStatus: { type: String, enum: ['od', 'present', 'absent'], default: 'od' }
}, { _id: true });

const fileSchema = new mongoose.Schema({
  kind: { type: String, enum: ['registration_proof', 'certificate'], required: true },
  storageName: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const decisionSchema = new mongoose.Schema({
  stage: { type: String, enum: ['class_incharge', 'department_coordinator', 'director'], required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['approved', 'rejected', 'returned_for_correction'], required: true },
  comment: { type: String, trim: true, maxlength: 2000 },
  at: { type: Date, default: Date.now }
}, { _id: true });

const historySchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, maxlength: 80 },
  fromStatus: String,
  toStatus: String,
  message: { type: String, maxlength: 2000 },
  at: { type: Date, default: Date.now }
}, { _id: true });

const attendanceSchema = new mongoose.Schema({
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recordedAt: { type: Date, default: Date.now },
  sessions: [{ type: mongoose.Schema.Types.ObjectId }],
  note: { type: String, trim: true, maxlength: 1000 }
}, { _id: false });

const requestSchema = new mongoose.Schema({
  type: { type: String, enum: ['inter_college', 'outside_college'], required: true, immutable: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  department: { type: String, required: true, immutable: true },
  classSection: { type: String, immutable: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  eventName: { type: String, required: true, trim: true, maxlength: 180 },
  organizer: { type: String, trim: true, maxlength: 180 },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  venue: { type: String, required: true, trim: true, maxlength: 250 },
  isOnline: { type: Boolean, default: false },
  registrationUrl: { type: String, trim: true, maxlength: 500 },
  missedSessions: [sessionSchema],
  files: [fileSchema],
  decisions: [decisionSchema],
  status: { type: String, enum: REQUEST_STATUSES, required: true },
  correctionStage: { type: String, enum: ['class_incharge', 'department_coordinator'] },
  correctionInstructions: { type: String, trim: true, maxlength: 2000 },
  rejectedReason: { type: String, trim: true, maxlength: 2000 },
  attendance: attendanceSchema,
  history: [historySchema],
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true, optimisticConcurrency: true });

requestSchema.index({ student: 1, createdAt: -1 });
requestSchema.index({ status: 1, department: 1, classSection: 1, createdAt: 1 });
requestSchema.index({ event: 1, student: 1 }, { unique: true, partialFilterExpression: { event: { $exists: true } } });
requestSchema.pre('validate', function (next) {
  if (this.startAt && this.endAt && this.endAt < this.startAt) this.invalidate('endAt', 'End date must be on or after the start date.');
  next();
});
export default mongoose.model('ODRequest', requestSchema);
