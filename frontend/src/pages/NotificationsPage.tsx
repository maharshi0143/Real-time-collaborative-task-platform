import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Notification } from '../types';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications?limit=50')
      .then((r) => r.data)
      .then((data) => {
        if (data.success) setNotifications(data.data.notifications);
      })
      .finally(() => setLoading(false));
  }, []);

  const markAsRead = async (id: string) => {
    await api.patch('/notifications/read', { notificationIds: [id] });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      {notifications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No notifications.</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`bg-white rounded-lg border p-4 ${!n.isRead ? 'border-l-4 border-l-primary bg-primary/5' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                  <p className="text-xs text-muted-foreground/60 mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                </div>
                {!n.isRead && (
                  <button onClick={() => markAsRead(n.id)} className="text-xs text-primary hover:underline">Mark read</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
