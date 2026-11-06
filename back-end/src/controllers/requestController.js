import fs from 'node:fs/promises';
import path from 'node:path';
import ODRequest from '../models/ODRequest.js';
import Event from '../models/Event.js';
import { HttpError } from '../utils/httpError.js';
import { uploadRoot } from '../middleware/upload.js';
import { createOutsideRequest, decideRequest, editReturnedRequest, getRequestForUser, recordAttendance, uploadRequestFile, visibleRequestFilter, workflowSummary } from '../services/workflowService.js';

function safeRequest(request) {
  const result = request.toObject ? request.toObject() : { ...request };
  if (result.files) result.files = result.files.map(({ _id, kind, originalName, mimeType, size, uploadedBy, uploadedAt }) => ({ _id, kind, originalName, mimeType, size, uploadedBy, uploadedAt }));
  return result;
}

function eventCoordinatorView(request) {
  const result = safeRequest(request);
  delete result.files;
  delete result.missedSessions;
  result.decisions = (result.decisions || []).map(({ stage, action, at }) => ({ stage, action, at }));
  result.history = (result.history || []).map(({ actor, action, fromStatus, toStatus, at }) => ({ actor, action, fromStatus, toStatus, at }));
  return result;
}

export async function createOutside(req, res) {
  const body = parseJsonField(req.body.request, req.body);
  const request = await createOutsideRequest({ ...body, registrationProof: req.file }, req.user);
  res.status(201).json({ data: { request: safeRequest(request) } });
}

function parseJsonField(field, fallback) {
  if (!field) return fallback;
  try { return JSON.parse(field); } catch { throw new HttpError(400, 'Request form data must be valid JSON.'); }
}

export async function listRequests(req, res) {
  const filter = visibleRequestFilter(req.user);
  if (req.user.role === 'event_coordinator') {
    const events = await Event.find({ createdBy: req.user._id }).select('_id');
    filter.event = { $in: events.map(event => event._id) };
  }
  if (req.user.role !== 'student' && req.user.role !== 'deo' && req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.department && ['admin', 'deo', 'director'].includes(req.user.role)) filter.department = req.query.department;
  if (['class_incharge', 'department_coordinator', 'director', 'deo'].includes(req.user.role)) {
    const queues = {
      class_incharge: ['pending_class_incharge'],
      department_coordinator: ['pending_department_coordinator'],
      director: ['pending_director'],
      deo: ['pending_deo']
    };
    if (req.query.queue === 'true') filter.status = { $in: queues[req.user.role] };
  }
  if (req.user.role === 'deo' && req.query.queue !== 'true') filter.status = { $in: ['pending_deo', 'attendance_recorded'] };
  const requests = await ODRequest.find(filter).populate('student', 'name studentId department classSection').sort({ createdAt: -1 }).limit(300);
  const serialize = req.user.role === 'event_coordinator' ? eventCoordinatorView : safeRequest;
  res.json({ data: { requests: requests.map(serialize), workflow: requests.map(request => ({ requestId: request._id, ...workflowSummary(request) })) } });
}

export async function getRequest(req, res) {
  const request = await getRequestForUser(req.params.id, req.user);
  if (req.user.role === 'event_coordinator') {
    const limited = eventCoordinatorView(request);
    res.json({ data: { request: limited, workflow: workflowSummary(request) } });
    return;
  }
  res.json({ data: { request: safeRequest(request), workflow: workflowSummary(request) } });
}

export async function updateReturned(req, res) {
  const body = parseJsonField(req.body.request, req.body);
  const request = await editReturnedRequest(req.params.id, req.user, { ...body, registrationProof: req.file });
  res.json({ data: { request: safeRequest(request) } });
}

export async function review(req, res) {
  const request = await decideRequest(req.params.id, req.user, req.body.action, req.body.comment);
  res.json({ data: { request: safeRequest(request) } });
}

export async function uploadFile(req, res) {
  let missedSessions;
  try { missedSessions = req.body.missedSessions ? JSON.parse(req.body.missedSessions) : undefined; }
  catch { throw new HttpError(400, 'missedSessions must be valid JSON.'); }
  const request = await uploadRequestFile(req.params.id, req.user, req.body.kind, req.file, { missedSessions });
  res.json({ data: { request: safeRequest(request) } });
}

export async function downloadFile(req, res) {
  if (req.user.role === 'event_coordinator') throw new HttpError(403, 'Event Coordinators cannot access private student evidence.');
  const request = await getRequestForUser(req.params.id, req.user);
  const file = request.files.id(req.params.fileId);
  if (!file) throw new HttpError(404, 'File not found.');
  const absolute = path.resolve(uploadRoot, file.storageName);
  if (!absolute.startsWith(`${uploadRoot}${path.sep}`)) throw new HttpError(400, 'Invalid file path.');
  try { await fs.access(absolute); } catch { throw new HttpError(404, 'File is no longer available.'); }
  res.type(file.mimeType).set('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`).sendFile(absolute);
}

export async function record(req, res) {
  const request = await recordAttendance(req.params.id, req.user, req.body.sessionIds, req.body.note);
  res.json({ data: { request: safeRequest(request) } });
}

export async function attendance(req, res) {
  const filter = { status: 'attendance_recorded' };
  if (req.user.role === 'student') filter.student = req.user._id;
  else if (req.user.role === 'deo') filter['attendance.recordedBy'] = req.user._id;
  else if (req.user.role === 'class_incharge') Object.assign(filter, { department: req.user.department, classSection: req.user.classSection });
  else if (req.user.role === 'department_coordinator' || (req.user.role === 'director' && req.user.department)) filter.department = req.user.department;
  const records = await ODRequest.find(filter).populate('student', 'name studentId department classSection').populate('attendance.recordedBy', 'name').sort({ 'attendance.recordedAt': -1 }).limit(500);
  res.json({ data: { attendance: records.map(r => ({ requestId: r._id, student: r.student, eventName: r.eventName, eventType: r.type, sessions: r.missedSessions.filter(s => r.attendance.sessions.some(id => String(id) === String(s._id))), recordedBy: r.attendance.recordedBy, recordedAt: r.attendance.recordedAt, note: r.attendance.note })) } });
}
