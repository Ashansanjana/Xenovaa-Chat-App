import { supabase } from '../config/supabaseClient.js';

export async function blockUser(req, res) {
  try {
    const blockerId = req.user.id;
    const { id: blockedId } = req.params;

    if (blockedId === blockerId) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }

    const { error } = await supabase
      .from('blocked_users')
      .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });
    if (error) throw error;

    return res.status(204).send();
  } catch (err) {
    console.error('blockUser error:', err.message);
    return res.status(500).json({ error: 'Failed to block user.' });
  }
}

export async function unblockUser(req, res) {
  try {
    const blockerId = req.user.id;
    const { id: blockedId } = req.params;

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);
    if (error) throw error;

    return res.status(204).send();
  } catch (err) {
    console.error('unblockUser error:', err.message);
    return res.status(500).json({ error: 'Failed to unblock user.' });
  }
}
