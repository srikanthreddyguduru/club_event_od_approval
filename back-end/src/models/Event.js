import mongoose from 'mongoose';
import { DEPARTMENTS } from '../constants/workflow.js';

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 180 },
  hostCollege: { type: String, required: true, trim: true, maxlength: 180 },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  venue: { type: String, required: true, trim: true, maxlength: 250 },
  registrationDetails: { type: String, required: true, trim: true, maxlength: 2000 },
  registrationUrl: { type: String, trim: true, maxlength: 500 },
  category: { type: String, enum: ['Technology', 'Cultural', 'Engineering', 'Academic', 'Other'], default: 'Academic' },
  eligibleDepartments: [{ type: String, enum: DEPARTMENTS }],
  eligibleClasses: [{ type: String, trim: true }],
  eligibleStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  capacity: { type: Number, min: 1 },
  status: { type: String, enum: ['draft', 'published', 'cancelled', 'completed'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  registrations: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    registeredAt: { type: Date, default: Date.now },
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'ODRequest' }
  }]
}, { timestamps: true, optimisticConcurrency: true });

eventSchema.index({ status:  1, startAt: 1 });
eventSchema.index({ createdBy: 1, createdAt: -1 });
eventSchema.pre('validate', function (next) {
  if (this.startAt && this.endAt && this.endAt < this.startAt) this.invalidate('endAt', 'End date must be on or after the start date.');
  next();
});
export default mongoose.model('Event', eventSchema);
