import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { BellIcon } from './Icons';

const LABELS = {
  chat_request: 'sent you a chat request',
  request_accepted: 'accepted your chat request',
  chat_started: 'started a conversation with you',
  new_message: 'sent you a new message',
  announcement: 'posted a company announcement',
  mention: 'mentioned you',
};

function pathForNotification(n) {
  if (n.type === 'chat_request') return '/requests';
  if (n.type === 'request_accepted' || n.type === 'new_message' || n.type === 'chat_started') {
    return n.reference_id ? `/chats/${n.reference_id}` : null;
  }
  return null;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-[var(--color-ink-soft)] transition hover:bg-field focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/30"
        aria-label="Notifications"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-xl border border-line bg-surface shadow-panel">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs font-medium text-accent-600 hover:text-accent-700">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--color-ink-muted)]">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    const path = pathForNotification(n);
                    if (path) {
                      setOpen(false);
                      navigate(path);
                    }
                  }}
                  className={`block w-full border-b border-line px-4 py-3 text-left text-sm transition hover:bg-field ${
                    n.is_read ? 'text-[var(--color-ink-soft)]' : 'font-medium text-ink'
                  }`}
                >
                  {LABELS[n.type] || n.type}
                  <span className="mt-0.5 block text-xs font-normal text-[var(--color-ink-muted)]">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </button>
              ))
            )}
          </div>

          <Link
            to="/requests"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2 text-center text-xs font-medium text-accent-600 hover:text-accent-700"
          >
            View chat requests
          </Link>
        </div>
      )}
    </div>
  );
}
