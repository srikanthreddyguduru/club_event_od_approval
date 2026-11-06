import { Router } from 'express';
import { attendance, createOutside, downloadFile, getRequest, listRequests, record, review, updateReturned, uploadFile } from '../controllers/requestController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { allowRoles, authenticate } from '../middleware/auth.js';
import { uploadEvidence } from '../middleware/upload.js';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listRequests));
router.post('/outside', allowRoles('student'), uploadEvidence, asyncHandler(createOutside));
router.get('/attendance', allowRoles('student', 'class_incharge', 'department_coordinator', 'director', 'deo', 'admin'), asyncHandler(attendance));
router.get('/:id', asyncHandler(getRequest));
router.patch('/:id', allowRoles('student'), uploadEvidence, asyncHandler(updateReturned));
router.post('/:id/reviews', allowRoles('class_incharge', 'department_coordinator', 'director'), asyncHandler(review));
router.post('/:id/files', allowRoles('student'), uploadEvidence, asyncHandler(uploadFile));
router.get('/:id/files/:fileId', asyncHandler(downloadFile));
router.post('/:id/attendance', allowRoles('deo'), asyncHandler(record));
export default router;
