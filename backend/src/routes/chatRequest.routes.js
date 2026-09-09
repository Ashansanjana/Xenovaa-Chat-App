import { Router } from 'express';
import {
  sendChatRequest,
  listIncomingRequests,
  listOutgoingRequests,
  listConnections,
  respondToRequest,
  cancelRequest,
} from '../controllers/chatRequest.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, sendChatRequest);
router.get('/incoming', requireAuth, listIncomingRequests);
router.get('/outgoing', requireAuth, listOutgoingRequests);
router.get('/connections', requireAuth, listConnections);
router.patch('/:id', requireAuth, respondToRequest);
router.delete('/:id', requireAuth, cancelRequest);

export default router;
