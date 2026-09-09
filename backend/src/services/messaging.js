import { supabase } from '../config/supabaseClient.js';
import { getConversationMemberIds } from './conversations.js';
import { isUserOnline } from './presence.js';
import { getSignedFileUrl } from './storage.js';
import { isBlockedEitherWay } from './blocking.js';
import { emitToUser } from '../sockets/registry.js';
import { createNotification } from '../controllers/notification.controller.js';

const MESSAGE_SELECT = `id, conversation_id, sender_id, message, message_type, file_url, reply_to_message_id, created_at,
  sender:sender_id (id, name, profile_image),
  reply_to:reply_to_message_id (id, message, message_type, sender:sender_id (id, name))`;

// Thrown for expected, user-facing failures (blocked, invalid reply, etc.) so
// callers can surface the message instead of a generic "failed to send".
export class MessagingError extends Error {}

function conversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

// Shared by the socket text-message path and the REST file-upload endpoint so
// both get identical delivery-status, notification, and broadcast behavior.
export async function createAndBroadcastMessage({
  io,
  conversationId,
  senderId,
  message = null,
  messageType = 'text',
  fileUrl = null,
  replyToMessageId = null,
}) {
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('is_group')
    .eq('id', conversationId)
    .maybeSingle();
  if (conversationError) throw conversationError;
  if (!conversation) throw new MessagingError('Conversation not found.');

  const otherMemberIds = await getConversationMemberIds(conversationId, { excludeUserId: senderId });

  // Blocking only gates direct messages — it doesn't remove either party from a
  // shared group, so group messages still flow per the doc's membership rule.
  if (!conversation.is_group && otherMemberIds.length === 1) {
    if (await isBlockedEitherWay(senderId, otherMemberIds[0])) {
      throw new MessagingError('You cannot message this user.');
    }
  }

  if (replyToMessageId) {
    const { data: parent, error: parentError } = await supabase
      .from('messages')
      .select('id')
      .eq('id', replyToMessageId)
      .eq('conversation_id', conversationId)
      .maybeSingle();
    if (parentError) throw parentError;
    if (!parent) throw new MessagingError('Cannot reply to a message outside this conversation.');
  }

  const { data: inserted, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      message,
      message_type: messageType,
      file_url: fileUrl,
      reply_to_message_id: replyToMessageId,
    })
    .select(MESSAGE_SELECT)
    .single();
  if (error) throw error;

  const signedFileUrl = fileUrl ? await getSignedFileUrl(fileUrl) : null;

  const statusRows = otherMemberIds.map((memberId) => ({
    message_id: inserted.id,
    user_id: memberId,
    status: isUserOnline(memberId) ? 'delivered' : 'sent',
  }));

  if (statusRows.length > 0) {
    const { error: statusError } = await supabase.from('message_status').insert(statusRows);
    if (statusError) throw statusError;
  }

  const payload = {
    ...inserted,
    file_url: signedFileUrl,
    is_deleted: false,
    is_pinned: false,
    statuses: statusRows.map(({ user_id, status }) => ({ userId: user_id, status })),
  };

  io.to(conversationRoom(conversationId)).emit('receive_message', payload);

  const room = io.sockets.adapter.rooms.get(conversationRoom(conversationId));
  const activeViewerIds = new Set();
  if (room) {
    for (const socketId of room) {
      const s = io.sockets.sockets.get(socketId);
      if (s?.userId) activeViewerIds.add(s.userId);
    }
  }

  for (const memberId of otherMemberIds) {
    if (activeViewerIds.has(memberId)) continue;

    if (isUserOnline(memberId)) {
      emitToUser(memberId, 'receive_message', payload);
    }

    await createNotification({ userId: memberId, type: 'new_message', referenceId: conversationId });
  }

  return payload;
}
