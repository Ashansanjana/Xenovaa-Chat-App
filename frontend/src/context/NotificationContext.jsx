import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import {
  listNotificationsRequest,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from '../api/notifications';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);

  const refresh = useCallback(() => {
    if (!user) return;
    listNotificationsRequest().then(setNotifications).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user) refresh();
    else setNotifications([]);
  }, [user, refresh]);

  useEffect(() => {
    if (!socket) return;

    const onNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    socket.on('new_notification', onNewNotification);
    return () => socket.off('new_notification', onNewNotification);
  }, [socket]);

  async function markAsRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await markNotificationReadApi(id);
    } catch {
      refresh();
    }
  }

  async function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await markAllNotificationsReadApi();
    } catch {
      refresh();
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider.');
  return ctx;
}
