import { supabase } from '../config/supabaseClient.js';
import { isConversationMember } from '../services/conversations.js';
import { getSignedFileUrl } from '../services/storage.js';
import { getIO } from '../sockets/registry.js';

const MEMBER_COLUMNS = 'id, name, email, profile_image, status';

export async function listConversations(req, res) {
  try {
    const meId = req.user.id;

    const { data: memberships, error: membershipError } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', meId);
    if (membershipError) throw membershipError;

    const conversationIds = memberships.map((m) => m.conversation_id);
    if (conversationIds.length === 0) return res.json({ conversations: [] });

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(
        `id, is_group, name, group_image, created_at,
         conversation_members (role, user:user_id (${MEMBER_COLUMNS}))`
      )
      .in('id', conversationIds);
    if (convError) throw convError;

    const { data: recentMessages, error: msgError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, message, message_type, is_deleted, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
      .limit(500);
    if (msgError) throw msgError;

    const { data: hiddenRows, error: hiddenError } = await supabase
      .from('message_deletions')
      .select('message_id')
      .eq('user_id', meId);
    if (hiddenError) throw hiddenError;
    const hiddenIds = new Set(hiddenRows.map((r) => r.message_id));

    const lastMessageByConversation = new Map();
    for (const msg of recentMessages) {
      if (hiddenIds.has(msg.id)) continue;
      if (!lastMessageByConversation.has(msg.conversation_id)) {
        lastMessageByConversation.set(msg.conversation_id, msg);
      }
    }

    const { data: unreadRows, error: unreadError } = await supabase
      .from('message_status')
      .select('message_id, message:message_id (conversation_id)')
      .eq('user_id', meId)
      .neq('status', 'read');
    if (unreadError) throw unreadError;

    const unreadCountByConversation = new Map();
    for (const row of unreadRows) {
      const convId = row.message?.conversation_id;
      if (!convId) continue;
      unreadCountByConversation.set(convId, (unreadCountByConversation.get(convId) || 0) + 1);
    }

    const result = conversations
      .map((c) => {
        const members = c.conversation_members
          .filter((cm) => cm.user)
          .map((cm) => ({ ...cm.user, role: cm.role }));
        const otherMembers = members.filter((m) => m.id !== meId);
        const lastMessage = lastMessageByConversation.get(c.id) || null;

        return {
          id: c.id,
          isGroup: c.is_group,
          name: c.is_group ? c.name : otherMembers[0]?.name || null,
          groupImage: c.group_image,
          otherMember: c.is_group ? null : otherMembers[0] || null,
          members,
          myRole: members.find((m) => m.id === meId)?.role || null,
          lastMessage: lastMessage && {
            ...lastMessage,
            message: lastMessage.is_deleted ? null : lastMessage.message,
          },
          unreadCount: unreadCountByConversation.get(c.id) || 0,
          createdAt: c.created_at,
        };
      })
      .sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.createdAt;
        const bTime = b.lastMessage?.created_at || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });

    return res.json({ conversations: result });
  } catch (err) {
    console.error('listConversations error:', err.message);
    return res.status(500).json({ error: 'Failed to load conversations.' });
  }
}

export async function getConversationMessages(req, res) {
  try {
    const { id } = req.params;
    const { before, limit } = req.query;
    const meId = req.user.id;

    const isMember = await isConversationMember(id, meId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' });
    }

    let query = supabase
      .from('messages')
      .select(
        `id, conversation_id, sender_id, message, message_type, file_url, reply_to_message_id,
         is_deleted, deleted_for_everyone, created_at,
         sender:sender_id (id, name, profile_image),
         reply_to:reply_to_message_id (id, message, message_type, sender:sender_id (id, name)),
         message_status (user_id, status)`
      )
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limit) || 30, 100));

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;
    if (error) throw error;

    const fetchedIds = data.map((m) => m.id);

    const [{ data: hiddenRows, error: hiddenError }, { data: pinnedRows, error: pinnedError }] =
      await Promise.all([
        supabase
          .from('message_deletions')
          .select('message_id')
          .eq('user_id', meId)
          .in('message_id', fetchedIds),
        supabase.from('pinned_messages').select('message_id').eq('conversation_id', id),
      ]);
    if (hiddenError) throw hiddenError;
    if (pinnedError) throw pinnedError;

    const hiddenIds = new Set(hiddenRows.map((r) => r.message_id));
    const pinnedIds = new Set(pinnedRows.map((r) => r.message_id));
    const visible = data.filter((m) => !hiddenIds.has(m.id)).reverse();

    const messages = await Promise.all(
      visible.map(async (m) => ({
        ...m,
        message: m.is_deleted ? null : m.message,
        file_url: m.is_deleted || !m.file_url ? null : await getSignedFileUrl(m.file_url),
        is_pinned: pinnedIds.has(m.id),
      }))
    );

    const idsToUpgrade = messages
      .filter((m) => m.sender_id !== meId)
      .filter((m) => m.message_status.some((s) => s.user_id === meId && s.status === 'sent'))
      .map((m) => m.id);

    if (idsToUpgrade.length > 0) {
      await supabase
        .from('message_status')
        .update({ status: 'delivered', updated_at: new Date().toISOString() })
        .in('message_id', idsToUpgrade)
        .eq('user_id', meId)
        .eq('status', 'sent');

      messages.forEach((m) => {
        if (idsToUpgrade.includes(m.id)) {
          m.message_status = m.message_status.map((s) =>
            s.user_id === meId ? { ...s, status: 'delivered' } : s
          );
        }
      });

      getIO()?.to(`conversation:${id}`).emit('message_status_update', {
        conversationId: id,
        userId: meId,
        status: 'delivered',
        messageIds: idsToUpgrade,
      });
    }

    return res.json({ messages });
  } catch (err) {
    console.error('getConversationMessages error:', err.message);
    return res.status(500).json({ error: 'Failed to load messages.' });
  }
}

export async function listPinnedMessages(req, res) {
  try {
    const { id } = req.params;
    const meId = req.user.id;

    const isMember = await isConversationMember(id, meId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' });
    }

    const { data, error } = await supabase
      .from('pinned_messages')
      .select(
        `message_id, pinned_at, pinned_by,
         message:message_id (id, message, message_type, file_url, is_deleted, created_at,
           sender:sender_id (id, name, profile_image))`
      )
      .eq('conversation_id', id)
      .order('pinned_at', { ascending: false });
    if (error) throw error;

    const pins = await Promise.all(
      data
        .filter((row) => row.message)
        .map(async (row) => ({
          messageId: row.message_id,
          pinnedAt: row.pinned_at,
          pinnedBy: row.pinned_by,
          message: {
            ...row.message,
            message: row.message.is_deleted ? null : row.message.message,
            file_url:
              row.message.is_deleted || !row.message.file_url
                ? null
                : await getSignedFileUrl(row.message.file_url),
          },
        }))
    );

    return res.json({ pins });
  } catch (err) {
    console.error('listPinnedMessages error:', err.message);
    return res.status(500).json({ error: 'Failed to load pinned messages.' });
  }
}
