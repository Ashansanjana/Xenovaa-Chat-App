import { NavLink, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { AnnouncementBanner } from './AnnouncementBanner';
import { Avatar } from './Avatar';
import { HomeIcon, UsersIcon, InboxIcon, ChatIcon, ShieldIcon, LogoutIcon } from './Icons';
import { StatusSelector } from './StatusSelector';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true, Icon: HomeIcon },
  { to: '/directory', label: 'Directory', Icon: UsersIcon },
  { to: '/requests', label: 'Requests', Icon: InboxIcon },
  { to: '/chats', label: 'Chats', Icon: ChatIcon },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navLinks =
    user?.role === 'admin' ? [...NAV_LINKS, { to: '/admin', label: 'Admin', Icon: ShieldIcon }] : NAV_LINKS;

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <AnnouncementBanner />

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 flex-shrink-0 flex-col bg-anchor-900 text-neutral-0">
          <div className="flex items-center gap-2 px-5 py-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-sm font-bold">
              X
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Xenovaa Chat</span>
          </div>

          <nav className="flex-1 space-y-0.5 px-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'border-accent-600 bg-anchor-700/60 text-white'
                      : 'border-transparent text-neutral-400 hover:bg-anchor-800 hover:text-white'
                  }`
                }
              >
                <link.Icon className="h-[18px] w-[18px] flex-shrink-0" />
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-anchor-700 px-3 py-3">
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg transition hover:bg-anchor-800">
                <Avatar name={user?.name} profileImage={user?.profile_image} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{user?.name}</p>
                  <p className="truncate text-xs capitalize text-neutral-400">{user?.role}</p>
                </div>
              </Link>
              <button
                onClick={logout}
                title="Log out"
                className="flex-shrink-0 rounded-lg p-1.5 text-neutral-400 transition hover:bg-anchor-800 hover:text-white"
              >
                <LogoutIcon className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="px-2 pb-1">
              <StatusSelector />
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex flex-shrink-0 items-center justify-end gap-1 border-b border-line bg-surface px-6 py-3">
            <ThemeToggle />
            <NotificationBell />
          </header>

          <main className="min-h-0 flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
