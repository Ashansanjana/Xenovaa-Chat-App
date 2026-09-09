import { supabase } from '../config/supabaseClient.js';
import { emitToUser, getIO, userRoom } from '../sockets/registry.js';

const MEMBER_COLUMNS = 'id, name, email, profile_image, status';

async function getConversationOrNull(conversationId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, is_group, name, group_image, created_at')
    .eq('id', conversationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getMembership(conversationId, userId) {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getGroupMembers(conversationId) {
  const { data, error } = await supabase
    .from('conversation_members')
    .select(`role, user:user_id (${MEMBER_COLUMNS})`)
    .eq('conversation_id', conversationId);
  if (error) throw error;
  return data.filter((row) => row.user).map((row) => ({ ...row.user, role: row.role }));
}

function broadcastGroupUpdate(conversation, members) {
  getIO()?.to(`conversation:${conversation.id}`).emit('group_updated', {
    conversationId: conversation.id,
    name: conversation.name,
    groupImage: conversation.group_image,
    members,
  });
}

export async function createGroup(req, res) {
  try {
    const creatorId = req.user.id;
    const { name, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    const uniqueMemberIds = [...new Set((memberIds || []).filter((id) => id && id !== creatorId))];
    if (uniqueMemberIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one other member.' });
    }

    const { data: validUsers, error: validError } = await supabase
      .from('users')
      .select('id')
      .in('id', uniqueMemberIds)
      .eq('is_active', true);
    if (validError) throw validError;

    const validIds = validUsers.map((u) => u.id);
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid members selected.' });
    }

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({ is_group: true, name: name.trim(), created_by: creatorId })
      .select('id, is_group, name, group_image, created_at')
      .single();
    if (convError) throw convError;

    const memberRows = [
      { conversation_id: conversation.id, user_id: creatorId, role: 'admin' },
      ...validIds.map((id) => ({ conversation_id: conversation.id, user_id: id, role: 'member' })),
    ];
    const { error: insertMembersError } = await supabase.from('conversation_members').insert(memberRows);
    if (insertMembersError) throw insertMembersError;

    const members = await getGroupMembers(conversation.id);

    const summary = {
      id: conversation.id,
      isGroup: true,
      name: conversation.name,
      groupImage: conversation.group_image,
      otherMember: null,
      members,
      myRole: 'admin',
      lastMessage: null,
      unreadCount: 0,
      createdAt: conversation.created_at,
    };

    validIds.forEach((memberId) => {
      emitToUser(memberId, 'conversation_created', { ...summary, myRole: 'member' });
    });

    return res.status(201).json({ conversation: summary });
  } catch (err) {
    console.error('createGroup error:', err.message);
    return res.status(500).json({ error: 'Failed to create group.' });
  }
}

export async function updateGroup(req, res) {
  try {
    const { id: conversationId } = req.params;
    const { name } = req.body;
    const requesterId = req.user.id;

    const conversation = await getConversationOrNull(conversationId);
    if (!conversation || !conversation.is_group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const membership = await getMembership(conversationId, requesterId);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only a group admin can rename this group.' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    const { data: updated, error } = await supabase
      .from('conversations')
      .update({ name: name.trim() })
      .eq('id', conversationId)
      .select('id, is_group, name, group_image')
      .single();
    if (error) throw error;

    const members = await getGroupMembers(conversationId);
    broadcastGroupUpdate(updated, members);

    return res.json({ conversation: updated });
  } catch (err) {
    console.error('updateGroup error:', err.message);
    return res.status(500).json({ error: 'Failed to update group.' });
  }
}

export async function addMembers(req, res) {
  try {
    const { id: conversationId } = req.params;
    const { memberIds } = req.body;
    const requesterId = req.user.id;

    const conversation = await getConversationOrNull(conversationId);
    if (!conversation || !conversation.is_group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const membership = await getMembership(conversationId, requesterId);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only a group admin can add members.' });
    }

    const uniqueIds = [...new Set((memberIds || []).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return res.status(400).json({ error: 'No members provided.' });
    }

    const { data: existingMembers, error: existingError } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId);
    if (existingError) throw existingError;
    const existingIds = new Set(existingMembers.map((m) => m.user_id));
    const newIds = uniqueIds.filter((id) => !existingIds.has(id));
    if (newIds.length === 0) {
      return res.status(400).json({ error: 'All selected users are already members.' });
    }

    const { data: validUsers, error: validError } = await supabase
      .from('users')
      .select('id')
      .in('id', newIds)
      .eq('is_active', true);
    if (validError) throw validError;
    const validIds = validUsers.map((u) => u.id);
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid members selected.' });
    }

    const { error: insertError } = await supabase
      .from('conversation_members')
      .insert(validIds.map((id) => ({ conversation_id: conversationId, user_id: id, role: 'member' })));
    if (insertError) throw insertError;

    const members = await getGroupMembers(conversationId);

    validIds.forEach((memberId) => {
      emitToUser(memberId, 'conversation_created', {
        id: conversationId,
        isGroup: true,
        name: conversation.name,
        groupImage: conversation.group_image,
        otherMember: null,
        members,
        myRole: 'member',
        lastMessage: null,
        unreadCount: 0,
        createdAt: conversation.created_at,
      });
    });

    broadcastGroupUpdate(conversation, members);

    return res.status(201).json({ members });
  } catch (err) {
    console.error('addMembers error:', err.message);
    return res.status(500).json({ error: 'Failed to add members.' });
  }
}

export async function removeMember(req, res) {
  try {
    const { id: conversationId, userId: targetUserId } = req.params;
    const requesterId = req.user.id;

    const conversation = await getConversationOrNull(conversationId);
    if (!conversation || !conversation.is_group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const membership = await getMembership(conversationId, requesterId);
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    const isSelfLeave = targetUserId === requesterId;
    if (!isSelfLeave && membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only a group admin can remove members.' });
    }

    const { error } = await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', targetUserId);
    if (error) throw error;

    const members = await getGroupMembers(conversationId);
    broadcastGroupUpdate(conversation, members);
    emitToUser(targetUserId, 'removed_from_group', { conversationId });
    // Force any of their open tabs out of the room so they stop receiving live
    // messages from a group they're no longer a member of.
    getIO()?.in(userRoom(targetUserId)).socketsLeave(`conversation:${conversationId}`);

    return res.status(204).send();
  } catch (err) {
    console.error('removeMember error:', err.message);
    return res.status(500).json({ error: 'Failed to remove member.' });
  }
}

export async function updateMemberRole(req, res) {
  try {
    const { id: conversationId, userId: targetUserId } = req.params;
    const { role } = req.body;
    const requesterId = req.user.id;

    if (!['member', 'admin'].includes(role)) {
      return res.status(400).json({ error: "role must be 'member' or 'admin'." });
    }

    const conversation = await getConversationOrNull(conversationId);
    if (!conversation || !conversation.is_group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const membership = await getMembership(conversationId, requesterId);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only a group admin can change member roles.' });
    }

    const { error } = await supabase
      .from('conversation_members')
      .update({ role })
      .eq('conversation_id', conversationId)
      .eq('user_id', targetUserId);
    if (error) throw error;

    const members = await getGroupMembers(conversationId);
    broadcastGroupUpdate(conversation, members);

    return res.json({ members });
  } catch (err) {
    console.error('updateMemberRole error:', err.message);
    return res.status(500).json({ error: 'Failed to update member role.' });
  }
}

