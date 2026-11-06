import mongoose from 'mongoose';
import Event from '../models/Event.js';
import ODRequest from '../models/ODRequest.js';
import User from '../models/User.js';
import { REVIEW_STAGES } from '../constants/workflow.js';
import { HttpError } from '../utils/httpError.js';

const fileMeta = (file, kind, userId) => ({
  kind, storageName: file.filename, originalName: file.originalname,
  mimeType: file.mimetype, size: file.size, uploadedBy: userId
});
const idOf = (value) => String(value?._id ?? value);

function addHistory(doc, actor, action, fromStatus, toStatus, message) {
  doc.history.push({ actor: actor._id, action, fromStatus, toStatus, message, at: new Date() });
}

async function reviewerFor(request, stage) {
  const filter = { role: stage, department: request.department, active: true };
  if (stage === 'class_incharge') filter.classSection = request.classSection;
  return User.findOne(filter).select('_id');
}

async function canViewRequest(user, request) {
  if (user.role === 'admin') return true;
  if (user.role === 'deo') return ['pending_deo', 'attendance_recorded'].includes(request.status);
  if (user.role === 'director') return user.department === request.department;
  if (user.role === 'student') return idOf(request.student) === idOf(user._id);
  if (user.role === 'event_coordinator') {
    if (request.type !== 'inter_college') return false;
    const event = await Event.findById(request.event).select('createdBy');
    return !!event && idOf(event.createdBy) === idOf(user._id);
  }
  if (user.role === 'class_incharge') return request.department === user.department && request.classSection === user.classSection;
  if (user.role === 'department_coordinator') return request.department === user.department;
  return false;
}

export async function registerForEvent(eventId, student) {
  const event = await Event.findById(eventId);
  if (!event || event.status !== 'published') throw new HttpError(404, 'Published event not found.');
  const eligible = (!event.eligibleDepartments.length || event.eligibleDepartments.includes(student.department))
    && (!event.eligibleClasses.length || event.eligibleClasses.includes(student.classSection))
    && (!event.eligibleStudentIds.length || event.eligibleStudentIds.some(id => String(id) === String(student._id)));
  if (!eligible) throw new HttpError(403, 'You are not eligible for this event.');
  if (event.registrations.some(r => String(r.student) === String(student._id))) throw new HttpError(409, 'You are already registered.');
  if (event.capacity && event.registrations.length >= event.capacity) throw new HttpError(409, 'This event has reached capacity.');
  const request = await ODRequest.create({
    type: 'inter_college', student: student._id, department: student.department,
    classSection: student.classSection, event: event._id, eventName: event.name,
    organizer: event.hostCollege, startAt: event.startAt, endAt: event.endAt,
    venue: event.venue, registrationUrl: event.registrationUrl,
    status: 'awaiting_certificate', history: [{ actor: student._id, action: 'registered_for_event', toStatus: 'awaiting_certificate', at: new Date() }]
  });
  event.registrations.push({ student: student._id, request: request._id });
  try { await event.save(); } catch (error) { await request.deleteOne(); throw error; }
  return request;
}

export async function createOutsideRequest(input, student) {
  if (!input.registrationProof) throw new HttpError(400, 'Registration proof is required.');
  if (!input.missedSessions?.length) throw new HttpError(400, 'Add at least one class session expected to be missed.');
  const proof = input.registrationProof;
  const request = new ODRequest({
    type: 'outside_college', student: student._id, department: student.department,
    classSection: student.classSection, eventName: input.eventName, organizer: input.organizer,
    startAt: input.startAt, endAt: input.endAt, venue: input.venue, isOnline: !!input.isOnline,
    registrationUrl: input.registrationUrl, missedSessions: input.missedSessions || [],
    files: [fileMeta(proof, 'registration_proof', student._id)], status: 'pending_class_incharge'
  });
  addHistory(request, student, 'submitted', null, 'pending_class_incharge');
  await request.save();
  return request;
}

export async function decideRequest(id, actor, action, comment) {
  const request = await ODRequest.findById(id);
  if (!request) throw new HttpError(404, 'OD request not found.');
  if (!await canViewRequest(actor, request)) throw new HttpError(403, 'You cannot access this request.');
  const stage = actor.role;
  if (!REVIEW_STAGES.includes(stage)) throw new HttpError(403, 'This role cannot review requests.');
  const expectedStatus = `pending_${stage}`;
  if (request.status !== expectedStatus) throw new HttpError(409, 'This request is not waiting for your review.');
  if (action === 'returned_for_correction' && request.type !== 'outside_college') throw new HttpError(400, 'Return for correction is available only for outside-college requests.');
  if (!['approved', 'rejected', 'returned_for_correction'].includes(action)) throw new HttpError(400, 'Invalid review action.');
  if (action !== 'approved' && !comment?.trim()) throw new HttpError(400, 'A reason or correction instruction is required.');
  const assignedReviewer = await reviewerFor(request, stage);
  if (stage === 'class_incharge' || stage === 'department_coordinator') {
    if (!assignedReviewer || String(assignedReviewer._id) !== String(actor._id)) throw new HttpError(403, 'You are not the assigned reviewer for this request.');
  } else if (actor.role === 'director' && actor.department && actor.department !== request.department) {
    throw new HttpError(403, 'You can review requests only for your department.');
  }
  const from = request.status;
  request.decisions.push({ stage, reviewer: actor._id, action, comment: comment?.trim(), at: new Date() });
  if (action === 'rejected') {
    request.status = 'rejected'; request.rejectedReason = comment.trim(); request.correctionInstructions = undefined;
  } else if (action === 'returned_for_correction') {
    request.status = 'returned_for_correction'; request.correctionStage = stage;
    request.correctionInstructions = comment.trim(); request.rejectedReason = undefined;
  } else {
    request.correctionInstructions = undefined; request.rejectedReason = undefined;
    const next = stage === 'class_incharge' ? 'pending_department_coordinator'
      : stage === 'department_coordinator' ? (request.type === 'outside_college' ? 'awaiting_certificate' : 'pending_director')
      : 'pending_deo';
    request.status = next;
  }
  addHistory(request, actor, action, from, request.status, comment?.trim());
  await request.save();
  return request;
}

export async function uploadRequestFile(id, actor, kind, file, input = {}) {
  if (!file) throw new HttpError(400, 'Attach a PDF, JPG, PNG, or WEBP file.');
  const request = await ODRequest.findById(id);
  if (!request) throw new HttpError(404, 'OD request not found.');
  if (actor.role !== 'student' || String(request.student) !== String(actor._id)) throw new HttpError(403, 'Only the request owner can upload evidence.');
  const from = request.status;
  if (kind === 'certificate') {
    if (!['inter_college', 'outside_college'].includes(request.type)) throw new HttpError(400, 'Invalid request type.');
    if (request.type === 'outside_college' && request.status !== 'awaiting_certificate') throw new HttpError(409, 'The outside-college certificate is accepted after the initial approvals.');
    if (request.type === 'inter_college' && request.status !== 'awaiting_certificate') throw new HttpError(409, 'Certificate upload is not available at this stage.');
    const sessions = input.missedSessions || request.missedSessions;
    if (!sessions.length) throw new HttpError(400, 'Add at least one class session that should receive OD attendance.');
    request.files.push(fileMeta(file, 'certificate', actor._id));
    request.status = request.type === 'outside_college' ? 'pending_director' : 'pending_class_incharge';
    request.missedSessions = sessions;
  } else if (kind === 'registration_proof') {
    if (request.type !== 'outside_college' || request.status !== 'returned_for_correction' || request.correctionStage !== 'class_incharge') throw new HttpError(409, 'Registration proof can be replaced only when requested by the Class In-charge.');
    request.files.push(fileMeta(file, kind, actor._id));
  } else throw new HttpError(400, 'Unsupported document type.');
  addHistory(request, actor, `uploaded_${kind}`, from, request.status, file.originalname);
  await request.save();
  return request;
}

export async function editReturnedRequest(id, actor, input) {
  const request = await ODRequest.findById(id);
  if (!request) throw new HttpError(404, 'OD request not found.');
  if (actor.role !== 'student' || String(request.student) !== String(actor._id)) throw new HttpError(403, 'Only the request owner can edit this request.');
  if (request.status !== 'returned_for_correction') throw new HttpError(409, 'Only returned requests can be edited.');
  const from = request.status;
  const stage = request.correctionStage;
  for (const key of ['eventName', 'organizer', 'startAt', 'endAt', 'venue', 'isOnline', 'registrationUrl', 'missedSessions']) {
    if (input[key] !== undefined) request[key] = input[key];
  }
  if (stage === 'class_incharge') {
    if (input.registrationProof) request.files.push(fileMeta(input.registrationProof, 'registration_proof', actor._id));
    if (!request.files.some(f => f.kind === 'registration_proof')) throw new HttpError(400, 'Registration proof is required.');
  }
  request.status = stage === 'class_incharge' ? 'pending_class_incharge' : 'pending_department_coordinator';
  request.correctionStage = undefined; request.correctionInstructions = undefined;
  addHistory(request, actor, 'resubmitted', from, request.status);
  await request.save();
  return request;
}

export async function recordAttendance(id, actor, sessionIds, note) {
  const request = await ODRequest.findById(id);
  if (!request) throw new HttpError(404, 'OD request not found.');
  if (actor.role !== 'deo') throw new HttpError(403, 'Only a DEO can record attendance.');
  if (request.status !== 'pending_deo') throw new HttpError(409, 'Attendance is not eligible for recording yet.');
  if (!sessionIds?.length) throw new HttpError(400, 'Select at least one approved session to mark.');
  const validIds = request.missedSessions.map(s => String(s._id));
  if (new Set(sessionIds.map(String)).size !== sessionIds.length) throw new HttpError(400, 'Do not select the same session more than once.');
  if (sessionIds.some(s => !validIds.includes(String(s)))) throw new HttpError(400, 'One or more sessions do not belong to this request.');
  request.attendance = { recordedBy: actor._id, recordedAt: new Date(), sessions: sessionIds, note };
  request.status = 'attendance_recorded';
  addHistory(request, actor, 'attendance_recorded', 'pending_deo', request.status, note);
  await request.save();
  return request;
}

export async function getRequestForUser(id, user) {
  const request = await ODRequest.findById(id)
    .populate('student', 'name email studentId department classSection')
    .populate('decisions.reviewer', 'name role department')
    .populate('history.actor', 'name role')
    .populate('attendance.recordedBy', 'name role');
  if (!request) throw new HttpError(404, 'OD request not found.');
  if (!await canViewRequest(user, request)) throw new HttpError(403, 'You cannot access this request.');
  return request;
}

export function visibleRequestFilter(user) {
  if (user.role === 'student') return { student: user._id };
  if (user.role === 'class_incharge') return { department: user.department, classSection: user.classSection };
  if (user.role === 'department_coordinator' || (user.role === 'director' && user.department)) return { department: user.department };
  if (user.role === 'event_coordinator') return { type: 'inter_college' };
  if (user.role === 'deo') return { status: { $in: ['pending_deo', 'attendance_recorded'] } };
  if (['director', 'admin'].includes(user.role)) return {};
  return { _id: new mongoose.Types.ObjectId('000000000000000000000000') };
}

export function workflowSummary(request) {
  const states = {
    awaiting_certificate: { reviewerRole: 'student', nextAction: 'Upload the event certificate and select the sessions to mark as OD.' },
    pending_class_incharge: { reviewerRole: 'class_incharge', nextAction: 'Class In-charge review is required.' },
    pending_department_coordinator: { reviewerRole: 'department_coordinator', nextAction: 'Department Coordinator review is required.' },
    pending_director: { reviewerRole: 'director', nextAction: 'Director review is required.' },
    returned_for_correction: { reviewerRole: 'student', nextAction: request.correctionInstructions || 'Update the request and resubmit it.' },
    rejected: { reviewerRole: null, nextAction: 'Request rejected: ' + (request.rejectedReason || 'see review history.') },
    pending_deo: { reviewerRole: 'deo', nextAction: 'DEO must record attendance for the approved sessions.' },
    attendance_recorded: { reviewerRole: null, nextAction: 'Attendance has been recorded.' }
  };
  return { status: request.status, currentReviewerRole: states[request.status]?.reviewerRole ?? null, nextAction: states[request.status]?.nextAction ?? null };
}
