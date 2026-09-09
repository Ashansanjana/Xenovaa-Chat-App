import { useEffect, useState } from 'react';
import { listUsersRequest } from '../api/users';
import { createGroupRequest } from '../api/groups';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { TextInput } from './FormField';
import { CloseIcon } from './Icons';

export function NewGroupModal({ onClose, onCreated }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listUsersRequest()
      .then(setUsers)
      .catch(() => setError('Failed to load employees.'))
      .finally(() => setLoadingUsers(false));
  }, []);

  function toggleMember(userId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || selected.size === 0) return;

    setSubmitting(true);
    setError('');
    try {
      const conversation = await createGroupRequest(name.trim(), [...selected]);
      onCreated(conversation);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-anchor-900/50 px-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-line bg-surface shadow-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">New group</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-field hover:text-[var(--color-ink-soft)]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="px-4 pt-3">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" />
          </div>

          <div className="mt-3 flex-1 overflow-y-auto border-t border-line px-4 py-2">
            {loadingUsers ? (
              <p className="py-4 text-sm text-[var(--color-ink-muted)]">Loading employees…</p>
            ) : users.length === 0 ? (
              <p className="py-4 text-sm text-[var(--color-ink-muted)]">No other employees found.</p>
            ) : (
              users.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 hover:bg-field">
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleMember(u.id)}
                    className="h-4 w-4 rounded border-line text-accent-600 focus:ring-accent-600"
                  />
                  <Avatar name={u.name} profileImage={u.profile_image} size={32} />
                  <span className="text-sm text-ink">{u.name}</span>
                </label>
              ))
            )}
          </div>

          {error && <p className="px-4 pt-2 text-xs text-danger-600">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !name.trim() || selected.size === 0}>
              {submitting ? 'Creating…' : 'Create group'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
