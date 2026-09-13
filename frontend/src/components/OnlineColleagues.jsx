import { Avatar } from './Avatar';
import { StatusDot } from './StatusDot';
import { ChatIcon } from './Icons';

export function OnlineColleagues({ users, busyUserId, onSelect }) {
  if (users.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">
        No colleagues are online right now.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {users.map((u) => (
        <button
          key={u.id}
          onClick={() => onSelect(u)}
          disabled={busyUserId === u.id}
          className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5 text-left transition hover:border-accent-600/40 hover:bg-surface-hover disabled:opacity-50"
        >
          <div className="relative flex-shrink-0">
            <Avatar name={u.name} profileImage={u.profile_image} size={36} />
            <span className="absolute -bottom-0.5 -right-0.5">
              <StatusDot status={u.status} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{u.name}</p>
            <p className="truncate text-xs text-[var(--color-ink-muted)]">
              {u.department_name || (u.status === 'break' ? 'On break' : 'Online')}
            </p>
          </div>
          <ChatIcon className="h-4 w-4 flex-shrink-0 text-[var(--color-ink-muted)]" />
        </button>
      ))}
    </div>
  );
}
