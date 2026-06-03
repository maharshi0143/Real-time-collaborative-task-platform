import React, { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '../../utils/cn';
import api from '../../services/api';
import { Notification } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../../services/socket';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    const socket = getSocket();
    const handleNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 5));
      setUnreadCount((prev) => prev + 1);
    };
    if (socket) {
      socket.on('notification:new', handleNotification);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('notification:new', handleNotification);
      }
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?limit=5');
      if (res.data.success) {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch {
      console.error('Failed to fetch notifications');
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAsRead = async (ids: string[]) => {
    await api.patch('/notifications/read', { notificationIds: ids });
    fetchNotifications();
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) {
      await markAsRead([n.id]);
    }
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        data-testid="notification-bell"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <Bell size={20} className="text-muted-foreground" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border z-50">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead(notifications.filter((n) => !n.isRead).map((n) => n.id))}
                className="text-xs text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    'w-full text-left p-3 border-b last:border-0 hover:bg-secondary/50 transition-colors',
                    !n.isRead && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn('mt-0.5 w-2 h-2 rounded-full flex-shrink-0', !n.isRead ? 'bg-primary' : 'bg-transparent')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>}
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="p-2 border-t">
            <button
              onClick={() => { navigate('/notifications'); setOpen(false); }}
              className="w-full text-center text-sm text-primary hover:underline py-1"
            >
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
