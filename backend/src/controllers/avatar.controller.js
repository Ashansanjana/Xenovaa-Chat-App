import { supabase } from '../config/supabaseClient.js';
import { validateAvatarFile, uploadAvatar, deleteAvatar } from '../services/storage.js';

const PUBLIC_USER_COLUMNS = 'id, name, email, profile_image, department_id, role, status, is_active, created_at';

export async function updateAvatar(req, res) {
  try {
    const validationError = validateAvatarFile(req.file);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const publicUrl = await uploadAvatar({
      userId: req.user.id,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
    });

    const { data: user, error } = await supabase
      .from('users')
      .update({ profile_image: publicUrl })
      .eq('id', req.user.id)
      .select(PUBLIC_USER_COLUMNS)
      .single();
    if (error) throw error;

    return res.json({ user });
  } catch (err) {
    console.error('updateAvatar error:', err.message);
    return res.status(500).json({ error: 'Failed to update profile picture.' });
  }
}

export async function removeAvatar(req, res) {
  try {
    await deleteAvatar(req.user.id);

    const { data: user, error } = await supabase
      .from('users')
      .update({ profile_image: null })
      .eq('id', req.user.id)
      .select(PUBLIC_USER_COLUMNS)
      .single();
    if (error) throw error;

    return res.json({ user });
  } catch (err) {
    console.error('removeAvatar error:', err.message);
    return res.status(500).json({ error: 'Failed to remove profile picture.' });
  }
}
