import { useEffect, useState } from 'react';
import { listAnnouncementsRequest } from '../api/announcements';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import { MegaphoneIcon, CloseIcon } from './Icons';

export function AnnouncementBanner() {
  const socket = useSocket();
  const { notifications, markAsRead } = useNotifications();
  const [announcement, setAnnouncement] = useState(null);
  const [notificationId, setNotificationId] = useState(null);

  useEffect(() => {
    const unreadAnnouncement = notifications
      .filter((n) => n.type === 'announcement' && !n.is_read)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (!unreadAnnouncement || announcement) return;

    listAnnouncementsRequest()
      .then((list) => {
        const match = list.find((a) => a.id === unreadAnnouncement.reference_id);
        if (match) {
          setAnnouncement(match);
          setNotificationId(unreadAnnouncement.id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  useEffect(() => {
    if (!socket) return;

    function onNewAnnouncement(payload) {
      setAnnouncement(payload);
      setNotificationId(null);
    }

    socket.on('new_announcement', onNewAnnouncement);
    return () => socket.off('new_announcement', onNewAnnouncement);
  }, [socket]);

  function handleDismiss() {
    const matching = notificationId || notifications.find((n) => n.type === 'announcement' && n.reference_id === announcement.id && !n.is_read)?.id;
    if (matching) markAsRead(matching);
    setAnnouncement(null);
    setNotificationId(null);
  }

  if (!announcement) return null;

  return (
    <div className="flex items-start gap-3 border-b border-line bg-accent-tint px-6 py-3">
      <MegaphoneIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-700" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-accent-700">{announcement.title}</p>
        <p className="text-sm text-[var(--color-ink-soft)]">{announcement.body}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 rounded-lg p-1 text-accent-700/70 transition hover:bg-accent-100/60 hover:text-accent-700"
        title="Dismiss"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
