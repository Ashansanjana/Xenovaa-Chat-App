import { useEffect, useState } from 'react';
import { listUsersRequest } from '../api/users';
import {
  renameGroupRequest,
  addGroupMembersRequest,
  removeGroupMemberRequest,
  updateGroupMemberRoleRequest,
} from '../api/groups';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { TextInput } from './FormField';
import { CloseIcon, PlusIcon } from './Icons';

export function GroupInfoPanel({ conversation, currentUserId, onClose, onLeave }) {
  const isAdmin = conversation.myRole === 'admin';
  const [name, setName] = useState(conversation.name || '');
  const [savingName, setSavingName] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedNew, setSelectedNew] = useState(new Set());
  const [busyUserId, setBusyUserId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(conversation.name || '');
  }, [conversation.name]);

  const memberIds = new Set(conversation.members.map((m) => m.id));

  function openAddMember() {
    setShowAddMember(true);
    setLoadingCandidates(true);
    listUsersRequest()
      .then((users) => setCandidates(users.filter((u) => !memberIds.has(u.id))))
      .catch(() => setError('Failed to load employees.'))
      .finally(() => setLoadingCandidates(false));
  }

  function toggleCandidate(userId) {
    setSelectedNew((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleRenameSubmit(e) {
    e.preventDefault();
    if (!name.trim() || name.trim() === conversation.name) return;
    setSavingName(true);
    setError('');
    try {
      await renameGroupRequest(conversation.id, name.trim());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to rename group.');
    } finally {
      setSavingName(false);
    }
  }

  async function handleAddSelected() {
    if (selectedNew.size === 0) return;
    setError('');
    try {
      await addGroupMembersRequest(conversation.id, [...selectedNew]);
      setShowAddMember(false);
      setSelectedNew(new Set());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add members.');
    }
  }

  async function handleRemove(userId) {
    setBusyUserId(userId);
    setError('');
    try {
      await removeGroupMemberRequest(conversation.id, userId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member.');
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleRoleToggle(member) {
    const nextRole = member.role === 'admin' ? 'member' : 'admin';
    setBusyUserId(member.id);
    setError('');
    try {
      await updateGroupMemberRoleRequest(conversation.id, member.id, nextRole);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role.');
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleLeave() {
    setBusyUserId(currentUserId);
    setError('');
    try {
      await removeGroupMemberRequest(conversation.id, currentUserId);
      onLeave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to leave group.');
      setBusyUserId(null);
    }
  }

  return (
    <div className="flex w-72 flex-shrink-0 flex-col overflow-y-auto border-l border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Group info</h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-field hover:text-[var(--color-ink-soft)]"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-3">
        {isAdmin ? (
          <form onSubmit={handleRenameSubmit} className="flex gap-2">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Button
              type="submit"
              size="sm"
              disabled={savingName || !name.trim() || name.trim() === conversation.name}
            >
              Save
            </Button>
          </form>
        ) : (
          <p className="text-sm font-medium text-ink">{conversation.name}</p>
        )}
      </div>

      {error && <p className="px-4 text-xs text-danger-600">{error}</p>}

      <div className="flex items-center justify-between px-4 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          Members ({conversation.members.length})
        </p>
        {isAdmin && (
          <button
            onClick={openAddMember}
            className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700"
          >
            <PlusIcon className="h-3 w-3" /> Add
          </button>
        )}
      </div>

      <ul className="px-2">
        {conversation.members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-hover">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar name={m.name} profileImage={m.profile_image} size={28} />
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">
                  {m.name}
                  {m.id === currentUserId ? ' (you)' : ''}
                </p>
                {m.role === 'admin' && <p className="text-[10px] font-medium text-accent-600">Admin</p>}
              </div>
            </div>
            {isAdmin && m.id !== currentUserId && (
              <div className="flex flex-shrink-0 gap-2">
                <button
                  onClick={() => handleRoleToggle(m)}
                  disabled={busyUserId === m.id}
                  className="text-[10px] font-medium text-[var(--color-ink-muted)] hover:text-accent-600 disabled:opacity-50"
                  title={m.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
                >
                  {m.role === 'admin' ? 'Demote' : 'Promote'}
                </button>
                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={busyUserId === m.id}
                  className="text-[10px] font-medium text-danger-600 hover:opacity-80 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {showAddMember && (
        <div className="mt-2 border-t border-line px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            Add members
          </p>
          {loadingCandidates ? (
            <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">No other employees to add.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto">
              {candidates.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedNew.has(u.id)}
                    onChange={() => toggleCandidate(u.id)}
                    className="h-3.5 w-3.5 rounded border-line text-accent-600 focus:ring-accent-600"
                  />
                  <span className="text-sm text-[var(--color-ink-soft)]">{u.name}</span>
                </label>
              ))}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowAddMember(false);
                setSelectedNew(new Set());
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddSelected} disabled={selectedNew.size === 0}>
              Add
            </Button>
          </div>
        </div>
      )}

      <div className="mt-auto border-t border-line px-4 py-3">
        <Button variant="destructive" onClick={handleLeave} disabled={busyUserId === currentUserId} className="w-full">
          Leave group
        </Button>
      </div>
    </div>
  );
}
