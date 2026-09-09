import { supabase } from '../config/supabaseClient.js';
import { emitToUser } from '../sockets/registry.js';

export async function createNotification({ userId, type, referenceId = null }) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, reference_id: referenceId })
    .select('id, user_id, type, reference_id, is_read, created_at')
    .single();

  if (error) {
    console.error('createNotification error:', error.message);
    return null;
  }

  emitToUser(userId, 'new_notification', data);
  return data;
}

export async function listNotifications(req, res) {
  try {
    const { unreadOnly } = req.query;

    let query = supabase
      .from('notifications')
      .select('id, type, reference_id, is_read, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly === 'true') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ notifications: data });
  } catch (err) {
    console.error('listNotifications error:', err.message);
    return res.status(500).json({ error: 'Failed to load notifications.' });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('id, type, reference_id, is_read, created_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Notification not found.' });

    return res.json({ notification: data });
  } catch (err) {
    console.error('markNotificationRead error:', err.message);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) throw error;
    return res.status(204).send();
  } catch (err) {
    console.error('markAllNotificationsRead error:', err.message);
    return res.status(500).json({ error: 'Failed to update notifications.' });
  }
}
