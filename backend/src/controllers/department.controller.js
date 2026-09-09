import { supabase } from '../config/supabaseClient.js';

export async function listDepartments(req, res) {
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, created_at')
    .order('name', { ascending: true });

  if (error) {
    console.error('listDepartments error:', error.message);
    return res.status(500).json({ error: 'Failed to load departments.' });
  }
  return res.json({ departments: data });
}

export async function createDepartment(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required.' });
  }

  const { data, error } = await supabase
    .from('departments')
    .insert({ name: name.trim() })
    .select('id, name, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A department with this name already exists.' });
    }
    console.error('createDepartment error:', error.message);
    return res.status(500).json({ error: 'Failed to create department.' });
  }
  return res.status(201).json({ department: data });
}

export async function updateDepartment(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required.' });
  }

  const { data, error } = await supabase
    .from('departments')
    .update({ name: name.trim() })
    .eq('id', id)
    .select('id, name, created_at')
    .single();

  if (error) {
    console.error('updateDepartment error:', error.message);
    return res.status(500).json({ error: 'Failed to update department.' });
  }
  return res.json({ department: data });
}

export async function deleteDepartment(req, res) {
  const { id } = req.params;
  const { error } = await supabase.from('departments').delete().eq('id', id);

  if (error) {
    console.error('deleteDepartment error:', error.message);
    return res.status(500).json({ error: 'Failed to delete department.' });
  }
  return res.status(204).send();
}
