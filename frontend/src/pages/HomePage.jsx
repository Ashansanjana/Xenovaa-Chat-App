import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { UsersIcon, InboxIcon, ChatIcon } from '../components/Icons';

const SHORTCUTS = [
  {
    to: '/directory',
    Icon: UsersIcon,
    title: 'Employee directory',
    description: 'Search colleagues and send a chat request.',
  },
  {
    to: '/requests',
    Icon: InboxIcon,
    title: 'Chat requests',
    description: 'Accept, reject, or track your outgoing requests.',
  },
  {
    to: '/chats',
    Icon: ChatIcon,
    title: 'Chats',
    description: 'Jump back into your conversations and groups.',
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-xl font-semibold text-ink">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Here's where you left off — pick up a conversation or find a colleague to connect with.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {SHORTCUTS.map((s) => (
            <Link key={s.to} to={s.to}>
              <Card className="h-full p-5 transition hover:border-accent-600/40 hover:shadow-panel">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-tint text-accent-700">
                  <s.Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-ink">{s.title}</p>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{s.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
