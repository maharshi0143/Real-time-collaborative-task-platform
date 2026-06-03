import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { Notification } from '../types';

export function useNotifications(limit = 5) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get(`/notifications?limit=${limit}`);
      if (res.data.success) {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch {
      console.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    const socket = getSocket();
    const handleNew = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, limit));
      setUnreadCount((prev) => prev + 1);
    };
    if (socket) {
      socket.on('notification:new', handleNew);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('notification:new', handleNew);
      }
    };
  }, [fetchNotifications, limit]);

  const markAsRead = async (ids: string[]) => {
    await api.patch('/notifications/read', { notificationIds: ids });
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: fetchNotifications };
}
