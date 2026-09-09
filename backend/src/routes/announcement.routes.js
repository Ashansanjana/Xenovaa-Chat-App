import { Router } from 'express';
import { createAnnouncement, listAnnouncements } from '../controllers/announcement.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, listAnnouncements);
router.post('/', requireAuth, requireAdmin, createAnnouncement);

export default router;
