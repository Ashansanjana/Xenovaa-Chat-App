import { useEffect, useState } from 'react';
import { getAdminStatsRequest } from '../api/admin';
import { Card } from './Card';
import { UsersIcon, ChatIcon, InboxIcon, FlagIcon } from './Icons';

const CARDS = [
  { key: 'totalUsers', label: 'Total employees', Icon: UsersIcon, tint: 'accent' },
  { key: 'activeUsers', label: 'Active employees', Icon: UsersIcon, tint: 'success' },
  { key: 'onlineNow', label: 'Online now', Icon: UsersIcon, tint: 'success' },
  { key: 'totalMessages', label: 'Messages sent', Icon: ChatIcon, tint: 'accent' },
  { key: 'totalConversations', label: 'Conversations', Icon: InboxIcon, tint: 'accent' },
  { key: 'totalGroups', label: 'Group chats', Icon: UsersIcon, tint: 'accent' },
  { key: 'openReports', label: 'Open reports', Icon: FlagIcon, tint: 'danger' },
];

const TINT_CLASSES = {
  accent: 'bg-accent-tint text-accent-700',
  success: 'bg-success-tint text-success-600',
  danger: 'bg-danger-tint text-danger-600',
};

export function AdminOverviewTab() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminStatsRequest()
      .then(setStats)
      .catch(() => setError('Failed to load stats.'));
  }, []);

  if (error) return <p className="text-sm text-danger-600">{error}</p>;
  if (!stats) return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {CARDS.map((c) => (
        <Card key={c.key} className="p-4">
          <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${TINT_CLASSES[c.tint]}`}>
            <c.Icon className="h-4 w-4" />
          </div>
          <p className="text-2xl font-semibold text-ink">{stats[c.key]}</p>
          <p className="text-xs text-[var(--color-ink-muted)]">{c.label}</p>
        </Card>
      ))}
    </div>
  );
}
