import { Router } from 'express';
import {
  listConversations,
  getConversationMessages,
  listPinnedMessages,
} from '../controllers/conversation.controller.js';
import { uploadAttachment } from '../controllers/attachment.controller.js';
import {
  createGroup,
  updateGroup,
  addMembers,
  removeMember,
  updateMemberRole,
} from '../controllers/group.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', requireAuth, listConversations);
router.post('/', requireAuth, createGroup);
router.patch('/:id', requireAuth, updateGroup);
router.get('/:id/messages', requireAuth, getConversationMessages);
router.get('/:id/pins', requireAuth, listPinnedMessages);
router.post('/:id/attachments', requireAuth, upload.single('file'), uploadAttachment);
router.post('/:id/members', requireAuth, addMembers);
router.delete('/:id/members/:userId', requireAuth, removeMember);
router.patch('/:id/members/:userId', requireAuth, updateMemberRole);

export default router;
