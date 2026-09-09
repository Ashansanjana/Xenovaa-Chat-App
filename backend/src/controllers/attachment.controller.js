import { isConversationMember } from '../services/conversations.js';
import { validateFile, messageTypeForMime, uploadFileToBucket } from '../services/storage.js';
import { createAndBroadcastMessage, MessagingError } from '../services/messaging.js';
import { getIO } from '../sockets/registry.js';

export async function uploadAttachment(req, res) {
  try {
    const { id: conversationId } = req.params;
    const { replyToMessageId } = req.body;
    const senderId = req.user.id;

    const isMember = await isConversationMember(conversationId, senderId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' });
    }

    const validationError = validateFile(req.file);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const io = getIO();
    if (!io) {
      return res.status(503).json({ error: 'Real-time server is not available.' });
    }

    const path = await uploadFileToBucket({
      conversationId,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
    });

    const message = await createAndBroadcastMessage({
      io,
      conversationId,
      senderId,
      message: req.file.originalname,
      messageType: messageTypeForMime(req.file.mimetype),
      fileUrl: path,
      replyToMessageId: replyToMessageId || null,
    });

    return res.status(201).json({ message });
  } catch (err) {
    console.error('uploadAttachment error:', err.message);
    const message = err instanceof MessagingError ? err.message : 'Failed to upload attachment.';
    return res.status(err instanceof MessagingError ? 403 : 500).json({ error: message });
  }
}
