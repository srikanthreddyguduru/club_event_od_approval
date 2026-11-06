import Event from '../models/Event.js';
import ODRequest from '../models/ODRequest.js';
import { HttpError } from '../utils/httpError.js';
import { registerForEvent } from '../services/workflowService.js';

export async function createEvent(req, res) {
  const allowed = ['name', 'hostCollege', 'startAt', 'endAt', 'venue', 'registrationDetails', 'registrationUrl', 'category', 'eligibleDepartments', 'eligibleClasses', 'eligibleStudentIds', 'capacity', 'status'];
  const input = Object.fromEntries(allowed.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
  const event = await Event.create({ ...input, createdBy: req.user._id });
  res.status(201).json({ data: { event } });
}

export async function listEvents(req, res) {
  const filter = {};
  if (req.user.role === 'student') filter.status = 'published';
  if (req.user.role === 'event_coordinator') filter.createdBy = req.user._id;
  if (!['student', 'event_coordinator', 'admin'].includes(req.user.role)) filter.status = 'published';
  if (req.query.status && ['event_coordinator', 'admin'].includes(req.user.role)) filter.status = req.query.status;
  if (req.query.department && req.user.role !== 'student') filter.eligibleDepartments = req.query.department;
  const events = await Event.find(filter).populate('createdBy', 'name').sort({ startAt: 1 }).limit(300);
  const visible = req.user.role === 'student' ? events.filter(e => eligible(e, req.user)) : events;
  const safeEvents = visible.map(event => {
    const item = event.toObject();
    item.registrationCount = event.registrations.length;
    const owns = ['admin', 'event_coordinator'].includes(req.user.role) &&
      (req.user.role === 'admin' || String(event.createdBy?._id || event.createdBy) === String(req.user._id));
    if (!owns) delete item.registrations;
    return item;
  });
  res.json({ data: { events: safeEvents } });
}

function eligible(event, user) {
  return (!event.eligibleDepartments.length || event.eligibleDepartments.includes(user.department))
    && (!event.eligibleClasses.length || event.eligibleClasses.includes(user.classSection))
    && (!event.eligibleStudentIds.length || event.eligibleStudentIds.some(id => String(id) === String(user._id)));
}

export async function getEvent(req, res) {
  const event = await Event.findById(req.params.id).populate('createdBy', 'name');
  if (!event) throw new HttpError(404, 'Event not found.');
  if (req.user.role === 'student' && (event.status !== 'published' || !eligible(event, req.user))) throw new HttpError(404, 'Event not found.');
  if (req.user.role === 'event_coordinator' && String(event.createdBy._id) !== String(req.user._id)) throw new HttpError(403, 'You do not manage this event.');
  const isOwner = req.user.role === 'admin' || String(event.createdBy._id) === String(req.user._id);
  if (!isOwner && event.status !== 'published') throw new HttpError(404, 'Event not found.');
  const registrationCount = event.registrations.length;
  if (isOwner) await event.populate('registrations.student', 'name studentId department classSection');
  const result = event.toObject();
  result.registrationCount = registrationCount;
  if (!isOwner) delete result.registrations;
  res.json({ data: { event: result } });
}

export async function updateEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, 'Event not found.');
  if (req.user.role !== 'admin' && String(event.createdBy) !== String(req.user._id)) throw new HttpError(403, 'You do not manage this event.');
  const allowed = ['name', 'hostCollege', 'startAt', 'endAt', 'venue', 'registrationDetails', 'registrationUrl', 'category', 'eligibleDepartments', 'eligibleClasses', 'eligibleStudentIds', 'capacity', 'status'];
  for (const key of allowed) if (req.body[key] !== undefined) event[key] = req.body[key];
  await event.save();
  res.json({ data: { event } });
}

export async function deleteEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, 'Event not found.');
  if (req.user.role !== 'admin' && String(event.createdBy) !== String(req.user._id)) throw new HttpError(403, 'You do not manage this event.');
  const linked = await ODRequest.exists({ event: event._id });
  if (linked) throw new HttpError(409, 'Events with student requests cannot be deleted. Cancel or complete the event instead.');
  await event.deleteOne();
  res.status(204).end();
}

export async function register(req, res) {
  const request = await registerForEvent(req.params.id, req.user);
  res.status(201).json({ data: { request } });
}

export async function eventRequests(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, 'Event not found.');
  if (req.user.role !== 'admin' && req.user.role !== 'deo' && String(event.createdBy) !== String(req.user._id)) throw new HttpError(403, 'You do not manage this event.');
  const filter = { event: event._id };
  if (req.user.role === 'deo') filter.status = { $in: ['pending_deo', 'attendance_recorded'] };
  const requests = await ODRequest.find(filter).populate('student', 'name studentId department classSection').sort({ createdAt: -1 });
  if (req.user.role === 'event_coordinator') {
    res.json({ data: { requests: requests.map(({ _id, student, type, status, createdAt, decisions, attendance }) => ({
      _id, student, type, status, createdAt,
      decisions: decisions.map(({ stage, action, at }) => ({ stage, action, at })),
      attendanceRecorded: !!attendance
    })) } });
    return;
  }
  res.json({ data: { requests } });
}
