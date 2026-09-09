import { verifyToken } from '../utils/jwt.js';
import { supabase } from '../config/supabaseClient.js';
import { setIO, userRoom, emitToUser } from './registry.js';
import { addSocket, removeSocket, setUserStatus, getUserStatus } from '../services/presence.js';
import { isConversationMember, getContactUserIds } from '../services/conversations.js';
import { createAndBroadcastMessage, MessagingError } from '../services/messaging.js';

function conversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

export function registerSocketHandlers(io) {
  setIO(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing authentication token.'));

    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.id;
      const requestedStatus = socket.handshake.auth?.status;
      socket.initialStatus = requestedStatus === 'break' ? 'break' : 'online';
      next();
    } catch (err) {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(userRoom(userId));
    setPresence(io, socket, userId, true, socket.initialStatus);

    socket.on('join_conversation', (payload) => handleJoinConversation(io, socket, userId, payload));
    socket.on('send_message', (payload, ack) => handleSendMessage(io, userId, payload, ack));
    socket.on('typing_start', (payload) => handleTyping(io, socket, userId, payload, true));
    socket.on('typing_stop', (payload) => handleTyping(io, socket, userId, payload, false));
    socket.on('mark_as_read', (payload) => handleMarkAsRead(io, userId, payload));
    socket.on('pin_message', (payload, ack) => handlePinMessage(io, userId, payload, ack));
    socket.on('delete_message', (payload, ack) => handleDeleteMessage(io, userId, payload, ack));
    socket.on('set_status', (payload) => handleSetStatus(io, userId, payload));

    socket.on('disconnect', () => handleDisconnect(io, socket, userId));
  });
}

// --- Presence -------------------------------------------------------------

async function setPresence(io, socket, userId, isConnecting, initialStatus) {
  const result = isConnecting
    ? addSocket(userId, socket.id, initialStatus)
    : removeSocket(userId, socket.id);

  const changed = isConnecting ? result.wasOffline : result.isNowOffline;
  if (!changed) return;

  try {
    const effectiveStatus = isConnecting ? getUserStatus(userId) : 'offline';

    await supabase
      .from('users')
      .update({ status: effectiveStatus })
      .eq('id', userId);

    const contacts = await getContactUserIds(userId);
    if (isConnecting) {
      // Broadcast the user's current status (online or break) to contacts
      contacts.forEach((contactId) =>
        emitToUser(contactId, 'user_status_changed', { userId, status: effectiveStatus })
      );
    } else {
      contacts.forEach((contactId) =>
        emitToUser(contactId, 'user_status_changed', { userId, status: 'offline' })
      );
    }

    if (isConnecting) {
      await upgradeSentToDelivered(io, userId);
    }
  } catch (err) {
    console.error('presence update error:', err.message);
  }
}

// --- Manual status change -----------------------------------------------

async function handleSetStatus(io, userId, payload) {
  const status = payload?.status;
  if (!['online', 'break'].includes(status)) return; // 'offline' is not manually settable

  const updated = setUserStatus(userId, status);
  if (!updated) return; // user is not connected

  try {
    await supabase.from('users').update({ status }).eq('id', userId);

    const contacts = await getContactUserIds(userId);
    contacts.forEach((contactId) =>
      emitToUser(contactId, 'user_status_changed', { userId, status })
    );
  } catch (err) {
    console.error('set_status error:', err.message);
  }
}

async function upgradeSentToDelivered(io, userId) {
  const { data: rows, error } = await supabase
    .from('message_status')
    .select('message_id, message:message_id (conversation_id)')
    .eq('user_id', userId)
    .eq('status', 'sent');

  if (error || !rows?.length) return;

  const messageIds = rows.map((r) => r.message_id);
  await supabase
    .from('message_status')
    .update({ status: 'delivered', updated_at: new Date().toISOString() })
    .in('message_id', messageIds)
    .eq('user_id', userId);

  const byConversation = new Map();
  for (const row of rows) {
    const convId = row.message?.conversation_id;
    if (!convId) continue;
    if (!byConversation.has(convId)) byConversation.set(convId, []);
    byConversation.get(convId).push(row.message_id);
  }

  for (const [conversationId, messageIdsInConv] of byConversation) {
    io.to(conversationRoom(conversationId)).emit('message_status_update', {
      conversationId,
      userId,
      status: 'delivered',
      messageIds: messageIdsInConv,
    });
  }
}

// --- Conversations / messaging ---------------------------------------------

async function handleJoinConversation(io, socket, userId, payload) {
  const conversationId = payload?.conversationId;
  if (!conversationId) return;

  try {
    const isMember = await isConversationMember(conversationId, userId);
    if (!isMember) return;

    socket.join(conversationRoom(conversationId));
    await markConversationRead(io, conversationId, userId);
  } catch (err) {
    console.error('join_conversation error:', err.message);
  }
}

async function markConversationRead(io, conversationId, userId) {
  const { data: convMessages, error: msgErr } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId);
  if (msgErr) throw msgErr;

  const messageIds = convMessages.map((m) => m.id);
  if (messageIds.length === 0) return;

  const { data: unread, error: statusErr } = await supabase
    .from('message_status')
    .select('message_id')
    .eq('user_id', userId)
    .neq('status', 'read')
    .in('message_id', messageIds);
  if (statusErr) throw statusErr;
  if (unread.length === 0) return;

  const unreadIds = unread.map((r) => r.message_id);
  const { error: updateErr } = await supabase
    .from('message_status')
    .update({ status: 'read', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('message_id', unreadIds);
  if (updateErr) throw updateErr;

  io.to(conversationRoom(conversationId)).emit('message_status_update', {
    conversationId,
    userId,
    status: 'read',
    messageIds: unreadIds,
  });
}

async function handleMarkAsRead(io, userId, payload) {
  const conversationId = payload?.conversationId;
  if (!conversationId) return;

  try {
    const isMember = await isConversationMember(conversationId, userId);
    if (!isMember) return;
    await markConversationRead(io, conversationId, userId);
  } catch (err) {
    console.error('mark_as_read error:', err.message);
  }
}

async function handleTyping(io, socket, userId, payload, isTyping) {
  const conversationId = payload?.conversationId;
  if (!conversationId) return;

  try {
    const isMember = await isConversationMember(conversationId, userId);
    if (!isMember) return;
    socket.to(conversationRoom(conversationId)).emit('typing', { conversationId, userId, isTyping });
  } catch (err) {
    console.error('typing event error:', err.message);
  }
}

async function handleSendMessage(io, userId, payload, ack) {
  const respond = typeof ack === 'function' ? ack : () => {};
  const conversationId = payload?.conversationId;
  const text = typeof payload?.message === 'string' ? payload.message.trim() : '';
  const replyToMessageId = payload?.replyToMessageId || null;

  if (!conversationId || !text) {
    return respond({ error: 'conversationId and message are required.' });
  }
  if (text.length > 4000) {
    return respond({ error: 'Message is too long.' });
  }

  try {
    const isMember = await isConversationMember(conversationId, userId);
    if (!isMember) {
      return respond({ error: 'You are not a member of this conversation.' });
    }

    const message = await createAndBroadcastMessage({
      io,
      conversationId,
      senderId: userId,
      message: text,
      messageType: 'text',
      replyToMessageId,
    });

    respond({ message });
  } catch (err) {
    console.error('send_message error:', err.message);
    respond({ error: err instanceof MessagingError ? err.message : 'Failed to send message.' });
  }
}

async function handlePinMessage(io, userId, payload, ack) {
  const respond = typeof ack === 'function' ? ack : () => {};
  const conversationId = payload?.conversationId;
  const messageId = payload?.messageId;
  const pinned = payload?.pinned !== false;

  if (!conversationId || !messageId) {
    return respond({ error: 'conversationId and messageId are required.' });
  }

  try {
    const isMember = await isConversationMember(conversationId, userId);
    if (!isMember) return respond({ error: 'You are not a member of this conversation.' });

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .maybeSingle();
    if (messageError) throw messageError;
    if (!message) return respond({ error: 'Message not found in this conversation.' });

    if (pinned) {
      const { error } = await supabase
        .from('pinned_messages')
        .insert({ conversation_id: conversationId, message_id: messageId, pinned_by: userId });
      if (error && error.code !== '23505') throw error; // ignore "already pinned"
    } else {
      const { error } = await supabase
        .from('pinned_messages')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('message_id', messageId);
      if (error) throw error;
    }

    io.to(conversationRoom(conversationId)).emit('message_updated', {
      conversationId,
      messageId,
      isPinned: pinned,
    });

    respond({ messageId, isPinned: pinned });
  } catch (err) {
    console.error('pin_message error:', err.message);
    respond({ error: 'Failed to update pin.' });
  }
}

async function handleDeleteMessage(io, userId, payload, ack) {
  const respond = typeof ack === 'function' ? ack : () => {};
  const conversationId = payload?.conversationId;
  const messageId = payload?.messageId;
  const forEveryone = !!payload?.forEveryone;

  if (!conversationId || !messageId) {
    return respond({ error: 'conversationId and messageId are required.' });
  }

  try {
    const isMember = await isConversationMember(conversationId, userId);
    if (!isMember) return respond({ error: 'You are not a member of this conversation.' });

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, sender_id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .maybeSingle();
    if (messageError) throw messageError;
    if (!message) return respond({ error: 'Message not found in this conversation.' });

    if (forEveryone) {
      if (message.sender_id !== userId) {
        return respond({ error: 'Only the sender can delete a message for everyone.' });
      }

      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true, deleted_for_everyone: true, message: null, file_url: null })
        .eq('id', messageId);
      if (error) throw error;

      io.to(conversationRoom(conversationId)).emit('message_updated', {
        conversationId,
        messageId,
        isDeleted: true,
        deletedForEveryone: true,
      });
    } else {
      const { error } = await supabase
        .from('message_deletions')
        .upsert({ message_id: messageId, user_id: userId }, { onConflict: 'message_id,user_id' });
      if (error) throw error;

      emitToUser(userId, 'message_updated', {
        conversationId,
        messageId,
        hiddenForMe: true,
      });
    }

    respond({ messageId, forEveryone });
  } catch (err) {
    console.error('delete_message error:', err.message);
    respond({ error: 'Failed to delete message.' });
  }
}

// --- Connection lifecycle ---------------------------------------------------

function handleDisconnect(io, socket, userId) {
  setPresence(io, socket, userId, false);
}
