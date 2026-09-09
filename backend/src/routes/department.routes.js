import { Router } from 'express';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public: the registration form needs the department list before a user has a token.
router.get('/', listDepartments);
router.post('/', requireAuth, requireAdmin, createDepartment);
router.put('/:id', requireAuth, requireAdmin, updateDepartment);
router.delete('/:id', requireAuth, requireAdmin, deleteDepartment);

export default router;
