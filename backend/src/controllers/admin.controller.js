import { supabase } from '../config/supabaseClient.js';
import { getOnlineUserCount } from '../services/presence.js';

const ADMIN_USER_COLUMNS =
  'id, name, email, role, status, is_active, department_id, created_at, departments (name)';

export async function listAllUsers(req, res) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(ADMIN_USER_COLUMNS)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const users = data.map(({ departments, ...u }) => ({ ...u, department_name: departments?.name || null }));
    return res.json({ users });
  } catch (err) {
    console.error('listAllUsers error:', err.message);
    return res.status(500).json({ error: 'Failed to load users.' });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { isActive, role, departmentId } = req.body;

    if (id === req.user.id && (isActive === false || role === 'employee')) {
      return res.status(400).json({ error: 'You cannot deactivate or demote your own account.' });
    }

    const updates = {};
    if (typeof isActive === 'boolean') updates.is_active = isActive;
    if (role) {
      if (!['employee', 'admin'].includes(role)) {
        return res.status(400).json({ error: "role must be 'employee' or 'admin'." });
      }
      updates.role = role;
    }
    if (departmentId !== undefined) updates.department_id = departmentId || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No changes provided.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select(ADMIN_USER_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { departments, ...rest } = user;
    return res.json({ user: { ...rest, department_name: departments?.name || null } });
  } catch (err) {
    console.error('updateUser error:', err.message);
    return res.status(500).json({ error: 'Failed to update user.' });
  }
}

export async function getStats(req, res) {
  try {
    const results = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('conversations').select('*', { count: 'exact', head: true }),
      supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('is_group', true),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);

    const labels = ['totalUsers', 'activeUsers', 'totalMessages', 'totalConversations', 'totalGroups', 'openReports'];
    results.forEach((r, i) => {
      if (r.error) console.error(`getStats [${labels[i]}] error:`, r.error);
    });

    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalMessages },
      { count: totalConversations },
      { count: totalGroups },
      { count: openReports },
    ] = results;

    return res.json({
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        onlineNow: getOnlineUserCount(),
        totalMessages: totalMessages || 0,
        totalConversations: totalConversations || 0,
        totalGroups: totalGroups || 0,
        openReports: openReports || 0,
      },
    });
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ error: 'Failed to load stats.' });
  }
}

