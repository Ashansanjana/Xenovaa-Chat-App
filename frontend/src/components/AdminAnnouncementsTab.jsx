import { useEffect, useState } from 'react';
import { listAnnouncementsRequest, createAnnouncementRequest } from '../api/announcements';
import { Card } from './Card';
import { Button } from './Button';
import { TextInput, TextArea } from './FormField';

export function AdminAnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    return listAnnouncementsRequest()
      .then(setAnnouncements)
      .catch(() => setError('Failed to load announcements.'))
      .finally(() => setLoading(false));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setPosting(true);
    setError('');
    try {
      const announcement = await createAnnouncementRequest(title.trim(), body.trim());
      setAnnouncements((prev) => [announcement, ...prev]);
      setTitle('');
      setBody('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post announcement.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <Card className="mb-6 p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
          <TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message for all employees…"
            rows={3}
          />
          {error && <p className="rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-600">{error}</p>}
          <Button type="submit" disabled={posting || !title.trim() || !body.trim()}>
            {posting ? 'Posting…' : 'Post to everyone'}
          </Button>
        </form>
      </Card>

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">No announcements yet.</p>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <Card key={a.id} className="p-4">
              <p className="text-sm font-medium text-ink">{a.title}</p>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{a.body}</p>
              <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                {a.poster?.name} · {new Date(a.created_at).toLocaleString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
