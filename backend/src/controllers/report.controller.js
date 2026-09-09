import { supabase } from '../config/supabaseClient.js';

const REPORT_SELECT = `id, reason, status, created_at, resolved_at,
  reporter:reporter_id (id, name, email),
  reported_user:reported_user_id (id, name, email),
  message:message_id (id, message, message_type, conversation_id, sender:sender_id (id, name)),
  resolver:resolved_by (id, name)`;

export async function createReport(req, res) {
  try {
    const reporterId = req.user.id;
    const { reportedUserId, messageId, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A reason is required.' });
    }
    if (!reportedUserId && !messageId) {
      return res.status(400).json({ error: 'Report must target a user or a message.' });
    }
    if (reportedUserId === reporterId) {
      return res.status(400).json({ error: 'You cannot report yourself.' });
    }

    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_user_id: reportedUserId || null,
        message_id: messageId || null,
        reason: reason.trim(),
      })
      .select(REPORT_SELECT)
      .single();
    if (error) throw error;

    return res.status(201).json({ report });
  } catch (err) {
    console.error('createReport error:', err.message);
    return res.status(500).json({ error: 'Failed to submit report.' });
  }
}

export async function listReports(req, res) {
  try {
    const { status } = req.query;

    let query = supabase.from('reports').select(REPORT_SELECT).order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ reports: data });
  } catch (err) {
    console.error('listReports error:', err.message);
    return res.status(500).json({ error: 'Failed to load reports.' });
  }
}

export async function resolveReport(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: "status must be 'resolved' or 'dismissed'." });
    }

    const { data: report, error } = await supabase
      .from('reports')
      .update({ status, resolved_by: req.user.id, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select(REPORT_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    return res.json({ report });
  } catch (err) {
    console.error('resolveReport error:', err.message);
    return res.status(500).json({ error: 'Failed to update report.' });
  }
}
