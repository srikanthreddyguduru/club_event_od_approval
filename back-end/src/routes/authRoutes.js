import { Router } from 'express';
import { createUser, listUsers, login, me, updateUser } from '../controllers/authController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { allowRoles, authenticate } from '../middleware/auth.js';

const router = Router();
router.post('/login', asyncHandler(login));
router.get('/me', authenticate, asyncHandler(me));
router.get('/users', authenticate, allowRoles('admin'), asyncHandler(listUsers));
router.post('/users', authenticate, allowRoles('admin'), asyncHandler(createUser));
router.patch('/users/:id', authenticate, allowRoles('admin'), asyncHandler(updateUser));
export default router;
