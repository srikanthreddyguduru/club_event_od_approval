import { HttpError } from '../utils/httpError.js';

export function notFound(req, res) {
  res.status(404).json({ error: { message: 'Route not found.' } });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message || 'Internal server error.';
  if (error.name === 'ValidationError') { status = 400; message = error.message; }
  if (error.name === 'CastError') { status = 400; message = 'Invalid identifier or value.'; }
  if (error.code === 11000) { status = 409; message = 'A record with that unique value already exists.'; }
  if (error.name === 'VersionError') { status = 409; message = 'This record changed while you were working. Refresh and try again.'; }
  if (error.name === 'MulterError') { status = 400; message = error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the upload limit.' : 'File could not be uploaded.'; }
  if (status >= 500) { console.error(error); message = 'Internal server error.'; }
  res.status(status).json({ error: { message, ...(error.details ? { details: error.details } : {}) } });
}
