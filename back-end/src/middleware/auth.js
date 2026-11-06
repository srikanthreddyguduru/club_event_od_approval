import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { HttpError } from '../utils/httpError.js';

export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7) : null;
    if (!token) throw new HttpError(401, 'Authentication required.');
    const claims = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'club-event-od-api', audience: 'club-event-od-client' });
    const user = await User.findById(claims.sub);
    if (!user || !user.active) throw new HttpError(401, 'Account is unavailable.');
    req.user = user;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Invalid or expired session.'));
  }
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission for this action.'));
  next();
};
