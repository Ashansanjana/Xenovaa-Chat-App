import { supabase } from '../config/supabaseClient.js';
import { createNotification } from './notification.controller.js';
import { getIO } from '../sockets/registry.js';

export async function createAnnouncement(req, res) {
  try {
    const { title, body } = req.body;
    const postedBy = req.user.id;

    if (!title || !title.trim() || !body || !body.trim()) {
      return res.status(400).json({ error: 'title and body are required.' });
    }

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({ title: title.trim(), body: body.trim(), posted_by: postedBy })
      .select('id, title, body, posted_by, created_at')
      .single();
    if (error) throw error;

    // Broadcast the full content immediately for the live banner...
    getIO()?.emit('new_announcement', announcement);

    // ...while each user gets their own persisted, per-user notification row
    // (createNotification already emits 'new_notification' to that user).
    const { data: activeUsers, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('is_active', true)
      .neq('id', postedBy);
    if (usersError) throw usersError;

    await Promise.all(
      activeUsers.map((u) =>
        createNotification({ userId: u.id, type: 'announcement', referenceId: announcement.id })
      )
    );

    return res.status(201).json({ announcement });
  } catch (err) {
    console.error('createAnnouncement error:', err.message);
    return res.status(500).json({ error: 'Failed to post announcement.' });
  }
}

export async function listAnnouncements(req, res) {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, posted_by, created_at, poster:posted_by (id, name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    return res.json({ announcements: data });
  } catch (err) {
    console.error('listAnnouncements error:', err.message);
    return res.status(500).json({ error: 'Failed to load announcements.' });
  }
}
