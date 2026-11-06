import { Router } from 'express';
import { createEvent, deleteEvent, eventRequests, getEvent, listEvents, register, updateEvent } from '../controllers/eventController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { allowRoles, authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listEvents));
router.post('/', allowRoles('event_coordinator', 'admin'), asyncHandler(createEvent));
router.get('/:id', asyncHandler(getEvent));
router.patch('/:id', allowRoles('event_coordinator', 'admin'), asyncHandler(updateEvent));
router.delete('/:id', allowRoles('event_coordinator', 'admin'), asyncHandler(deleteEvent));
router.post('/:id/register', allowRoles('student'), asyncHandler(register));
router.get('/:id/requests', allowRoles('event_coordinator', 'admin', 'deo'), asyncHandler(eventRequests));
export default router;
