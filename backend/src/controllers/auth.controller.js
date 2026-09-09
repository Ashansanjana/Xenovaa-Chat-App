import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabaseClient.js';
import { signToken } from '../utils/jwt.js';

const PUBLIC_USER_COLUMNS = 'id, name, email, profile_image, department_id, role, status, is_active, created_at';

export async function register(req, res) {
  try {
    const { name, email, password, departmentId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        department_id: departmentId || null,
      })
      .select(PUBLIC_USER_COLUMNS)
      .single();

    if (error) throw error;

    const token = signToken({ id: user.id, role: user.role });
    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('register error:', err.message);
    return res.status(500).json({ error: 'Failed to register user.' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select(`${PUBLIC_USER_COLUMNS}, password_hash`)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    delete user.password_hash;

    const token = signToken({ id: user.id, role: user.role });
    return res.json({ user, token });
  } catch (err) {
    console.error('login error:', err.message);
    return res.status(500).json({ error: 'Failed to log in.' });
  }
}

export async function getCurrentUser(req, res) {
  return res.json({ user: req.user });
}
