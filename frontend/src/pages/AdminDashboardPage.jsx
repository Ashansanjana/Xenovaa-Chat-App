import { useState } from 'react';
import { AdminOverviewTab } from '../components/AdminOverviewTab';
import { AdminUsersTab } from '../components/AdminUsersTab';
import { AdminDepartmentsTab } from '../components/AdminDepartmentsTab';
import { AdminReportsTab } from '../components/AdminReportsTab';
import { AdminAnnouncementsTab } from '../components/AdminAnnouncementsTab';

const TABS = [
  { key: 'overview', label: 'Overview', Component: AdminOverviewTab },
  { key: 'users', label: 'Users', Component: AdminUsersTab },
  { key: 'departments', label: 'Departments', Component: AdminDepartmentsTab },
  { key: 'reports', label: 'Reports', Component: AdminReportsTab },
  { key: 'announcements', label: 'Announcements', Component: AdminAnnouncementsTab },
];

export default function AdminDashboardPage() {
  const [tab, setTab] = useState('overview');
  const ActiveTab = TABS.find((t) => t.key === tab)?.Component || AdminOverviewTab;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-6 text-xl font-semibold text-ink">Admin dashboard</h1>

        <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-field p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-surface text-ink shadow-card'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ActiveTab />
      </div>
    </div>
  );
}
