import { supabase } from '../config/supabaseClient.js';

const DIRECTORY_COLUMNS = 'id, name, email, profile_image, department_id, role, status, departments(name)';

export async function listUsers(req, res) {
  try {
    const { search, departmentId } = req.query;

    let query = supabase
      .from('users')
      .select(DIRECTORY_COLUMNS)
      .eq('is_active', true)
      .neq('id', req.user.id)
      .order('name', { ascending: true });

    if (search && search.trim()) {
      const term = search.trim().replace(/[%_]/g, '');
      query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
    }

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const users = data.map(({ departments, ...user }) => ({
      ...user,
      department_name: departments?.name || null,
    }));

    return res.json({ users });
  } catch (err) {
    console.error('listUsers error:', err.message);
    return res.status(500).json({ error: 'Failed to load employees.' });
  }
}

export async function getUserProfile(req, res) {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select(DIRECTORY_COLUMNS)
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { departments, ...rest } = user;
    const profile = { ...rest, department_name: departments?.name || null };

    if (id === req.user.id) {
      return res.json({ user: profile, relationship: { status: 'self' } });
    }

    const relationship = await getRelationshipStatus(req.user.id, id);
    return res.json({ user: profile, relationship });
  } catch (err) {
    console.error('getUserProfile error:', err.message);
    return res.status(500).json({ error: 'Failed to load user profile.' });
  }
}

// Shared with chat-request controller so both surfaces agree on state.
export async function getRelationshipStatus(meId, otherId) {
  const [{ data: blockedByMe }, { data: blockedMe }, { data: requests }] = await Promise.all([
    supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', meId)
      .eq('blocked_id', otherId)
      .maybeSingle(),
    supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', otherId)
      .eq('blocked_id', meId)
      .maybeSingle(),
    supabase
      .from('chat_requests')
      .select('id, sender_id, receiver_id, status, conversation_id')
      .or(
        `and(sender_id.eq.${meId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${meId})`
      )
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (blockedByMe) return { status: 'blocked_by_me' };
  if (blockedMe) return { status: 'blocked_me' };

  if (!requests) return { status: 'none' };

  if (requests.status === 'accepted') {
    return { status: 'connected', requestId: requests.id, conversationId: requests.conversation_id };
  }
  if (requests.status === 'pending') {
    return {
      status: requests.sender_id === meId ? 'pending_outgoing' : 'pending_incoming',
      requestId: requests.id,
    };
  }
  return { status: 'none' };
}
