import { Router } from 'express';
import { createReport, listReports, resolveReport } from '../controllers/report.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, createReport);
router.get('/', requireAuth, requireAdmin, listReports);
router.patch('/:id', requireAuth, requireAdmin, resolveReport);

export default router;
