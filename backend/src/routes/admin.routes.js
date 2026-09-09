import { Router } from 'express';
import { listAllUsers, updateUser, getStats } from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/users', listAllUsers);
router.patch('/users/:id', updateUser);
router.get('/stats', getStats);

export default router;
