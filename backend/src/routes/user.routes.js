import { Router } from 'express';
import { listUsers, getUserProfile } from '../controllers/user.controller.js';
import { blockUser, unblockUser } from '../controllers/block.controller.js';
import { updateAvatar, removeAvatar } from '../controllers/avatar.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', requireAuth, listUsers);
router.patch('/me/avatar', requireAuth, upload.single('file'), updateAvatar);
router.delete('/me/avatar', requireAuth, removeAvatar);
router.get('/:id', requireAuth, getUserProfile);
router.post('/:id/block', requireAuth, blockUser);
router.delete('/:id/block', requireAuth, unblockUser);

export default router;
