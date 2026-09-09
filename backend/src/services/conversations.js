import { supabase } from '../config/supabaseClient.js';

export async function isConversationMember(conversationId, userId) {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function getConversationMemberIds(conversationId, { excludeUserId } = {}) {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId);

  if (error) throw error;
  return data.map((row) => row.user_id).filter((id) => id !== excludeUserId);
}

export async function createDirectConversation(userAId, userBId, createdBy) {
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .insert({ is_group: false, created_by: createdBy })
    .select('id, is_group, created_at')
    .single();
  if (conversationError) throw conversationError;

  const { error: membersError } = await supabase.from('conversation_members').insert([
    { conversation_id: conversation.id, user_id: userAId, role: 'member' },
    { conversation_id: conversation.id, user_id: userBId, role: 'member' },
  ]);
  if (membersError) throw membersError;

  return conversation;
}

// "Contacts" = anyone who shares a conversation with this user. Used to scope
// presence broadcasts (user_online / user_offline) instead of broadcasting company-wide.
export async function getContactUserIds(userId) {
  const { data: memberships, error } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);

  if (error) throw error;
  const conversationIds = memberships.map((m) => m.conversation_id);
  if (conversationIds.length === 0) return [];

  const { data: others, error: othersError } = await supabase
    .from('conversation_members')
    .select('user_id')
    .in('conversation_id', conversationIds)
    .neq('user_id', userId);

  if (othersError) throw othersError;
  return [...new Set(others.map((row) => row.user_id))];
}
