export const ROLES = Object.freeze([
  'student', 'event_coordinator', 'class_incharge',
  'department_coordinator', 'director', 'deo', 'admin'
]);

export const DEPARTMENTS = Object.freeze([
  'CSE', 'ACSE', 'DS', 'CS', 'ECE', 'PHARMACY', 'MBA', 'BBA', 'BCA'
]);

export const REQUEST_STATUSES = Object.freeze([
  'awaiting_certificate', 'pending_class_incharge',
  'pending_department_coordinator', 'pending_director',
  'returned_for_correction', 'rejected', 'pending_deo', 'attendance_recorded'
]);

export const ROLE_FOR_STAGE = Object.freeze({
  pending_class_incharge: 'class_incharge',
  pending_department_coordinator: 'department_coordinator',
  pending_director: 'director',
  pending_deo: 'deo'
});

export const REVIEW_STAGES = Object.freeze([
  'class_incharge', 'department_coordinator', 'director'
]);
