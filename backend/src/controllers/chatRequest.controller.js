import { supabase } from '../config/supabaseClient.js';
import { createNotification } from './notification.controller.js';
import { emitToUser } from '../sockets/registry.js';
import { isBlockedEitherWay } from '../services/blocking.js';
import { createDirectConversation } from '../services/conversations.js';

const REQUESTER_COLUMNS = 'id, name, email, profile_image, department_id, status';

async function findActiveRequest(userAId, userBId) {
  const { data, error } = await supabase
    .from('chat_requests')
    .select('id, sender_id, receiver_id, status')
    .or(
      `and(sender_id.eq.${userAId},receiver_id.eq.${userBId}),and(sender_id.eq.${userBId},receiver_id.eq.${userAId})`
    )
    .in('status', ['pending', 'accepted'])
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function sendChatRequest(req, res) {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ error: 'receiverId is required.' });
    }
    if (receiverId === senderId) {
      return res.status(400).json({ error: 'You cannot send a chat request to yourself.' });
    }

    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('id, name, profile_image, is_active')
      .eq('id', receiverId)
      .maybeSingle();

    if (receiverError) throw receiverError;
    if (!receiver || !receiver.is_active) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (await isBlockedEitherWay(senderId, receiverId)) {
      return res.status(403).json({ error: 'You cannot send a chat request to this user.' });
    }

    const existing = await findActiveRequest(senderId, receiverId);
    if (existing) {
      const message =
        existing.status === 'accepted'
          ? 'You are already connected with this user.'
          : 'A chat request is already pending between you and this user.';
      return res.status(409).json({ error: message });
    }

    // Admins can start a conversation with anyone directly — no approval needed.
    if (req.user.role === 'admin') {
      const conversation = await createDirectConversation(senderId, receiverId, senderId);

      const { data: request, error } = await supabase
        .from('chat_requests')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          status: 'accepted',
          conversation_id: conversation.id,
        })
        .select(`id, sender_id, receiver_id, status, created_at, sender:sender_id (${REQUESTER_COLUMNS})`)
        .single();
      if (error) throw error;

      const notification = await createNotification({
        userId: receiverId,
        type: 'chat_started',
        referenceId: conversation.id,
      });

      emitToUser(receiverId, 'conversation_created', {
        id: conversation.id,
        isGroup: false,
        name: req.user.name,
        groupImage: null,
        otherMember: { id: senderId, name: req.user.name, profile_image: null, status: 'online' },
        members: [
          { id: senderId, name: req.user.name, role: 'member' },
          { id: receiverId, name: receiver.name, profile_image: receiver.profile_image, role: 'member' },
        ],
        myRole: 'member',
        lastMessage: null,
        unreadCount: 0,
        createdAt: conversation.created_at,
      });
      emitToUser(receiverId, 'chat_request_accepted', { requestId: request.id, conversation, notification });

      return res.status(201).json({ request, conversation });
    }

    const { data: request, error } = await supabase
      .from('chat_requests')
      .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' })
      .select(`id, sender_id, receiver_id, status, created_at, sender:sender_id (${REQUESTER_COLUMNS})`)
      .single();

    if (error) throw error;

    const notification = await createNotification({
      userId: receiverId,
      type: 'chat_request',
      referenceId: request.id,
    });

    emitToUser(receiverId, 'chat_request_received', { request, notification });

    return res.status(201).json({ request });
  } catch (err) {
    console.error('sendChatRequest error:', err.message);
    return res.status(500).json({ error: 'Failed to send chat request.' });
  }
}

export async function listIncomingRequests(req, res) {
  try {
    const { data, error } = await supabase
      .from('chat_requests')
      .select(`id, status, created_at, sender:sender_id (${REQUESTER_COLUMNS})`)
      .eq('receiver_id', req.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ requests: data });
  } catch (err) {
    console.error('listIncomingRequests error:', err.message);
    return res.status(500).json({ error: 'Failed to load incoming requests.' });
  }
}

export async function listOutgoingRequests(req, res) {
  try {
    const { data, error } = await supabase
      .from('chat_requests')
      .select(`id, status, created_at, receiver:receiver_id (${REQUESTER_COLUMNS})`)
      .eq('sender_id', req.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ requests: data });
  } catch (err) {
    console.error('listOutgoingRequests error:', err.message);
    return res.status(500).json({ error: 'Failed to load outgoing requests.' });
  }
}

export async function listConnections(req, res) {
  try {
    const meId = req.user.id;

    const { data, error } = await supabase
      .from('chat_requests')
      .select(
        `id, sender_id, receiver_id, status, created_at, conversation_id,
         sender:sender_id (${REQUESTER_COLUMNS}), receiver:receiver_id (${REQUESTER_COLUMNS})`
      )
      .eq('status', 'accepted')
      .or(`sender_id.eq.${meId},receiver_id.eq.${meId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const connections = data.map((row) => ({
      requestId: row.id,
      conversationId: row.conversation_id,
      connectedAt: row.created_at,
      user: row.sender_id === meId ? row.receiver : row.sender,
    }));

    return res.json({ connections });
  } catch (err) {
    console.error('listConnections error:', err.message);
    return res.status(500).json({ error: 'Failed to load connections.' });
  }
}

export async function respondToRequest(req, res) {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: "action must be 'accept' or 'reject'." });
    }

    const { data: request, error: fetchError } = await supabase
      .from('chat_requests')
      .select('id, sender_id, receiver_id, status')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) return res.status(404).json({ error: 'Chat request not found.' });
    if (request.receiver_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the recipient can respond to this request.' });
    }
    if (request.status !== 'pending') {
      return res.status(409).json({ error: 'This request has already been responded to.' });
    }

    if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('chat_requests')
        .update({ status: 'rejected' })
        .eq('id', id);
      if (updateError) throw updateError;

      return res.json({ request: { ...request, status: 'rejected' } });
    }

    const conversation = await createDirectConversation(request.sender_id, request.receiver_id, req.user.id);

    const newStatus = 'accepted';
    const { error: updateError } = await supabase
      .from('chat_requests')
      .update({ status: newStatus, conversation_id: conversation.id })
      .eq('id', id);

    if (updateError) throw updateError;

    const notification = await createNotification({
      userId: request.sender_id,
      type: 'request_accepted',
      referenceId: conversation.id,
    });

    emitToUser(request.sender_id, 'chat_request_accepted', {
      requestId: request.id,
      conversation,
      notification,
    });

    return res.json({ request: { ...request, status: newStatus }, conversation });
  } catch (err) {
    console.error('respondToRequest error:', err.message);
    return res.status(500).json({ error: 'Failed to respond to chat request.' });
  }
}

export async function cancelRequest(req, res) {
  try {
    const { id } = req.params;

    const { data: request, error: fetchError } = await supabase
      .from('chat_requests')
      .select('id, sender_id, status')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) return res.status(404).json({ error: 'Chat request not found.' });
    if (request.sender_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the sender can cancel this request.' });
    }
    if (request.status !== 'pending') {
      return res.status(409).json({ error: 'Only pending requests can be cancelled.' });
    }

    const { error } = await supabase.from('chat_requests').delete().eq('id', id);
    if (error) throw error;

    return res.status(204).send();
  } catch (err) {
    console.error('cancelRequest error:', err.message);
    return res.status(500).json({ error: 'Failed to cancel chat request.' });
  }
}
